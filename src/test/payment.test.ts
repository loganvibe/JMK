/** @vitest-environment node */
// Payment flow verification tests for the weekly contribution model.
// Mocks the Supabase REST API (incl. /auth/user) and external provider verify endpoints.
import http from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const SUPABASE_PORT = 54345;
const SUPABASE_BASE = `http://127.0.0.1:${SUPABASE_PORT}`;

type AnyRow = Record<string, any>;
const store: Record<string, AnyRow[]> = {};

function filters(row: AnyRow, params: Record<string, string>) {
  for (const [k, raw] of Object.entries(params)) {
    if (["select", "order", "limit"].includes(k)) continue;
    if (raw.startsWith("eq.")) {
      const want = decodeURIComponent(raw.slice(3));
      if (String(row[k] ?? "") !== want) return false;
    }
  }
  return true;
}

const supabaseServer = http.createServer((req, res) => {
  let body = ""; req.on("data", (c) => (body += c));
  req.on("end", () => {
    const u = new URL(req.url || "", SUPABASE_BASE);
    const send = (status: number, payload: unknown) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(payload)); };

    // Supabase auth.getUser endpoint used by requireUser()
    if (u.pathname.includes("/auth/") && u.pathname.endsWith("/user") && req.method === "GET") {
      const auth = req.headers.get("authorization") || "";
      if (!auth.startsWith("Bearer ")) return send(401, { error: "Invalid session" });
      return send(200, { data: { user: { id: "u1", email: "test@example.com", aud: "authenticated" } } });
    }

    const table = u.pathname.split("/").filter(Boolean).pop() as string;
    const params: Record<string, string> = {}; for (const [k, v] of u.searchParams.entries()) params[k] = v;
    const accept = String(req.headers.accept || "");
    const wantsObject = accept.includes("application/vnd.pgrst.object+json");
    const asResult = (rows: AnyRow[], status = 200) => send(status, wantsObject ? (rows[0] ?? null) : rows);
    const rows = (store[table] || []).filter((r) => filters(r, params));
    try {
      if (req.method === "GET") return asResult(rows, 200);
      if (req.method === "POST") {
        const obj = JSON.parse(body || "{}");
        const onConflict = u.searchParams.get("on_conflict");
        if (onConflict) {
          const idx = (store[table] || []).findIndex((r) => String(r[onConflict]) === String(obj[onConflict]));
          if (idx >= 0) { store[table][idx] = { ...store[table][idx], ...obj }; return asResult([store[table][idx]], 201); }
        }
        const created = { id: obj.id ?? `id-${Math.random().toString(36).slice(2, 8)}`, ...obj };
        store[table] = store[table] || []; store[table].push(created); return asResult([created], 201);
      }
      if (req.method === "PATCH") {
        const patch = JSON.parse(body || "{}");
        const matched = (store[table] || []).filter((r) => filters(r, params));
        for (const r of matched) Object.assign(r, patch);
        return asResult(matched, 200);
      }
      send(404, []);
    } catch (e) { send(500, { error: String(e) }); }
  });
});

const providerVerifyCalls: Array<{ provider: string; reference: string }> = [];
const providerVerifyResult: Record<string, any> = {};

function restFilters(row: AnyRow, params: Record<string, string>) {
  for (const [k, raw] of Object.entries(params)) {
    if (["select", "order", "limit", "on_conflict", "maybeSingle"].includes(k)) continue;
    if (raw.startsWith("eq.")) {
      const want = decodeURIComponent(raw.slice(3));
      if (String(row[k] ?? "") !== want) return false;
    } else if (raw.startsWith("neq.")) {
      const want = decodeURIComponent(raw.slice(4));
      if (String(row[k] ?? "") === want) return false;
    }
  }
  return true;
}

function handleSupabaseRest(method: string, url: string, body: any): { status: number; body: any } {
  const u = new URL(url);
  const pathParts = u.pathname.split("/").filter(Boolean);
  // path: /rest/v1/{table}
  const tableIdx = pathParts.indexOf("rest");
  if (tableIdx < 0 || tableIdx + 2 >= pathParts.length) return { status: 404, body: { error: "not found" } };
  const table = pathParts[tableIdx + 2];
  const params: Record<string, string> = {};
  for (const [k, v] of u.searchParams.entries()) params[k] = v;
  const rows = (store[table] || []).filter((r) => restFilters(r, params));
  const wantsObject = params.maybeSingle === "true" || u.searchParams.has("maybeSingle");

  if (method === "GET") {
    const result = wantsObject ? (rows[0] ?? null) : rows;
    return { status: 200, body: result };
  }
  if (method === "POST") {
    const onConflict = params.on_conflict;
    if (onConflict && body) {
      const idx = (store[table] || []).findIndex((r) => String(r[onConflict]) === String(body[onConflict]));
      if (idx >= 0) { store[table][idx] = { ...store[table][idx], ...body }; return { status: 201, body: [store[table][idx]] }; }
    }
    const created = { id: body?.id ?? `id-${Math.random().toString(36).slice(2, 8)}`, ...body };
    store[table] = store[table] || []; store[table].push(created);
    return { status: 201, body: [created] };
  }
  if (method === "PATCH") {
    const matched = (store[table] || []).filter((r) => restFilters(r, params));
    for (const r of matched) if (body) Object.assign(r, body);
    const result = wantsObject ? (matched[0] ?? null) : matched;
    return { status: 200, body: result };
  }
  return { status: 405, body: { error: "method not allowed" } };
}

(globalThis as any).fetch = async (input: any, init?: any) => {
  const url = input instanceof Request ? input.url : String(input);
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();

  const isSupabase = url.includes("127.0.0.1:54345");
  const isPaystackVerify = url.includes("api.paystack.co/transaction/verify/");
  const isFlutterwaveVerify = url.includes("api.flutterwave.com/v3/transactions/verify_by_reference");
  const isStripeVerify = url.includes("api.stripe.com/v1/checkout_sessions/") || url.includes("api.stripe.com/v1/checkout/sessions/");
  const isPaystackInit = url === "https://api.paystack.co/transaction/initialize";
  const isFlutterwaveInit = url === "https://api.flutterwave.com/v3/payments";

  if (isSupabase) {
    // Supabase auth.getUser endpoint
    if (url.includes("/auth/v1/user") && method === "GET") {
      return new Response(JSON.stringify({ user: { id: "u1", email: "test@example.com", aud: "authenticated" } }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    let body: any = null;
    if (input instanceof Request) {
      try { body = await input.json(); } catch { body = null; }
    } else if (init?.body) {
      try { body = typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
    }
    const result = handleSupabaseRest(method, url, body);
    const isObject = result.body !== null && !Array.isArray(result.body) && typeof result.body === "object";
    return new Response(JSON.stringify(result.body), { status: result.status, headers: { "Content-Type": "application/json", "Content-Range": isObject ? "0/*" : `0-${Array.isArray(result.body) ? result.body.length - 1 : 0}/*` } });
  }

  if (isPaystackVerify || isFlutterwaveVerify || isStripeVerify) {
    const ref = url.split("/").pop() ?? url.split("tx_ref=").pop() ?? "";
    providerVerifyCalls.push({ provider: isPaystackVerify ? "paystack" : isFlutterwaveVerify ? "flutterwave" : "stripe", reference: ref });
    const inner = providerVerifyResult[ref] ?? { status: "failed", amount: 0 };
    let outer: any;
    if (isPaystackVerify) {
      outer = { status: true, data: inner, message: "Verified" };
    } else if (isFlutterwaveVerify) {
      outer = { status: "success", data: inner, message: "Verified" };
    } else {
      outer = { ...inner, payment_status: inner.status === "success" ? "paid" : "failed", amount_total: inner.amount };
    }
    return new Response(JSON.stringify(outer), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  if (isPaystackInit) {
    return new Response(JSON.stringify({ status: true, data: { authorization_url: "https://paystack.co/checkout/x", reference: "init-ref" } }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  if (isFlutterwaveInit) {
    return new Response(JSON.stringify({ status: "success", data: { link: "https://flutterwave.com/checkout/x" } }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
};

function resetStore() {
  for (const k of Object.keys(store)) delete store[k];
  providerVerifyCalls.length = 0;
  Object.keys(providerVerifyResult).forEach(k => delete providerVerifyResult[k]);

  const now = new Date();
  store["subscription_plans"] = [{
    id: "plan-weekly", slug: "weekly_support", name: "Support JMK", price: 1500, currency: "NGN",
    active: true, ai_limits: { credits: 50, duration_days: 7, all_ai_features: true },
    created_at: now.toISOString(), updated_at: now.toISOString(), description: null, features: [], sort_order: 0,
  }];
  store["app_settings"] = [{ id: "global", pricing_mode: "paid", payments_enabled: true }];
  store["payment_providers"] = [{ slug: "paystack", secret_key: "sk_test_xyz", active: true, sort_order: 0 }];
  store["user_subscriptions"] = [];
  store["ai_credit_balances"] = [];
  store["payment_transactions"] = [];
  store["notifications"] = [];
  store["subscriptions"] = [];
}

beforeAll(async () => { await new Promise((r) => supabaseServer.listen(SUPABASE_PORT, "127.0.0.1", r)); });
afterAll(async () => { await new Promise((r) => supabaseServer.close(r)); });
beforeEach(() => { resetStore(); });

let capturedHandler: ((req: Request) => Promise<Response>) | null = null;
(globalThis as any).Deno = {
  env: { get: (k: string) => ({ SUPABASE_URL: SUPABASE_BASE, SUPABASE_SERVICE_ROLE_KEY: "service_role_test", SUPABASE_ANON_KEY: "anon" }[k] ?? null) },
  serve: (handler: any) => { capturedHandler = handler; },
};

await import("../../supabase/functions/payments/index.ts");

async function invoke(action: string, body: any, headers: Record<string, string> = {}) {
  if (!capturedHandler) throw new Error("payments handler not captured");
  const req = new Request(`http://localhost/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ action, ...body }),
  });
  return capturedHandler(req);
}

describe("weekly contribution payment flow", () => {
  it("rejects activate_plan (never self-activates)", async () => {
    const res = await invoke("activate_plan", {}, { Authorization: "Bearer fake-token" });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("PAYMENT_REQUIRED");
  });

  it("initializes a Paystack checkout and stores a pending transaction", async () => {
    const res = await invoke("initialize", { planSlug: "weekly_support", callbackUrl: "https://jmk.life/billing" }, { Authorization: "Bearer fake-token" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.authorization_url).toBe("https://paystack.co/checkout/x");
    expect(json.provider).toBe("paystack");
    expect(json.reference).toMatch(/^jmk_weekly_/);
    const txn = store["payment_transactions"][0];
    expect(txn.status).toBe("pending");
    expect(txn.amount).toBe(1500);
    expect(txn.currency).toBe("NGN");
  });

  it("rejects non-weekly plan slug on initialize", async () => {
    const res = await invoke("initialize", { planSlug: "student" }, { Authorization: "Bearer fake-token" });
    expect(res.status).toBe(400);
  });

  it("verifies a successful Paystack payment and grants weekly access", async () => {
    await invoke("initialize", { planSlug: "weekly_support" }, { Authorization: "Bearer fake-token" });
    const txn = store["payment_transactions"][0];
    const reference = txn.reference;

    providerVerifyResult[reference] = { status: "success", amount: 150000, currency: "NGN" };

    const res = await invoke("verify", { reference }, { Authorization: "Bearer fake-token" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("success");
    expect(json.credits_granted).toBe(50);
    expect(json.access_expires_at).toBeDefined();

    const bal = store["ai_credit_balances"].find((b: any) => b.user_id);
    expect(bal?.daily_credits).toBe(50);
    expect(bal?.credits_total).toBe(50);

    const updatedTxn = store["payment_transactions"].find((t: any) => t.reference === reference)!;
    expect(updatedTxn.status).toBe("success");
    expect(providerVerifyCalls.find((c: any) => c.provider === "paystack")).toBeDefined();
  });

  it("failed payment verification does not grant access", async () => {
    await invoke("initialize", { planSlug: "weekly_support" }, { Authorization: "Bearer fake-token" });
    const txn = store["payment_transactions"][0];
    providerVerifyResult[txn.reference] = { status: "failed", amount: 0 };

    const res = await invoke("verify", { reference: txn.reference }, { Authorization: "Bearer fake-token" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("failed");
    expect(store["ai_credit_balances"].length).toBe(0);
  });

  it("already-successful transaction returns alreadyProcessed without re-granting", async () => {
    await invoke("initialize", { planSlug: "weekly_support" }, { Authorization: "Bearer fake-token" });
    const txn = store["payment_transactions"][0];
    const reference = txn.reference;

    providerVerifyResult[reference] = { status: "success", amount: 150000, currency: "NGN" };
    await invoke("verify", { reference }, { Authorization: "Bearer fake-token" });

    providerVerifyCalls.length = 0;

    const res = await invoke("verify", { reference }, { Authorization: "Bearer fake-token" });
    const json = await res.json();
    expect(json.alreadyProcessed).toBe(true);
    expect(providerVerifyCalls.length).toBe(0);
  });

  it("unknown payment reference returns 404", async () => {
    const res = await invoke("verify", { reference: "does-not-exist" }, { Authorization: "Bearer fake-token" });
    expect(res.status).toBe(404);
  });

  it("requires authenticated user for initialize (no token -> 401)", async () => {
    const res = await invoke("initialize", { planSlug: "weekly_support" });
    expect(res.status).toBe(401);
  });
});

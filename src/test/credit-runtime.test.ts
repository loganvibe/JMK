/** @vitest-environment node */
// Real runtime coverage of the shared credit code path.
//
// This exercises the ACTUAL edge-function shared modules
// (supabase/functions/_shared/entitlements.ts + credit-rules.ts) with the
// REAL @supabase/supabase-js client talking to a small PostgREST-protocol
// mock over HTTP. That is the exact query-builder code path that produced
// "gte is not a function" / "returning is not a function" in production, so a
// crash or a logic error here reproduces the real failure mode.
import http from "node:http";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resolvePlanActivation, type PlanRow } from "../../supabase/functions/_shared/plan-activation";
import {
  checkCreditLimit,
  deductCredits,
  getCreditBalance,
  getPlan,
} from "../../supabase/functions/_shared/entitlements";

const PORT = 54343;
const BASE = `http://127.0.0.1:${PORT}`;

const FREE = { id: "p-free", slug: "free", name: "Free Trial", ai_limits: { credits: 10, chapters: ["chapter1"], max_projects: 1 } };
const STUDENT = { id: "p-student", slug: "student", name: "Student", ai_limits: { credits: 100, max_projects: 3 } };
const PREMIUM = { id: "p-premium", slug: "premium_plus", name: "Premium+", ai_limits: { credits: 200, max_projects: 999 } };

type AnyRow = Record<string, unknown>;
const store: Record<string, AnyRow[]> = {};

function matchFilters(row: AnyRow, params: Record<string, string>) {
  for (const [k, raw] of Object.entries(params)) {
    if (k === "select" || k === "order" || k === "limit" || k === "preview" || k === "count") continue;
    const eq = raw.startsWith("eq.");
    if (!eq) continue;
    const want = decodeURIComponent(raw.slice(3));
    if (String(row[k] ?? "") !== want) return false;
  }
  return true;
}

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const u = new URL(req.url || "", BASE);
    const parts = u.pathname.split("/").filter(Boolean);
    const table = parts[parts.length - 1];
    const params: Record<string, string> = {};
    for (const [k, v] of u.searchParams.entries()) params[k] = v;

    const send = (status: number, payload: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify(payload));
    };
    let rows: AnyRow[];
    if (store[table]) {
      rows = store[table].filter((r) => matchFilters(r, params));
    } else if (table === "subscription_plans") {
      rows = [FREE, STUDENT, PREMIUM].filter((r) => matchFilters(r, params));
    } else {
      rows = [];
    }

    try {
      if (req.method === "GET") return send(200, rows);
      if (req.method === "POST") {
        const obj = JSON.parse(body || "{}");
        const created = { id: obj.id ?? `id-${Math.random().toString(36).slice(2, 8)}`, ...obj };
        store[table] = store[table] || [];
        store[table].push(created);
        return send(201, [created]);
      }
      if (req.method === "PATCH") {
        const patch = JSON.parse(body || "{}");
        const rows = store[table].filter((r) => matchFilters(r, params));
        console.error("[MOCK PATCH]", table, u.search, "matched", rows.length, "patch", JSON.stringify(patch), "resp", JSON.stringify(rows));
        if (rows.length === 0) return send(200, []);
        for (const r of rows) Object.assign(r, patch);
        return send(200, rows);
      }
      send(404, []);
    } catch (e) {
      send(500, { error: String(e) });
    }
  });
});

(globalThis as { Deno?: { env: { get: (k: string) => string | null } } }).Deno = {
  env: {
    get: (k: string) => ({ SUPABASE_URL: BASE, SUPABASE_SERVICE_ROLE_KEY: "service_role_test", SUPABASE_ANON_KEY: "anon" }[k] ?? null),
  },
};

function makeClient() {
  return createClient(BASE, "service_role_test", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: "Bearer service_role_test" } },
    fetch: globalThis.fetch,
  });
}

function resetStore(plan: AnyRow) {
  const now = new Date();
  const future = new Date(now.getTime() + 86400000 * 30).toISOString();
  const tier = plan.slug === "student" ? "beta" : plan.slug === "premium_plus" ? "premium" : "free";
  store["user_subscriptions"] = [{
    id: "sub-1", user_id: "u1", plan_id: plan.id, status: "active",
    start_date: now.toISOString(), expiry_date: future, payment_reference: "test",
    created_at: now.toISOString(), updated_at: now.toISOString(),
    subscription_plans: plan,
  }];
  store["subscriptions"] = [{ user_id: "u1", tier, status: "active", provider: "mock", expires_at: future }];
  store["ai_credit_balances"] = [{
    user_id: "u1", daily_credits: plan.ai_limits.credits,
    monthly_credits: plan.ai_limits.credits * 30,
    daily_reset_at: future, monthly_reset_at: future,
    created_at: now.toISOString(), updated_at: now.toISOString(),
  }];
  store["ai_feature_settings"] = [{ feature_key: "topic_generation", enabled: true, credits: 1, provider_id: null, model_id: null, max_input_tokens: 8000, max_output_tokens: 4096, daily_limit: null, monthly_limit: null }];
}

beforeAll(async () => {
  server.keepAlive = true;
  await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
});
afterAll(async () => { await new Promise((r) => server.close(r)); });
beforeEach(() => { Object.keys(store).forEach((k) => delete store[k]); });

describe("FREE plan topic generation: 0/10 -> 1/10 -> ... -> 10/10, 11th blocked", { testTimeout: 30000 }, () => {
  beforeEach(() => resetStore(FREE));

  it("allows the first request with 10 remaining, 1 requested", async () => {
    const plan = await getPlan("u1");
    expect(plan.slug).toBe("free");
    const balance = await getCreditBalance("u1");
    expect(balance.daily_credits).toBe(10);

    const check = await checkCreditLimit("u1", "topic_generation");
    expect(check.allowed).toBe(true);
    expect(check.dailyRemaining).toBe(10);
    expect(check.requestedCredits).toBe(1);

    const updated = await deductCredits("u1", 1, "topic_generation", null, { provider: "openrouter", model: "x" });
    expect(updated.daily_credits).toBe(9);
  });

  it("drives 10->9->...->0 across 10 real deductions and rejects the 11th", async () => {
    const seen: number[] = [];
    for (let i = 0; i < 10; i++) {
      const before = await getCreditBalance("u1");
      seen.push(Number(before.daily_credits));
      const check = await checkCreditLimit("u1", "topic_generation");
      expect(check.allowed).toBe(true);
      await deductCredits("u1", 1, "topic_generation", null, { provider: "openrouter", model: "x" });
    }
    seen.push(Number((await getCreditBalance("u1")).daily_credits));
    expect(seen).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);

    let err: unknown;
    try {
      await deductCredits("u1", 1, "topic_generation", null, { provider: "openrouter", model: "x" });
    } catch (e) { err = e; }
    expect(err).toBeInstanceOf(Error);
    expect(String((err as Error).message)).toMatch(/Daily AI credit limit reached/);
  });
});

describe("Free Mode resolves the SELECTED plan, not Free", { testTimeout: 30000 }, () => {
  it("Student -> 100/day", async () => {
    resetStore(STUDENT);
    const plan = await getPlan("u1");
    expect(plan.slug).toBe("student");
    expect(plan.ai_limits?.credits).toBe(100);
    const bal = await getCreditBalance("u1");
    expect(bal.daily_credits).toBe(100);
    const after = await deductCredits("u1", 1, "topic_generation", null, { provider: "openrouter", model: "x" });
    expect(after.daily_credits).toBe(99);
  });

  it("Premium+ -> 200/day", async () => {
    resetStore(PREMIUM);
    const plan = await getPlan("u1");
    expect(plan.slug).toBe("premium_plus");
    expect(plan.ai_limits?.credits).toBe(200);
    const bal = await getCreditBalance("u1");
    expect(bal.daily_credits).toBe(200);
    const after = await deductCredits("u1", 1, "topic_generation", null, { provider: "openrouter", model: "x" });
    expect(after.daily_credits).toBe(199);
  });
});

describe("dashboard formula matches the server", { testTimeout: 30000 }, () => {
  beforeEach(() => resetStore(PREMIUM));
  it("derives the same used/remaining the dashboard renders", async () => {
    const limit = Number((await getPlan("u1")).ai_limits?.credits);
    let balance = await getCreditBalance("u1");
    let used = limit - Number(balance.daily_credits);
    expect({ used, remaining: Number(balance.daily_credits) }).toEqual({ used: 0, remaining: 200 });

    await deductCredits("u1", 1, "topic_generation", null, { provider: "openrouter", model: "x" });
    balance = await getCreditBalance("u1");
    used = limit - Number(balance.daily_credits);
    expect({ used, remaining: Number(balance.daily_credits) }).toEqual({ used: 1, remaining: 199 });
  });
});

describe("regression: the old invalid update-chain crashes (root cause)", () => {
  beforeEach(() => resetStore(FREE));
  it("the update().eq().gte().returning('*') chain has no .returning() on the supabase-js v2 builder", () => {
    const db = makeClient();
    const now = new Date().toISOString();
    let err: unknown;
    try {
      db.from("ai_credit_balances")
        .update({ daily_credits: `daily_credits - 1`, monthly_credits: `monthly_credits - 1`, updated_at: now })
        .eq("user_id", "u1")
        .gte("daily_credits", 1)
        .gte("monthly_credits", 1)
        .gte("daily_reset_at", now)
        .gte("monthly_reset_at", now)
        .returning("*");
    } catch (e) { err = e; }
    expect(err).toBeInstanceOf(TypeError);
    expect(String((err as Error)?.message || err)).toMatch(/is not a function/);
  });
});

describe("Free-mode plan-activation policy (Issue 2)", () => {
  it("Free Mode ON activates Premium+ without payment (200/day)", () => {
    const r = resolvePlanActivation({ pricingMode: "free", planSlug: "premium_plus", plan: PREMIUM as PlanRow });
    expect(r).toEqual({ action: "activate", plan: PREMIUM, dailyCredits: 200, reason: "free_mode" });
  });
  it("Free Mode ON activates Student without payment (100/day)", () => {
    const r = resolvePlanActivation({ pricingMode: "free", planSlug: "student", plan: STUDENT as PlanRow });
    expect(r).toEqual({ action: "activate", plan: STUDENT, dailyCredits: 100, reason: "free_mode" });
  });
  it("Free Mode ON + Free still resolves to 10/day", () => {
    const r = resolvePlanActivation({ pricingMode: "free", planSlug: "free", plan: FREE as PlanRow });
    expect(r).toEqual({ action: "activate", plan: FREE, dailyCredits: 10, reason: "free_mode" });
  });
  it("Free Mode OFF requires payment for Premium+", () => {
    const r = resolvePlanActivation({ pricingMode: "paid", planSlug: "premium_plus", plan: PREMIUM as PlanRow });
    expect(r).toEqual({ action: "payment_required", plan: PREMIUM, dailyCredits: 200, reason: "paid_mode" });
  });
  it("Free Mode never changes the plan's entitlements", () => {
    const r = resolvePlanActivation({ pricingMode: "free", planSlug: "premium_plus", plan: PREMIUM as PlanRow });
    expect(r.dailyCredits).toBe(200);
  });
});

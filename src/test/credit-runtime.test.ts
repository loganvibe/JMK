/** @vitest-environment node */
// Runtime coverage of weekly contribution credit enforcement via shared edge modules.
import http from "node:http";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { checkCreditLimit, deductCredits, getCreditBalance, grantWeeklyAccess } from "../../supabase/functions/_shared/entitlements";

const PORT = 54344;
const BASE = `http://127.0.0.1:${PORT}`;
const WEEKLY_PLAN = { id: "plan-weekly", slug: "weekly_support", name: "Support JMK", price: 1500, active: true, ai_limits: { credits: 50, duration_days: 7, all_ai_features: true } };

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

const server = http.createServer((req, res) => {
  let body = ""; req.on("data", (c) => (body += c));
  req.on("end", () => {
    const u = new URL(req.url || "", BASE);
    const table = u.pathname.split("/").filter(Boolean).pop() as string;
    const params: Record<string, string> = {}; for (const [k, v] of u.searchParams.entries()) params[k] = v;
    const accept = String(req.headers.accept || "");
    const wantsObject = accept.includes("application/vnd.pgrst.object+json");
    const send = (status: number, payload: unknown) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(payload)); };
    const asResult = (rows: AnyRow[], status = 200) => send(status, wantsObject ? (rows[0] ?? null) : rows);
    const rows = (store[table] || []).filter((r) => filters(r, params));
    try {
      if (req.method === "GET") return asResult(rows, 200);
      if (req.method === "POST") {
        const obj = JSON.parse(body || "{}");
        const onConflict = u.searchParams.get("on_conflict");
        if (onConflict) {
          const key = onConflict;
          const idx = (store[table] || []).findIndex((r) => String(r[key]) === String(obj[key]));
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

(globalThis as any).Deno = { env: { get: (k: string) => ({ SUPABASE_URL: BASE, SUPABASE_SERVICE_ROLE_KEY: "service_role_test", SUPABASE_ANON_KEY: "anon" }[k] ?? null) } };

function reset(active = true, credits = 50, expiresOffsetMs = 7 * 24 * 60 * 60 * 1000) {
  const now = new Date();
  const expiry = new Date(now.getTime() + expiresOffsetMs).toISOString();
  store["subscription_plans"] = [{ ...WEEKLY_PLAN }];
  store["app_settings"] = [{ id: "global", pricing_mode: "paid", payments_enabled: true }];
  store["user_subscriptions"] = active ? [{ id: "sub1", user_id: "u1", plan_id: WEEKLY_PLAN.id, status: "active", start_date: now.toISOString(), expiry_date: expiry, payment_reference: "ref1", created_at: now.toISOString(), updated_at: now.toISOString(), subscription_plans: WEEKLY_PLAN }] : [];
  store["ai_credit_balances"] = active ? [{ user_id: "u1", daily_credits: credits, monthly_credits: credits, daily_reset_at: expiry, monthly_reset_at: expiry, access_expires_at: expiry, credits_total: 50, updated_at: now.toISOString() }] : [{ user_id: "u1", daily_credits: 0, monthly_credits: 0, daily_reset_at: new Date(now.getTime()-1000).toISOString(), monthly_reset_at: new Date(now.getTime()-1000).toISOString(), access_expires_at: new Date(now.getTime()-1000).toISOString(), credits_total: 50, updated_at: now.toISOString() }];
  store["ai_feature_settings"] = [{ feature_key: "topic_generation", enabled: true, credits: 1, provider_id: null, model_id: null, max_input_tokens: 8000, max_output_tokens: 4096 }];
  store["ai_credit_usage"] = [];
  store["notifications"] = [];
  store["subscriptions"] = active ? [{ user_id: "u1", tier: "weekly_support", status: "active", expires_at: expiry }] : [];
}

beforeAll(async () => { await new Promise((r) => server.listen(PORT, "127.0.0.1", r)); });
afterAll(async () => { await new Promise((r) => server.close(r)); });
beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

describe("weekly contribution credit enforcement", () => {
  it("allows active user with credits and deducts correctly", async () => {
    reset(true, 50);
    const bal = await getCreditBalance("u1");
    expect(bal.daily_credits).toBe(50);
    const check = await checkCreditLimit("u1", "topic_generation");
    expect(check.allowed).toBe(true);
    expect(check.creditsRemaining).toBe(50);
    const after = await deductCredits("u1", 1, "topic_generation", null, { provider: "openrouter", model: "x" });
    expect(Number((after as any).daily_credits)).toBe(49);
  });

  it("spends down to 0 and blocks further use (no negative)", async () => {
    reset(true, 2);
    await deductCredits("u1", 1, "topic_generation");
    await deductCredits("u1", 1, "topic_generation");
    await expect(deductCredits("u1", 1, "topic_generation")).rejects.toThrow(/credits/i);
    const bal = await getCreditBalance("u1");
    expect(Number(bal.daily_credits)).toBe(0);
  });

  it("rejects expired access even if credits would remain", async () => {
    reset(true, 25, -1000);
    const check = await checkCreditLimit("u1", "topic_generation");
    expect(check.allowed).toBe(false);
    expect(String(check.reason)).toMatch(/expired/i);
    await expect(deductCredits("u1", 1, "topic_generation")).rejects.toThrow(/expired/i);
  });

  it("rejects unauthenticated/unknown balance as no active contribution", async () => {
    reset(true, 50);
    store["ai_credit_balances"] = [];
    store["user_subscriptions"] = [];
    // getCreditBalance creates a zero/expired placeholder; deduction must reject
    const bal = await getCreditBalance("u-new");
    expect(Number(bal.daily_credits)).toBe(0);
    await expect(deductCredits("u-new", 1, "topic_generation")).rejects.toThrow();
  });

  it("grantWeeklyAccess gives fresh 50 credits and 7-day expiry", async () => {
    reset(true, 0, -1000);
    const start = new Date("2026-11-16T09:00:00.000Z");
    const granted = await grantWeeklyAccess("u1", WEEKLY_PLAN, "ref-new", start);
    expect(granted.creditsGranted).toBe(50);
    expect(granted.expiresAt).toBe("2026-11-23T09:00:00.000Z");
    const bal = store["ai_credit_balances"].find((r) => r.user_id === "u1");
    expect(bal?.daily_credits).toBe(50);
  });

  it("renewal grants fresh allocation (replaces exhausted period)", async () => {
    reset(true, 3);
    const start = new Date("2026-11-20T10:00:00.000Z");
    const granted = await grantWeeklyAccess("u1", WEEKLY_PLAN, "ref-renew", start);
    expect(granted.creditsGranted).toBe(50);
    const bal = store["ai_credit_balances"].find((r) => r.user_id === "u1");
    expect(bal?.daily_credits).toBe(50);
    expect(bal?.access_expires_at).toBe("2026-11-27T10:00:00.000Z");
  });

  it("expired credits become unusable (normalization zeroes, no refill)", async () => {
    reset(true, 20, -5000);
    const bal = await getCreditBalance("u1");
    expect(Number(bal.daily_credits)).toBe(0);
  });

  it("grantWeeklyAccess is idempotent (duplicate grant does not double credits)", async () => {
    reset(true, 0, -1000);
    const start = new Date("2026-11-16T09:00:00.000Z");
    const first = await grantWeeklyAccess("u1", WEEKLY_PLAN, "ref-idem", start);
    expect(first.creditsGranted).toBe(50);
    const second = await grantWeeklyAccess("u1", WEEKLY_PLAN, "ref-idem", start);
    expect(second.creditsGranted).toBe(50);
    const bal = store["ai_credit_balances"].find((r) => r.user_id === "u1");
    expect(bal?.daily_credits).toBe(50);
  });

  it("cross-user isolation: user B cannot spend user A's credits", async () => {
    reset(true, 10);
    store["ai_credit_balances"].push({
      user_id: "u2", daily_credits: 0, monthly_credits: 0,
      daily_reset_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      monthly_reset_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      access_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      credits_total: 0, updated_at: new Date().toISOString(),
    });
    await deductCredits("u1", 1, "topic_generation");
    const balA = store["ai_credit_balances"].find((r) => r.user_id === "u1");
    const balB = store["ai_credit_balances"].find((r) => r.user_id === "u2");
    expect(Number(balA?.daily_credits)).toBe(9);
    expect(Number(balB?.daily_credits)).toBe(0);
    await expect(deductCredits("u2", 1, "topic_generation")).rejects.toThrow(/credits/i);
  });

  it("daily reset trigger never refills spent credits (zeroes expired only)", async () => {
    reset(true, 0, -1000);
    const start = new Date("2026-11-16T09:00:00.000Z");
    await grantWeeklyAccess("u1", WEEKLY_PLAN, "ref-norefill", start);
    await deductCredits("u1", 50, "topic_generation");
    const bal = await getCreditBalance("u1");
    expect(Number(bal.daily_credits)).toBe(0);
    const expired = await getCreditBalance("u1");
    expect(Number(expired.daily_credits)).toBe(0);
    await expect(deductCredits("u1", 1, "topic_generation")).rejects.toThrow(/credits/i);
  });
});

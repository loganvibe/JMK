// Centralised, server-side feature access + AI credit enforcement.
import { createClient } from "npm:@supabase/supabase-js@2";

export const PLAN_RANK: Record<string, number> = {
  free: 0,
  custom: 0,
  student: 1,
  premium_plus: 2,
};

export type FeatureKey =
  | "topic_generation"
  | "chapter_generation"
  | "refinement"
  | "quality_check"
  | "academic_assist"
  | "citation"
  | "defense_simulation"
  | "defense_basic"
  | "originality"
  | "literature"
  | "data_analysis";

// minimum plan rank required + default credit cost
export const FEATURE_RULES: Record<FeatureKey, { minRank: number; credits: number; label: string }> = {
  topic_generation: { minRank: 0, credits: 2, label: "Topic generation" },
  chapter_generation: { minRank: 0, credits: 20, label: "Chapter generation" },
  academic_assist: { minRank: 0, credits: 2, label: "Academic assistant" },
  citation: { minRank: 0, credits: 2, label: "Citation tools" },
  quality_check: { minRank: 1, credits: 8, label: "Quality check" },
  refinement: { minRank: 1, credits: 20, label: "AI refinement" },
  defense_basic: { minRank: 1, credits: 10, label: "Defense preparation" },
  defense_simulation: { minRank: 2, credits: 10, label: "Mock defense simulation" },
  originality: { minRank: 1, credits: 10, label: "Originality checker" },
  literature: { minRank: 1, credits: 5, label: "Literature finder" },
  data_analysis: { minRank: 2, credits: 8, label: "Data analysis assistant" },
};

export function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export class AccessError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 403, code = "forbidden") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) throw new AccessError("You must be signed in.", 401, "unauthenticated");

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } },
  );
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) throw new AccessError("Invalid session.", 401, "unauthenticated");
  return data.user;
}

export async function getPlan(userId: string) {
  const db = adminClient();
  const { data } = await db
    .from("user_subscriptions")
    .select("status, expiry_date, subscription_plans(slug, name, ai_limits)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const plan = data?.subscription_plans;
  const expired = data?.expiry_date ? new Date(data.expiry_date).getTime() < Date.now() : false;
  if (!plan || expired) {
    const { data: free } = await db
      .from("subscription_plans")
      .select("slug, name, ai_limits")
      .eq("slug", "free")
      .maybeSingle();
    return free ?? { slug: "free", name: "Free Trial", ai_limits: { credits: 10 } };
  }
  return plan;
}

/** Global platform switches (admin can make everything free). */
export async function siteSettings() {
  const db = adminClient();
  const { data } = await db
    .from("app_settings")
    .select("pricing_mode, payments_enabled")
    .eq("id", "global")
    .maybeSingle();
  return { pricing_mode: data?.pricing_mode ?? "paid", payments_enabled: data?.payments_enabled ?? true };
}

// ============================================================
// Credit system
// ============================================================

export async function getCreditBalance(userId: string) {
  const db = adminClient();
  const { data } = await db
    .from("ai_credit_balances")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    const plan = await getPlan(userId);
    const limits = plan.ai_limits ?? {};
    const dailyLimit = Number(limits.credits ?? 10);
    const monthlyLimit = dailyLimit * 30;
    const now = new Date();
    const dailyReset = new Date(now);
    dailyReset.setDate(dailyReset.getDate() + 1);
    dailyReset.setHours(0, 0, 0, 0);
    const monthlyReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const { data: balance } = await db
      .from("ai_credit_balances")
      .insert({
        user_id: userId,
        daily_credits: dailyLimit,
        daily_reset_at: dailyReset.toISOString(),
        monthly_credits: monthlyLimit,
        monthly_reset_at: monthlyReset.toISOString(),
      })
      .select("*")
      .single();
    return balance;
  }

  return data;
}

export async function deductCredits(userId: string, credits: number, featureKey: string, projectId?: string | null) {
  const db = adminClient();
  const now = new Date().toISOString();

  // Atomic deduction with RETURNING
  const { data, error } = await db
    .from("ai_credit_balances")
    .update({
      daily_credits: `daily_credits - ${credits}`,
      monthly_credits: `monthly_credits - ${credits}`,
      updated_at: now,
    })
    .eq("user_id", userId)
    .gte("daily_credits", credits)
    .gte("monthly_credits", credits)
    .gte("daily_reset_at", now)
    .gte("monthly_reset_at", now)
    .returning("*");

  if (error || !data || data.length === 0) {
    const balance = await getCreditBalance(userId);
    const dailyRemaining = Number(balance.daily_credits ?? 0);
    const monthlyRemaining = Number(balance.monthly_credits ?? 0);
    throw new AccessError(
      `Insufficient credits. Daily: ${dailyRemaining}, Monthly: ${monthlyRemaining}. Upgrade your plan for more.`,
      402,
      "credits_exhausted",
    );
  }

  const updated = data[0];

  // Log usage
  await db.from("ai_credit_usage").insert({
    user_id: userId,
    project_id: projectId ?? null,
    feature_key: featureKey,
    provider: "pending",
    model: "pending",
    input_tokens: 0,
    output_tokens: 0,
    estimated_cost: 0,
    credits_used: credits,
    status: "success",
  });

  return updated;
}

export async function checkCreditLimit(userId: string, featureKey: string): Promise<{ allowed: boolean; reason?: string }> {
  const balance = await getCreditBalance(userId);
  const settings = await getFeatureSettings(featureKey);

  if (!settings) {
    return { allowed: true };
  }

  const dailyRemaining = Number(balance.daily_credits ?? 0);
  const monthlyRemaining = Number(balance.monthly_credits ?? 0);
  const creditsNeeded = settings.credits;

  if (settings.daily_limit && dailyRemaining < creditsNeeded) {
    return { allowed: false, reason: `Daily limit reached. You have ${dailyRemaining} credits remaining today.` };
  }

  if (settings.monthly_limit && monthlyRemaining < creditsNeeded) {
    return { allowed: false, reason: `Monthly limit reached. You have ${monthlyRemaining} credits remaining this month.` };
  }

  return { allowed: true };
}

export async function getFeatureSettings(featureKey: string) {
  const db = adminClient();
  const { data } = await db
    .from("ai_feature_settings")
    .select("*")
    .eq("feature_key", featureKey)
    .maybeSingle();

  if (!data) return null;
  return {
    feature_key: String(data.feature_key),
    provider_id: data.provider_id ? String(data.provider_id) : null,
    model_id: data.model_id ? String(data.model_id) : null,
    enabled: !!data.enabled,
    credits: Number(data.credits ?? 1),
    max_input_tokens: Number(data.max_input_tokens ?? 8000),
    max_output_tokens: Number(data.max_output_tokens ?? 4096),
    daily_limit: data.daily_limit ? Number(data.daily_limit) : null,
    monthly_limit: data.monthly_limit ? Number(data.monthly_limit) : null,
  };
}

// ============================================================
// Original enforcement (kept for backward compatibility)
// ============================================================

export async function creditsUsedThisMonth(userId: string) {
  const db = adminClient();
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { data } = await db
    .from("ai_credit_usage")
    .select("credits_used")
    .eq("user_id", userId)
    .gte("created_at", start.toISOString());
  return (data ?? []).reduce((s: number, r: { credits_used?: number }) => s + (r.credits_used || 0), 0);
}

/**
 * Validates the session, plan entitlement and remaining credits.
 * Throws AccessError with a friendly message when blocked.
 */
export async function enforce(
  req: Request,
  feature: FeatureKey,
  opts: { projectId?: string | null; chapter?: string | null } = {},
) {
  const user = await requireUser(req);
  const plan = await getPlan(user.id);
  const settings = await siteSettings();
  const freeMode = settings.pricing_mode === "free";
  const rule = FEATURE_RULES[feature];
  const rank = freeMode ? 99 : (PLAN_RANK[plan.slug] ?? 0);

  if (rank < rule.minRank) {
    throw new AccessError(
      `${rule.label} is not available on the ${plan.name}. Upgrade your plan to continue.`,
      402,
      "upgrade_required",
    );
  }

  const featureSettings = await getFeatureSettings(feature);
  if (featureSettings && !featureSettings.enabled) {
    throw new AccessError(
      `${rule.label} is currently disabled by the administrator.`,
      403,
      "feature_disabled",
    );
  }

  // Free trial: only Chapter 1 of one project.
  const limits = plan.ai_limits ?? {};
  const chapterKey = (text: string) => {
    const m = /chapter\s*[-_]?\s*([1-9])/i.exec(String(text));
    return m ? `chapter${m[1]}` : null;
  };
  if (!freeMode && Array.isArray(limits.chapters) && opts.chapter) {
    const key = chapterKey(opts.chapter);
    const allowed = limits.chapters
      .map((c: string) => chapterKey(c))
      .filter(Boolean) as string[];
    if (key && allowed.length && !allowed.includes(key)) {
      throw new AccessError(
        `Your ${plan.name} only covers Chapter 1. Upgrade to unlock Chapters 2-5.`,
        402,
        "upgrade_required",
      );
    }
  }

  const limit = freeMode ? 100000 : Number(limits.credits ?? 10);
  const used = await creditsUsedThisMonth(user.id);
  if (used + rule.credits > limit) {
    throw new AccessError(
      `You have used all ${limit} AI credits for this month. Upgrade your plan for more.`,
      402,
      "credits_exhausted",
    );
  }

  // Check daily/monthly credit limits
  const creditCheck = await checkCreditLimit(user.id, feature);
  if (!creditCheck.allowed) {
    throw new AccessError(creditCheck.reason ?? "Credit limit exceeded.", 402, "credits_exhausted");
  }

  return {
    user,
    plan,
    creditsRemaining: limit - used,
    async log() {
      const db = adminClient();
      await db.from("ai_credit_usage").insert({
        user_id: user.id,
        project_id: opts.projectId ?? null,
        feature,
        credits_used: rule.credits,
        status: "success",
      });
      if (limit - (used + rule.credits) <= Math.max(2, Math.round(limit * 0.1))) {
        await db.from("notifications").insert({
          user_id: user.id,
          title: "AI credits running low",
          body: `You have ${Math.max(0, limit - used - rule.credits)} AI credits left this month.`,
          type: "warning",
          link: "/billing",
        });
      }
    },
  };
}

/** Ensures the given project belongs to the user. Throws AccessError otherwise. */
export async function assertProjectOwnership(userId: string, projectId?: string | null) {
  if (!projectId) return;
  const db = adminClient();
  const { data } = await db
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!data || data.user_id !== userId) {
    throw new AccessError("You don't have access to this project.", 403, "forbidden");
  }
}

/** Consistent JSON error response for edge functions. */
export function accessErrorResponse(e: unknown, corsHeaders: Record<string, string>) {
  const status = e instanceof AccessError ? e.status : 500;
  const code = e instanceof AccessError ? e.code : "server_error";
  const message = (e instanceof Error ? e.message : String(e)) ?? "Unexpected server error";
  console.error("edge function error", code, message);
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * One-call guard: validates session, plan, chapter access, credits and project
 * ownership. Returns the enforcement context (call `.log()` after success).
 */
export async function guard(
  req: Request,
  feature: FeatureKey,
  opts: { projectId?: string | null; chapter?: string | null } = {},
) {
  const ctx = await enforce(req, feature, opts);
  await assertProjectOwnership(ctx.user.id, opts.projectId ?? null);
  return ctx;
}

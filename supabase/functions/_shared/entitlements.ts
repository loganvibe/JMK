// Centralised, server-side feature access + AI credit enforcement.
// Supports two user types: free users (daily credits) and weekly contributors (7-day bucket).
import { createClient } from "npm:@supabase/supabase-js@2";
import { isPast, resolveCreditDecision, weeklyExpiry, nextDailyResetUtc, nextMonthlyResetUtc } from "./credit-rules.ts";
import { DEFAULT_WEEKLY_CREDITS, DEFAULT_WEEKLY_DAYS, WEEKLY_CONTRIBUTION_SLUG, weeklyCreditsForPlan, weeklyDaysForPlan } from "./plan-activation.ts";

export const FREE_PLAN_SLUG = "free";

export const PLAN_RANK: Record<string, number> = {
  free: 0,
  custom: 0,
  student: 1,
  premium_plus: 2,
  [WEEKLY_CONTRIBUTION_SLUG]: 2,
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

// Minimum plan rank required + default credit cost (FEATURE_RULES is authoritative).
// Credit costs match ai_feature_settings seeded in migration 20260929000002.
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
    .select("status, expiry_date, payment_reference, subscription_plans(id, slug, name, price, ai_limits, active)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const plan = data?.subscription_plans as Record<string, unknown> | null | undefined;
  const expired = data?.expiry_date ? new Date(String(data.expiry_date)).getTime() <= Date.now() : false;
  if (plan) {
    // Return the plan even if expired, so callers can distinguish weekly contributors (rank 2)
    // from free users (rank 0). Expired access is enforced by checkCreditLimit/deductCredits.
    return { ...(plan as Record<string, unknown>), expiry_date: data?.expiry_date ?? null, payment_reference: data?.payment_reference ?? null, _expired: expired } as Record<string, unknown>;
  }

  // No subscription at all: fall back to the free plan.
  const { data: free } = await db
    .from("subscription_plans")
    .select("id, slug, name, price, ai_limits, active")
    .eq("slug", FREE_PLAN_SLUG)
    .maybeSingle();
  return (
    free ?? {
      id: null,
      slug: FREE_PLAN_SLUG,
      name: "Free Trial",
      price: 0,
      ai_limits: { credits: 10, chapters: ["chapter1"] },
      active: true,
    }
  ) as Record<string, unknown>;
}

export async function siteSettings() {
  const db = adminClient();
  const { data } = await db
    .from("app_settings")
    .select("pricing_mode, payments_enabled, free_mode_message")
    .eq("id", "global")
    .maybeSingle();
  return {
    pricing_mode: data?.pricing_mode ?? "paid",
    payments_enabled: data?.payments_enabled ?? true,
    free_mode_message: data?.free_mode_message ?? null,
  };
}

export async function getCreditBalance(userId: string) {
  const db = adminClient();
  const plan = await getPlan(userId);
  const isFree = plan.slug === FREE_PLAN_SLUG;
  const creditsLimit = isFree ? Number((plan as any)?.ai_limits?.credits ?? 10) : weeklyCreditsForPlan(plan as any);
  const now = new Date();

  const { data } = await db.from("ai_credit_balances").select("*").eq("user_id", userId).maybeSingle();

  if (!data) {
    if (isFree) {
      const dailyReset = nextDailyResetUtc(now);
      const monthlyReset = nextMonthlyResetUtc(now);
      const { data: created } = await db
        .from("ai_credit_balances")
        .insert({
          user_id: userId,
          daily_credits: creditsLimit,
          daily_reset_at: dailyReset.toISOString(),
          monthly_credits: creditsLimit * 30,
          monthly_reset_at: monthlyReset.toISOString(),
          access_expires_at: null,
          credits_total: creditsLimit,
          updated_at: now.toISOString(),
        })
        .select("*")
        .single();
      return created;
    }
    const expiredAt = now.toISOString();
    const { data: created } = await db
      .from("ai_credit_balances")
      .insert({
        user_id: userId,
        daily_credits: 0,
        daily_reset_at: expiredAt,
        monthly_credits: 0,
        monthly_reset_at: expiredAt,
        access_expires_at: expiredAt,
        credits_total: creditsLimit,
        updated_at: now.toISOString(),
      })
      .select("*")
      .single();
    return created;
  }

  if (isFree) {
    const dailyResetPassed = isPast(data.daily_reset_at, now);
    const monthlyResetPassed = isPast(data.monthly_reset_at, now);

    if (dailyResetPassed || monthlyResetPassed) {
      const dailyReset = nextDailyResetUtc(now);
      const monthlyReset = nextMonthlyResetUtc(now);
      const { data: updated } = await db
        .from("ai_credit_balances")
        .update({
          daily_credits: creditsLimit,
          monthly_credits: creditsLimit * 30,
          daily_reset_at: dailyReset.toISOString(),
          monthly_reset_at: monthlyReset.toISOString(),
          access_expires_at: null,
          credits_total: creditsLimit,
          updated_at: now.toISOString(),
        })
        .eq("user_id", userId)
        .select("*")
        .single();
      return updated ?? { ...data, daily_credits: creditsLimit, access_expires_at: null };
    }

    return { ...data, access_expires_at: null };
  }

  // Weekly contributor: expiry-safe normalization, no refill.
  const accessExpiresAt = data.access_expires_at ?? data.monthly_reset_at ?? data.daily_reset_at ?? null;
  const expired = isPast(accessExpiresAt, now);
  const rawCredits = Number(data.daily_credits ?? 0);
  const normalizedCredits = expired ? 0 : Math.max(0, rawCredits);
  const creditsTotal = Math.max(Number(data.credits_total ?? 0), creditsLimit, rawCredits, 0);

  if (normalizedCredits !== rawCredits || creditsTotal !== Number(data.credits_total ?? 0) || (data.access_expires_at ?? null) !== accessExpiresAt) {
    const { data: updated } = await db
      .from("ai_credit_balances")
      .update({
        daily_credits: normalizedCredits,
        monthly_credits: normalizedCredits,
        access_expires_at: accessExpiresAt,
        credits_total: creditsTotal,
        updated_at: now.toISOString(),
      })
      .eq("user_id", userId)
      .select("*")
      .single();
    return updated ?? { ...data, daily_credits: normalizedCredits, access_expires_at: accessExpiresAt, credits_total: creditsTotal };
  }

  return { ...data, access_expires_at: accessExpiresAt, credits_total: creditsTotal };
}

export async function getFeatureSettings(featureKey: string) {
  const db = adminClient();
  const { data } = await db.from("ai_feature_settings").select("*").eq("feature_key", featureKey).maybeSingle();
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

export async function checkCreditLimit(userId: string, featureKey: string): Promise<{ allowed: boolean; reason?: string; creditsRemaining?: number; accessExpiresAt?: string | null; requestedCredits?: number }> {
  const balance = await getCreditBalance(userId);
  const settings = await getFeatureSettings(featureKey);
  if (!settings) return { allowed: true };

  const plan = await getPlan(userId);
  const isFree = plan.slug === FREE_PLAN_SLUG;
  const requestedCredits = FEATURE_RULES[featureKey as FeatureKey]?.credits ?? settings.credits;

  // Free users use daily_reset_at as the access boundary; weekly contributors use access_expires_at.
  const accessExpiresAt = isFree
    ? ((balance as any)?.daily_reset_at ?? null)
    : ((balance?.access_expires_at ?? null) as string | null);

  const decision = resolveCreditDecision({
    creditsRemaining: Number((balance as any)?.daily_credits ?? 0),
    requestedCredits,
    accessExpiresAt,
  });

  if (!decision.allowed) {
    return { allowed: false, reason: decision.reason, creditsRemaining: Number((balance as any)?.daily_credits ?? 0), accessExpiresAt, requestedCredits };
  }
  return { allowed: true, creditsRemaining: Number((balance as any)?.daily_credits ?? 0), accessExpiresAt, requestedCredits };
}

export async function deductCredits(
  userId: string,
  credits: number,
  featureKey: string,
  projectId?: string | null,
  usageInfo?: { provider?: string; model?: string; inputTokens?: number; outputTokens?: number; estimatedCost?: number },
) {
  const db = adminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: current0, error: readError } = await db
    .from("ai_credit_balances")
    .select("daily_credits, monthly_credits, access_expires_at, daily_reset_at, monthly_reset_at, credits_total, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) throw new AccessError(`Could not read your AI credit balance. ${readError.message}`, 500, "credits_unavailable");
  if (!current0) throw new AccessError("No active contribution found. Please contribute to get access.", 402, "credits_exhausted");
  let current: Record<string, unknown> = current0 as Record<string, unknown>;

  for (let attempt = 0; attempt < 2; attempt++) {
    const creditsRemaining = Math.max(0, Number(current.daily_credits ?? 0));
    const plan = await getPlan(userId);
    const isFree = plan.slug === FREE_PLAN_SLUG;
    const accessExpiresAt = isFree
      ? ((current.daily_reset_at ?? null) as string | null)
      : ((current.access_expires_at ?? current.monthly_reset_at ?? current.daily_reset_at ?? null) as string | null);
    const decision = resolveCreditDecision({ creditsRemaining, requestedCredits: credits, accessExpiresAt, now });

    if (!decision.allowed) {
      throw new AccessError(decision.reason, 402, decision.scope === "expired" ? "access_expired" : "credits_exhausted");
    }

    const nextCredits = creditsRemaining - credits;
    const updateValues: Record<string, unknown> = {
      daily_credits: nextCredits,
      monthly_credits: nextCredits,
      updated_at: nowIso,
    };
    if (isFree) {
      updateValues["access_expires_at"] = current.daily_reset_at;
      updateValues["daily_reset_at"] = current.daily_reset_at;
      updateValues["monthly_reset_at"] = current.monthly_reset_at;
    } else {
      updateValues["access_expires_at"] = accessExpiresAt;
      updateValues["daily_reset_at"] = accessExpiresAt ?? current.daily_reset_at;
      updateValues["monthly_reset_at"] = accessExpiresAt ?? current.monthly_reset_at;
    }
    updateValues["credits_total"] = Math.max(Number(current.credits_total ?? 0), creditsRemaining);

    const { data: rows, error: updateError } = await db
      .from("ai_credit_balances")
      .update(updateValues)
      .eq("user_id", userId)
      .eq("updated_at", current.updated_at)
      .eq("daily_credits", creditsRemaining)
      .select("daily_credits, monthly_credits, access_expires_at");

    if (updateError) throw new AccessError(`Could not spend AI credits. ${updateError.message}`, 500, "credits_unavailable");
    const updated = Array.isArray(rows) ? rows[0] ?? null : rows ?? null;
    if (!updated) {
      const { data: fresh } = await db
        .from("ai_credit_balances")
        .select("daily_credits, monthly_credits, access_expires_at, daily_reset_at, monthly_reset_at, credits_total, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (!fresh) throw new AccessError("No active contribution found. Please contribute to get access.", 402, "credits_exhausted");
      current = fresh as Record<string, unknown>;
      continue;
    }

    await db.from("ai_credit_usage").insert({
      user_id: userId,
      project_id: projectId ?? null,
      feature_key: featureKey,
      provider: usageInfo?.provider ?? "openrouter",
      model: usageInfo?.model ?? "unknown",
      input_tokens: usageInfo?.inputTokens ?? 0,
      output_tokens: usageInfo?.outputTokens ?? 0,
      estimated_cost: usageInfo?.estimatedCost ?? 0,
      credits_used: credits,
      status: "success",
    });

    return updated;
  }

  throw new AccessError("Could not spend AI credits. Please try again.", 409, "credits_unavailable");
}

export async function enforce(
  req: Request,
  feature: FeatureKey,
  opts: { projectId?: string | null; chapter?: string | null } = {},
) {
  const user = await requireUser(req);
  const plan = await getPlan(user.id);
  const rule = FEATURE_RULES[feature];
  const rank = PLAN_RANK[plan.slug as keyof typeof PLAN_RANK] ?? 0;

  if (rank < rule.minRank) {
    throw new AccessError(
      `${rule.label} is not available on the ${plan.name}. Upgrade your plan to continue.`,
      402,
      "upgrade_required",
    );
  }

  const featureSettings = await getFeatureSettings(feature);
  if (featureSettings && !featureSettings.enabled) {
    throw new AccessError(`${rule.label} is currently disabled by the administrator.`, 403, "feature_disabled");
  }

  // Free users: Chapter 1 only (from ai_limits.chapters).
  const limits = (plan as any)?.ai_limits ?? {};
  if (plan.slug === FREE_PLAN_SLUG && opts.chapter) {
    const allowedChapters = Array.isArray(limits.chapters) ? limits.chapters : [];
    if (allowedChapters.length) {
      const m = String(opts.chapter).match(/chapter\s*(\d+)/i);
      const chapterKey = m ? `chapter${m[1]}` : null;
      if (chapterKey && !allowedChapters.includes(chapterKey)) {
        throw new AccessError(
          `Your ${plan.name} only covers Chapter 1. Upgrade to unlock Chapters 2-5.`,
          402,
          "upgrade_required",
        );
      }
    }
  }

  const creditCheck = await checkCreditLimit(user.id, feature);
  if (!creditCheck.allowed) {
    throw new AccessError(creditCheck.reason ?? "Credit limit exceeded.", 402, "credits_exhausted");
  }

  return {
    user,
    plan,
    creditsRemaining: creditCheck.creditsRemaining ?? 0,
    creditsCost: creditCheck.requestedCredits ?? rule.credits,
    accessExpiresAt: creditCheck.accessExpiresAt ?? null,
  };
}

export async function assertProjectOwnership(userId: string, projectId?: string | null) {
  if (!projectId) return;
  const db = adminClient();
  const { data } = await db.from("projects").select("id, user_id").eq("id", projectId).maybeSingle();
  if (!data || data.user_id !== userId) {
    throw new AccessError("You don't have access to this project.", 403, "forbidden");
  }
}

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

export async function guard(
  req: Request,
  feature: FeatureKey,
  opts: { projectId?: string | null; chapter?: string | null } = {},
) {
  const ctx = await enforce(req, feature, opts);
  await assertProjectOwnership(ctx.user.id, opts.projectId ?? null);
  return ctx;
}

export async function grantWeeklyAccess(userId: string, plan: Record<string, unknown>, paymentReference: string, startAt = new Date()) {
  const db = adminClient();
  const credits = weeklyCreditsForPlan(plan as any);
  const days = weeklyDaysForPlan(plan as any);
  const expiry = weeklyExpiry(startAt, days);
  const expiryIso = expiry.toISOString();

  await db.from("user_subscriptions").update({ status: "expired", updated_at: startAt.toISOString() }).eq("user_id", userId).eq("status", "active");
  const { error: subErr } = await db.from("user_subscriptions").insert({
    user_id: userId,
    plan_id: (plan as any).id,
    status: "active",
    start_date: startAt.toISOString(),
    expiry_date: expiryIso,
    payment_reference: paymentReference,
  });
  if (subErr) throw subErr;

  await db.from("subscriptions").upsert({
    user_id: userId,
    tier: WEEKLY_CONTRIBUTION_SLUG,
    status: "active",
    provider: "contribution",
    expires_at: expiryIso,
  }, { onConflict: "user_id" });

  const { error: balErr } = await db.from("ai_credit_balances").upsert({
    user_id: userId,
    daily_credits: credits,
    monthly_credits: credits,
    daily_reset_at: expiryIso,
    monthly_reset_at: expiryIso,
    access_expires_at: expiryIso,
    credits_total: credits,
    updated_at: startAt.toISOString(),
  }, { onConflict: "user_id" });
  if (balErr) throw balErr;

  return { creditsGranted: credits, expiresAt: expiryIso, durationDays: days };
}

// Centralised, server-side feature access + AI credit enforcement.
import { createClient } from "npm:@supabase/supabase-js@2";
import { isPast, nextDailyResetUtc, nextMonthlyResetUtc, resolveCreditDecision } from "./credit-rules.ts";

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

// Minimum plan rank required + default credit cost.
// This table is the single source of truth for per-action cost; the
// admin-editable ai_feature_settings.credits column is only a duplicate that
// drifts and is never used to make an affordability decision.
// Costs match the documented feature table (docs/03-subscriptions.md).
export const FEATURE_RULES: Record<FeatureKey, { minRank: number; credits: number; label: string }> = {
  topic_generation: { minRank: 0, credits: 1, label: "Topic generation" },
  chapter_generation: { minRank: 0, credits: 2, label: "Chapter generation" },
  academic_assist: { minRank: 0, credits: 1, label: "Academic assistant" },
  citation: { minRank: 0, credits: 1, label: "Citation tools" },
  quality_check: { minRank: 1, credits: 1, label: "Quality check" },
  refinement: { minRank: 1, credits: 3, label: "AI refinement" },
  defense_basic: { minRank: 1, credits: 1, label: "Defense preparation" },
  defense_simulation: { minRank: 2, credits: 3, label: "Mock defense simulation" },
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

  const plan = await getPlan(userId);
  const limits = plan.ai_limits ?? {};
  const dailyLimit = Number(limits.credits ?? 10);
  const monthlyLimit = dailyLimit * 30;
  const now = new Date();
  const dailyReset = nextDailyResetUtc(now);
  const monthlyReset = nextMonthlyResetUtc(now);

  if (!data) {
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
    console.log("[CREDITS_DEBUG]", {
      userId,
      planSlug: plan.slug,
      dailyLimit,
      usedToday: 0,
      remainingCredits: dailyLimit,
      monthlyRemaining: monthlyLimit,
      requestedCredits: 0,
      creditBalance: "created",
      feature: "balance_init",
    });
    return balance;
  }

  // Rollover happens only when a reset boundary has actually passed, or when
  // the plan limit shrank below the stored balance. Both comparisons are made
  // on parsed instants: PostgREST renders timestamptz as "+00:00" while
  // Date.toISOString() renders "Z", so a string comparison there is wrong.
  const dailyResetPassed = isPast(data.daily_reset_at, now);
  const monthlyResetPassed = isPast(data.monthly_reset_at, now);
  const planLimitChanged = Number(data.daily_credits) > dailyLimit;
  const monthlyPlanLimitChanged = Number(data.monthly_credits) > monthlyLimit;

  const needsReset = dailyResetPassed || monthlyResetPassed || planLimitChanged || monthlyPlanLimitChanged;

  console.log("[CREDITS_DEBUG]", {
    userId,
    planSlug: plan.slug,
    dailyLimit,
    usedToday: dailyResetPassed ? 0 : Math.max(0, dailyLimit - Number(data.daily_credits ?? 0)),
    remainingCredits: Number(data.daily_credits ?? 0),
    monthlyRemaining: Number(data.monthly_credits ?? 0),
    requestedCredits: 0,
    creditBalance: "existing",
    feature: "balance_load",
    dailyResetPassed,
    monthlyResetPassed,
    planLimitChanged,
  });

  if (needsReset) {
    const { data: balance, error } = await db
      .from("ai_credit_balances")
      .update({
        daily_credits: dailyLimit,
        daily_reset_at: dailyReset.toISOString(),
        monthly_credits: monthlyLimit,
        monthly_reset_at: monthlyReset.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) console.error("[credits] balance reset failed", error.message);
    return balance ?? data;
  }

  return data;
}

export async function deductCredits(
  userId: string,
  credits: number,
  featureKey: string,
  projectId?: string | null,
  usageInfo?: { provider?: string; model?: string; inputTokens?: number; outputTokens?: number; estimatedCost?: number },
) {
  const db = adminClient();
  const now = new Date().toISOString();

  // The balance is read first and the write is a compare-and-set on that row.
  // The previous shape - update().eq().gte()x4.returning() - cannot work:
  // .returning() is not exposed on an update builder in supabase-js 2.x, and
  // the column value "daily_credits - n" is a JavaScript string, not a SQL
  // expression. .select() and .eq() are used because both are available.
  const { data: current, error: readError } = await db
    .from("ai_credit_balances")
    .select("daily_credits, monthly_credits, daily_reset_at, monthly_reset_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) {
    throw new AccessError(`Could not read your AI credit balance. ${readError.message}`, 500, "credits_unavailable");
  }
  if (!current) {
    throw new AccessError("No AI credit balance is set up for this account.", 402, "credits_exhausted");
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const dailyRemaining = Number(current.daily_credits ?? 0);
    const monthlyRemaining = Number(current.monthly_credits ?? 0);
    const plan = await getPlan(userId);
    const dailyLimit = Number(plan.ai_limits?.credits ?? 10);
    const decision = resolveCreditDecision({
      dailyRemaining,
      monthlyRemaining,
      requestedCredits: credits,
    });
    const windowOpen = !isPast(current.daily_reset_at) && !isPast(current.monthly_reset_at);

    console.log("[CREDITS_DEBUG]", {
      userId,
      planSlug: plan.slug,
      dailyLimit,
      usedToday: Math.max(0, dailyLimit - dailyRemaining),
      remainingCredits: dailyRemaining,
      monthlyRemaining,
      requestedCredits: credits,
      feature: featureKey,
    });

    if (!windowOpen || !decision.allowed) {
      console.log("[CREDITS_REJECT]", {
        userId,
        planSlug: plan.slug,
        dailyLimit,
        usedToday: Math.max(0, dailyLimit - dailyRemaining),
        remainingCredits: dailyRemaining,
        monthlyRemaining,
        requestedCredits: credits,
        feature: featureKey,
        reason: windowOpen ? decision.allowed ? "reset window closed" : decision.reason : "credit window expired",
      });
      throw new AccessError(
        windowOpen ? decision.reason ?? "Not enough AI credits." : "Your credit window has expired. Please try again.",
        402,
        "credits_exhausted",
      );
    }

    // Compare-and-set: the update only applies if the row is still the one we
    // priced, so two concurrent requests cannot both spend the same credit.
    const { data: rows, error: updateError } = await db
      .from("ai_credit_balances")
      .update({
        daily_credits: dailyRemaining - credits,
        monthly_credits: monthlyRemaining - credits,
        updated_at: now,
      })
      .eq("user_id", userId)
      .eq("updated_at", current.updated_at)
      .eq("daily_credits", dailyRemaining)
      .select("daily_credits, monthly_credits");

    if (updateError) {
      throw new AccessError(`Could not spend AI credits. ${updateError.message}`, 500, "credits_unavailable");
    }

    // update().select() returns the matched rows as an array; unwrap the first
    // row ourselves. A bare `.maybeSingle()` on a non-GET builder is not
    // unwrapped by supabase-js v2 (its unwrap is gated on method === "GET"), so
    // using it would leave `[row]` here and silently hide a lost update.
    const updated = Array.isArray(rows) ? rows[0] ?? null : rows ?? null;
    if (!updated) {
      // The row moved between the read and the write: re-price once.
      const { data: fresh } = await db
        .from("ai_credit_balances")
        .select("daily_credits, monthly_credits, daily_reset_at, monthly_reset_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (!fresh) {
        throw new AccessError("No AI credit balance is set up for this account.", 402, "credits_exhausted");
      }
      current = fresh;
      continue;
    }

    // Log usage with actual provider and model
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

    console.log("[CREDITS_DEBUG]", {
      userId,
      planSlug: plan.slug,
      dailyLimit,
      usedToday: Math.max(0, dailyLimit - Number(updated.daily_credits ?? 0)),
      remainingCredits: Number(updated.daily_credits ?? 0),
      monthlyRemaining: Number(updated.monthly_credits ?? 0),
      requestedCredits: credits,
      feature: featureKey,
      creditBalance: "deducted",
    });

    // Notify when monthly credits are running low
    const monthlyLeft = Number(updated.monthly_credits ?? 0);
    const monthlyLimit = dailyLimit * 30;
    if (monthlyLeft <= Math.max(2, Math.round(monthlyLimit * 0.1))) {
      await db.from("notifications").insert({
        user_id: userId,
        title: "AI credits running low",
        body: `You have ${monthlyLeft} AI credits left this month.`,
        type: "warning",
        link: "/billing",
      });
    }

    return updated;
  }

  throw new AccessError("Could not spend AI credits. Please try again.", 409, "credits_unavailable");
}

export async function checkCreditLimit(userId: string, featureKey: string): Promise<{ allowed: boolean; reason?: string; dailyRemaining?: number; monthlyRemaining?: number; requestedCredits?: number }> {
  const balance = await getCreditBalance(userId);
  const settings = await getFeatureSettings(featureKey);

  if (!settings) {
    return { allowed: true };
  }

  // FEATURE_RULES is the authoritative per-operation cost. The ai_feature_settings
  // .credits column is an admin-editable duplicate that can drift out of sync, so it
  // must never be used to decide whether a request is affordable.
  const requestedCredits = FEATURE_RULES[featureKey as FeatureKey]?.credits ?? settings.credits;

  const decision = resolveCreditDecision({
    dailyRemaining: Number(balance.daily_credits ?? 0),
    monthlyRemaining: Number(balance.monthly_credits ?? 0),
    requestedCredits,
  });

  const plan = await getPlan(userId);
  const dailyLimit = Number(plan.ai_limits?.credits ?? 10);

  console.log("[JMK_CREDIT_CHECK]", {
    userId,
    planSlug: plan.slug,
    dailyLimit,
    usedToday: Math.max(0, dailyLimit - decision.dailyRemaining),
    remainingCredits: decision.dailyRemaining,
    requestedCredits,
    feature: featureKey,
    shouldAllow: decision.allowed,
  });

  console.log("[CREDITS_DEBUG]", {
    userId,
    planSlug: plan.slug,
    dailyLimit,
    usedToday: Math.max(0, dailyLimit - decision.dailyRemaining),
    remainingCredits: decision.dailyRemaining,
    monthlyRemaining: decision.monthlyRemaining,
    requestedCredits,
    creditBalance: Number(balance.daily_credits ?? 0),
    feature: featureKey,
    shouldAllow: decision.allowed,
  });

  if (!decision.allowed) {
    console.log("[CREDITS_REJECT]", {
      userId,
      planSlug: plan.slug,
      feature: featureKey,
      dailyLimit,
      usedToday: Math.max(0, dailyLimit - decision.dailyRemaining),
      remainingCredits: decision.dailyRemaining,
      monthlyRemaining: decision.monthlyRemaining,
      requestedCredits,
      scope: decision.scope,
    });
    return { allowed: false, reason: decision.reason };
  }

  return {
    allowed: true,
    dailyRemaining: decision.dailyRemaining,
    monthlyRemaining: decision.monthlyRemaining,
    requestedCredits,
  };
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
// Credit enforcement
// ============================================================

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
  const rank = PLAN_RANK[plan.slug] ?? 0;

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
  if (Array.isArray(limits.chapters) && opts.chapter) {
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

  // The plan's ai_limits.credits is a DAILY allowance. The authoritative
  // affordability decision is made once, in checkCreditLimit(), against the
  // user's ai_credit_balances row. No second, competing monthly comparison here.
  const creditCheck = await checkCreditLimit(user.id, feature);
  if (!creditCheck.allowed) {
    throw new AccessError(creditCheck.reason ?? "Credit limit exceeded.", 402, "credits_exhausted");
  }

  // Credits are spent exclusively through deductCredits(), which every edge
  // function calls only after the AI request has succeeded. A failed AI call
  // therefore costs nothing and logs nothing.
  return {
    user,
    plan,
    creditsRemaining: creditCheck.dailyRemaining ?? 0,
    creditsCost: creditCheck.requestedCredits ?? rule.credits,
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
 * ownership. Returns the enforcement context; the caller spends credits with
 * deductCredits() only once the AI request has succeeded.
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

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

// minimum plan rank required + credit cost
export const FEATURE_RULES: Record<FeatureKey, { minRank: number; credits: number; label: string }> = {
  topic_generation: { minRank: 0, credits: 1, label: "Topic generation" },
  chapter_generation: { minRank: 0, credits: 2, label: "Chapter generation" },
  academic_assist: { minRank: 0, credits: 1, label: "Academic assistant" },
  citation: { minRank: 0, credits: 1, label: "Citation tools" },
  quality_check: { minRank: 1, credits: 1, label: "Quality check" },
  refinement: { minRank: 1, credits: 3, label: "AI refinement" },
  defense_basic: { minRank: 1, credits: 1, label: "Defense preparation" },
  defense_simulation: { minRank: 2, credits: 3, label: "Mock defense simulation" },
  originality: { minRank: 1, credits: 2, label: "Originality checker" },
  literature: { minRank: 1, credits: 2, label: "Literature finder" },
  data_analysis: { minRank: 2, credits: 3, label: "Data analysis assistant" },
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

export async function creditsUsedThisMonth(userId: string) {
  const db = adminClient();
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { data } = await db
    .from("ai_usage_logs")
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

  // Free trial: only Chapter 1 of one project.
  // Plan limits store keys like "chapter1"; the client sends labels like
  // "Chapter 1: Introduction", so compare on the detected chapter number and
  // never block un-numbered sections (Abstract, References, Defense…).
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

  return {
    user,
    plan,
    creditsRemaining: limit - used,
    async log() {
      const db = adminClient();
      await db.from("ai_usage_logs").insert({
        user_id: user.id,
        project_id: opts.projectId ?? null,
        feature,
        credits_used: rule.credits,
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

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
  | "defense_basic";

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

  const plan: any = data?.subscription_plans;
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
  return (data ?? []).reduce((s: number, r: any) => s + (r.credits_used || 0), 0);
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
  const rule = FEATURE_RULES[feature];
  const rank = PLAN_RANK[plan.slug] ?? 0;

  if (rank < rule.minRank) {
    throw new AccessError(
      `${rule.label} is not available on the ${plan.name}. Upgrade your plan to continue.`,
      402,
      "upgrade_required",
    );
  }

  // Free trial: only Chapter 1 of one project
  const limits: any = plan.ai_limits ?? {};
  if (Array.isArray(limits.chapters) && opts.chapter) {
    const key = String(opts.chapter).toLowerCase().replace(/[^a-z0-9]/g, "");
    const allowed = limits.chapters.map((c: string) => c.toLowerCase().replace(/[^a-z0-9]/g, ""));
    if (!allowed.includes(key)) {
      throw new AccessError(
        `Your ${plan.name} only covers Chapter 1. Upgrade to unlock Chapters 2-5.`,
        402,
        "upgrade_required",
      );
    }
  }

  const limit = Number(limits.credits ?? 10);
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

import { supabase } from "@/integrations/supabase/client";

type LooseClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>;
      };
    };
  };
};

const db = supabase as unknown as LooseClient;

export async function fetchCreditBalance(userId: string): Promise<{ creditsRemaining: number; accessExpiresAt: string | null; creditsTotal: number }> {
  const { data } = await db.from("ai_credit_balances").select("daily_credits, access_expires_at, credits_total, daily_reset_at").eq("user_id", userId).maybeSingle();

  if (!data) {
    // No balance yet: return free plan defaults (10 daily credits, no weekly expiry)
    return { creditsRemaining: 10, accessExpiresAt: null, creditsTotal: 10 };
  }

  const creditsRemaining = Number.isFinite(Number(data?.daily_credits)) ? Math.max(0, Number(data?.daily_credits)) : 0;
  const accessExpiresAt = typeof data?.access_expires_at === "string" ? data.access_expires_at : null;
  const creditsTotal = Number.isFinite(Number(data?.credits_total)) ? Math.max(0, Number(data?.credits_total)) : 10;

  // Free users have null access_expires_at: no weekly expiry.
  // Weekly contributors: check if access has expired.
  const expired = accessExpiresAt ? new Date(accessExpiresAt).getTime() <= Date.now() : false;
  return { creditsRemaining: expired ? 0 : creditsRemaining, accessExpiresAt, creditsTotal };
}

/** Weekly contribution allowance (default 50). */
export async function fetchWeeklyPlanCredits(planSlug = "weekly_support"): Promise<number> {
  const { data } = await db.from("subscription_plans").select("ai_limits").eq("slug", planSlug).maybeSingle();
  const limits = (data?.ai_limits ?? {}) as Record<string, unknown>;
  const value = Number(limits.credits);
  return Number.isFinite(value) && value > 0 ? value : 50;
}

/** Free plan daily allowance (default 10). */
export async function fetchFreePlanCredits(): Promise<number> {
  const { data } = await db.from("subscription_plans").select("ai_limits").eq("slug", "free").maybeSingle();
  const limits = (data?.ai_limits ?? {}) as Record<string, unknown>;
  const value = Number(limits.credits);
  return Number.isFinite(value) && value > 0 ? value : 10;
}

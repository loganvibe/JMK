import { supabase } from "@/integrations/supabase/client";

// The generated Database types in src/integrations/supabase/types.ts predate the
// ai_credit_balances table, so the read is issued through a loose view of the
// client rather than editing the generated file.
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

/**
 * The single source of truth for credit display.
 *
 * It is the same ai_credit_balances row the edge functions check in
 * checkCreditLimit() and write in deductCredits(); the dashboard and the billing
 * page both derive "used" from it instead of from a counter nothing writes to.
 */
export async function fetchDailyCreditBalance(userId: string): Promise<number | null> {
  const { data } = await db.from("ai_credit_balances").select("daily_credits").eq("user_id", userId).maybeSingle();
  const value = Number(data?.daily_credits);
  return Number.isFinite(value) ? value : null;
}

/** The daily allowance configured on the plan, used as the "/ N" denominator. */
export async function fetchDailyPlanLimit(planSlug = "free"): Promise<number> {
  const { data } = await db.from("subscription_plans").select("ai_limits").eq("slug", planSlug).maybeSingle();
  const limits = (data?.ai_limits ?? {}) as Record<string, unknown>;
  const value = Number(limits.credits);
  return Number.isFinite(value) ? value : 10;
}

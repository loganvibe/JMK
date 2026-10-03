// Plan activation policy. Free Mode waives payment; it never changes the
// entitlements of the plan the user selected. Kept free of imports so the
// edge function, the UI and the unit tests all resolve activation the same way.

export const SELF_SERVE_PLAN_SLUGS = ["free", "student", "premium_plus"] as const;

export type PlanRow = {
  id: string;
  slug: string;
  name: string;
  price?: number | null;
  ai_limits?: Record<string, unknown> | null;
};

export type ActivationResolution =
  | { action: "activate"; plan: PlanRow; dailyCredits: number; reason: "free_mode" }
  | { action: "payment_required"; plan: PlanRow; dailyCredits: number; reason: "paid_mode" }
  | { action: "quote"; plan: PlanRow; reason: "custom_plan" }
  | { action: "rejected"; code: string; message: string };

export type ActivationInput = {
  pricingMode: string | null | undefined;
  planSlug: string;
  plan: PlanRow | null | undefined;
};

/** The daily allowance always comes from the activated plan, never from the pricing mode. */
export function dailyCreditsForPlan(plan: PlanRow | null | undefined): number {
  const value = Number(plan?.ai_limits?.credits);
  return Number.isFinite(value) ? value : 10;
}

export function resolvePlanActivation({ pricingMode, planSlug, plan }: ActivationInput): ActivationResolution {
  if (!plan) {
    return { action: "rejected", code: "PLAN_NOT_FOUND", message: "Unknown or inactive plan" };
  }
  if (plan.slug === "custom") {
    return { action: "quote", plan, reason: "custom_plan" };
  }
  if (plan.slug !== planSlug) {
    return {
      action: "rejected",
      code: "PLAN_MISMATCH",
      message: "The selected plan does not match the requested plan",
    };
  }
  if (!(SELF_SERVE_PLAN_SLUGS as readonly string[]).includes(planSlug)) {
    return {
      action: "rejected",
      code: "PLAN_NOT_SELECTABLE",
      message: "This plan cannot be selected directly",
    };
  }

  const dailyCredits = dailyCreditsForPlan(plan);

  if (pricingMode === "free") {
    return { action: "activate", plan, dailyCredits, reason: "free_mode" };
  }

  return { action: "payment_required", plan, dailyCredits, reason: "paid_mode" };
}

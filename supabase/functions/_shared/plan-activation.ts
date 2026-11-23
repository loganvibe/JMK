// Contribution/plan activation policy shared by edge function, UI logic, and tests.

export const WEEKLY_CONTRIBUTION_SLUG = "weekly_support";
export const FREE_PLAN_SLUG = "free";
export const DEFAULT_WEEKLY_CREDITS = 50;
export const DEFAULT_WEEKLY_DAYS = 7;
export const DEFAULT_WEEKLY_AMOUNT = 1500;
export const DEFAULT_FREE_CREDITS = 10;
export const SELF_SERVE_PLAN_SLUGS = [WEEKLY_CONTRIBUTION_SLUG] as const;

export type PlanRow = {
  id: string;
  slug: string;
  name: string;
  price?: number | null;
  active?: boolean | null;
  ai_limits?: Record<string, unknown> | null;
};

export type ActivationResolution =
  | { action: "payment_required"; plan: PlanRow; credits: number; durationDays: number; amount: number }
  | { action: "free"; plan: PlanRow; credits: number; durationDays: number }
  | { action: "quote"; plan: PlanRow; reason: "custom_plan" }
  | { action: "rejected"; code: string; message: string };

export type ActivationInput = {
  pricingMode?: string | null | undefined;
  paymentsEnabled?: boolean | null | undefined;
  planSlug: string;
  plan: PlanRow | null | undefined;
};

export function weeklyCreditsForPlan(plan: PlanRow | null | undefined): number {
  const value = Number(plan?.ai_limits?.credits);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_WEEKLY_CREDITS;
}

export function weeklyDaysForPlan(plan: PlanRow | null | undefined): number {
  const value = Number(plan?.ai_limits?.duration_days);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_WEEKLY_DAYS;
}

export function weeklyAmountForPlan(plan: PlanRow | null | undefined): number {
  const value = Number(plan?.price);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_WEEKLY_AMOUNT;
}

export function freeCreditsForPlan(plan: PlanRow | null | undefined): number {
  const value = Number(plan?.ai_limits?.credits);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_FREE_CREDITS;
}

export function resolvePlanActivation({ paymentsEnabled, planSlug, plan }: ActivationInput): ActivationResolution {
  if (!plan) {
    return { action: "rejected", code: "PLAN_NOT_FOUND", message: "Contribution option is unavailable." };
  }
  if (plan.active === false) {
    return { action: "rejected", code: "PLAN_INACTIVE", message: "This contribution option is not active." };
  }
  if (plan.slug === "custom" || planSlug === "custom") {
    return { action: "quote", plan, reason: "custom_plan" };
  }
  if (planSlug !== WEEKLY_CONTRIBUTION_SLUG || plan.slug !== WEEKLY_CONTRIBUTION_SLUG) {
    return {
      action: "rejected",
      code: "PLAN_NOT_SELECTABLE",
      message: "Only the weekly JMK contribution can be selected.",
    };
  }
  if (paymentsEnabled === false) {
    return { action: "rejected", code: "PAYMENTS_DISABLED", message: "Contributions are currently disabled. Please contact support." };
  }

  return {
    action: "payment_required",
    plan,
    credits: weeklyCreditsForPlan(plan),
    durationDays: weeklyDaysForPlan(plan),
    amount: weeklyAmountForPlan(plan),
  };
}

export function resolveFreePlanActivation(plan: PlanRow | null | undefined): ActivationResolution {
  if (!plan) {
    return { action: "rejected", code: "PLAN_NOT_FOUND", message: "Free plan is unavailable." };
  }
  if (plan.slug !== FREE_PLAN_SLUG) {
    return {
      action: "rejected",
      code: "PLAN_NOT_SELECTABLE",
      message: "Only the free plan can be activated for free access.",
    };
  }

  return {
    action: "free",
    plan,
    credits: freeCreditsForPlan(plan),
    durationDays: 1,
  };
}

import { describe, expect, it } from "vitest";
import { resolvePlanActivation, weeklyAmountForPlan, weeklyCreditsForPlan, weeklyDaysForPlan, type PlanRow, WEEKLY_CONTRIBUTION_SLUG } from "../../supabase/functions/_shared/plan-activation";

const WEEKLY: PlanRow = {
  id: "plan-weekly",
  slug: WEEKLY_CONTRIBUTION_SLUG,
  name: "Support JMK",
  price: 1500,
  active: true,
  ai_limits: { credits: 50, duration_days: 7, all_ai_features: true },
};

describe("weekly contribution activation policy", () => {
  it("requires verified payment for weekly contribution (never free/self-activate)", () => {
    const r = resolvePlanActivation({ planSlug: WEEKLY_CONTRIBUTION_SLUG, plan: WEEKLY, paymentsEnabled: true });
    expect(r.action).toBe("payment_required");
    if (r.action === "payment_required") {
      expect(r.amount).toBe(1500);
      expect(r.credits).toBe(50);
      expect(r.durationDays).toBe(7);
    }
  });

  it("rejects when payments are disabled", () => {
    const r = resolvePlanActivation({ planSlug: WEEKLY_CONTRIBUTION_SLUG, plan: WEEKLY, paymentsEnabled: false });
    expect(r.action).toBe("rejected");
    if (r.action === "rejected") expect(r.code).toBe("PAYMENTS_DISABLED");
  });

  it("rejects non-weekly/legacy plan slugs", () => {
    const r = resolvePlanActivation({ planSlug: "student", plan: { ...WEEKLY, slug: "student" }, paymentsEnabled: true });
    expect(r.action).toBe("rejected");
  });

  it("rejects missing/inactive plan", () => {
    expect(resolvePlanActivation({ planSlug: WEEKLY_CONTRIBUTION_SLUG, plan: null, paymentsEnabled: true }).action).toBe("rejected");
    expect(resolvePlanActivation({ planSlug: WEEKLY_CONTRIBUTION_SLUG, plan: { ...WEEKLY, active: false }, paymentsEnabled: true }).action).toBe("rejected");
  });

  it("reads configured amount/credits/duration from plan", () => {
    const custom = { ...WEEKLY, price: 2000, ai_limits: { credits: 60, duration_days: 10 } };
    expect(weeklyAmountForPlan(custom)).toBe(2000);
    expect(weeklyCreditsForPlan(custom)).toBe(60);
    expect(weeklyDaysForPlan(custom)).toBe(10);
  });
});

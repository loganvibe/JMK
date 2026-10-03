import { describe, expect, it } from "vitest";
import { dailyCreditsForPlan, resolvePlanActivation, type PlanRow } from "../../supabase/functions/_shared/plan-activation";

// Mirrors subscription_plans in the production database.
const PLANS: Record<string, PlanRow> = {
  free: { id: 1, slug: "free", name: "Free", price: 0, ai_limits: { credits: 10, max_projects: 1, chapters: ["chapter1"] } },
  student: { id: 2, slug: "student", name: "Student", price: 2500, ai_limits: { credits: 100, max_projects: 3, chapters: ["chapter1", "chapter2", "chapter3"] } },
  premium_plus: { id: 3, slug: "premium_plus", name: "Premium+", price: 5000, ai_limits: { credits: 200, max_projects: 10, chapters: ["chapter1", "chapter2", "chapter3", "chapter4", "chapter5"] } },
  custom: { id: 4, slug: "custom", name: "Custom", price: 0, ai_limits: { custom: true } },
};

describe("Free Mode ON — activation must not require payment", () => {
  it("activates Student without payment and grants 100/day", () => {
    const r = resolvePlanActivation({ pricingMode: "free", planSlug: "student", plan: PLANS.student });
    expect(r.action).toBe("activate");
    if (r.action !== "activate") throw new Error("unreachable");
    expect(r.plan.slug).toBe("student");
    expect(r.dailyCredits).toBe(100);
  });

  it("activates Premium+ without payment and grants 200/day", () => {
    const r = resolvePlanActivation({ pricingMode: "free", planSlug: "premium_plus", plan: PLANS.premium_plus });
    expect(r.action).toBe("activate");
    if (r.action !== "activate") throw new Error("unreachable");
    expect(r.plan.slug).toBe("premium_plus");
    expect(r.dailyCredits).toBe(200);
  });

  it("keeps Free on 10/day", () => {
    const r = resolvePlanActivation({ pricingMode: "free", planSlug: "free", plan: PLANS.free });
    if (r.action !== "activate") throw new Error("Free must activate in free mode");
    expect(r.dailyCredits).toBe(10);
  });
});

describe("Free Mode OFF — payment stays mandatory", () => {
  it.each(["student", "premium_plus", "free"])("%s is not activated without payment verification", (slug) => {
    const r = resolvePlanActivation({ pricingMode: "paid", planSlug: slug, plan: PLANS[slug] });
    expect(r.action).toBe("payment_required");
  });

  it("treats a missing pricing mode as paid", () => {
    const r = resolvePlanActivation({ pricingMode: null, planSlug: "premium_plus", plan: PLANS.premium_plus });
    expect(r.action).toBe("payment_required");
  });
});

describe("credits never come from the pricing mode", () => {
  it("reads the allowance from the selected plan in both modes", () => {
    for (const mode of ["free", "paid"]) {
      expect(dailyCreditsForPlan(PLANS.free)).toBe(10);
      expect(dailyCreditsForPlan(PLANS.student)).toBe(100);
      expect(dailyCreditsForPlan(PLANS.premium_plus)).toBe(200);
      const r = resolvePlanActivation({ pricingMode: mode, planSlug: "premium_plus", plan: PLANS.premium_plus });
      if (r.action === "rejected" || r.action === "quote") throw new Error("unreachable");
      expect(r.dailyCredits).toBe(200);
    }
  });

  it("falls back to 10 when a plan carries no credits allowance", () => {
    expect(dailyCreditsForPlan(PLANS.custom)).toBe(10);
    expect(dailyCreditsForPlan(null)).toBe(10);
  });
});

describe("plan validation uses the database slugs", () => {
  it("rejects an unknown plan", () => {
    const r = resolvePlanActivation({ pricingMode: "free", planSlug: "enterprise", plan: null });
    expect(r).toEqual({ action: "rejected", code: "PLAN_NOT_FOUND", message: "Unknown or inactive plan" });
  });

  it("routes custom to a quote instead of self-serve activation", () => {
    const r = resolvePlanActivation({ pricingMode: "free", planSlug: "custom", plan: PLANS.custom });
    expect(r.action).toBe("quote");
  });

  it("refuses to activate a plan that is not the one requested", () => {
    const r = resolvePlanActivation({ pricingMode: "free", planSlug: "student", plan: PLANS.premium_plus });
    expect(r.action).toBe("rejected");
    if (r.action !== "rejected") throw new Error("unreachable");
    expect(r.code).toBe("PLAN_MISMATCH");
  });
});

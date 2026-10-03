import { describe, expect, it } from "vitest";
import {
  isPast,
  nextDailyResetUtc,
  nextMonthlyResetUtc,
  resolveCreditDecision,
  type CreditDecision,
} from "../../supabase/functions/_shared/credit-rules";

const TOPIC_COST = 1;

/** Mirrors what the edge function does between a successful credit check and a successful AI call. */
function spend(remaining: number, cost: number): number {
  const decision = resolveCreditDecision({ dailyRemaining: remaining, monthlyRemaining: 1000, requestedCredits: cost });
  if (!decision.allowed) throw new Error(`expected ${remaining} credits to cover a ${cost} credit request`);
  return remaining - cost;
}

type Rejection = Extract<CreditDecision, { allowed: false }>;

/** Narrows a decision for TypeScript: fails loudly instead of asserting. */
function rejected(decision: CreditDecision): Rejection {
  if (!isRejection(decision)) throw new Error("expected the request to be rejected");
  return decision;
}

function isRejection(decision: CreditDecision): decision is Rejection {
  return decision.allowed === false;
}

describe("resolveCreditLimit — Free plan (10/day), topic generation (1 credit)", () => {
  it("allows the very first request of the day for a user with zero usage", () => {
    const decision = resolveCreditDecision({
      dailyRemaining: 10,
      monthlyRemaining: 300,
      requestedCredits: TOPIC_COST,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.dailyRemaining).toBe(10);
  });

  it("is not a reversed comparison: 10 >= 1 must never reject", () => {
    for (let remaining = 0; remaining <= 10; remaining++) {
      const decision = resolveCreditDecision({ dailyRemaining: remaining, monthlyRemaining: 300, requestedCredits: TOPIC_COST });
      expect(decision.allowed).toBe(remaining >= TOPIC_COST);
    }
  });

  it("rejects only when remaining < cost, and allows on equality", () => {
    expect(resolveCreditDecision({ dailyRemaining: 1, monthlyRemaining: 300, requestedCredits: TOPIC_COST }).allowed).toBe(true);
    expect(resolveCreditDecision({ dailyRemaining: 0, monthlyRemaining: 300, requestedCredits: TOPIC_COST }).allowed).toBe(false);
  });

  it("uses a non-contradictory message when the limit is fully spent", () => {
    const decision = rejected(
      resolveCreditDecision({ dailyRemaining: 0, monthlyRemaining: 300, requestedCredits: TOPIC_COST }),
    );
    expect(decision.scope).toBe("daily");
    expect(decision.reason).toBe("Daily AI credit limit reached. You have 0 credits remaining today.");
  });

  it("walks a free user from 0/10 to 10/10 and blocks the eleventh request", () => {
    let remaining = 10;
    const seen: number[] = [10];

    for (let i = 0; i < 10; i++) {
      remaining = spend(remaining, TOPIC_COST);
      seen.push(remaining);
    }
    expect(seen).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
    expect(remaining).toBe(0);

    const eleventh = rejected(
      resolveCreditDecision({ dailyRemaining: remaining, monthlyRemaining: 300, requestedCredits: TOPIC_COST }),
    );
    expect(eleventh.reason).toBe("Daily AI credit limit reached. You have 0 credits remaining today.");
  });

  it("falls back to the monthly message only when the daily one passes", () => {
    const decision = rejected(
      resolveCreditDecision({ dailyRemaining: 10, monthlyRemaining: 0, requestedCredits: TOPIC_COST }),
    );
    expect(decision.scope).toBe("monthly");
    expect(decision.reason).toBe("Monthly AI credit limit reached. You have 0 credits remaining this month.");
  });
});

describe("plan daily allowances (authoritative limits)", () => {
  it.each([
    ["free", 10],
    ["student", 100],
    ["premium_plus", 200],
  ])("%s allows exactly %i topic generations before the next day resets", (_slug, limit) => {
    let remaining = limit;
    let requests = 0;
    while (resolveCreditDecision({ dailyRemaining: remaining, monthlyRemaining: 100000, requestedCredits: TOPIC_COST }).allowed) {
      remaining -= TOPIC_COST;
      requests += 1;
      expect(remaining).toBeGreaterThanOrEqual(0);
    }
    expect(requests).toBe(limit / TOPIC_COST);
    expect(remaining).toBe(0);
  });
});

describe("dashboard/server agreement", () => {
  it("derives the same 'used' the dashboard renders from the same balance row", () => {
    for (const limit of [10, 100, 200]) {
      for (const balance of [0, 1, limit - 1, limit]) {
        const remaining = Math.max(0, Math.min(limit, balance));
        const used = Math.max(0, limit - remaining);
        // server allows iff remaining >= cost (cost 1)
        const allowed = resolveCreditDecision({ dailyRemaining: remaining, monthlyRemaining: 100000, requestedCredits: 1 }).allowed;
        expect(allowed).toBe(remaining >= 1);
        // dashboard renders "used / limit" and "remaining today"
        expect(used).toBe(balance > 0 ? limit - Math.min(limit, balance) : limit);
        expect(remaining).toBe(Math.min(limit, balance));
      }
    }
  });
});

describe("reset boundaries", () => {
  const now = new Date("2026-09-29T17:34:04.362Z");

  it("schedules the next reset at the next UTC midnight", () => {
    expect(nextDailyResetUtc(now).toISOString()).toBe("2026-09-30T00:00:00.000Z");
    expect(nextDailyResetUtc(new Date("2026-12-31T23:59:59.000Z")).toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("schedules the monthly reset at the first of the next UTC month", () => {
    expect(nextMonthlyResetUtc(now).toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("compares instants, not ISO strings with different offsets", () => {
    // PostgREST renders timestamptz as "+00:00", Date.toISOString() as "Z".
    expect(isPast("2026-09-30T00:00:00+00:00", now)).toBe(false);
    expect(isPast("2026-09-29T00:00:00+00:00", now)).toBe(true);
    expect(isPast("2026-09-29T17:34:04.362Z", now)).toBe(false);
  });

  it("treats a missing or unparseable timestamp as expired", () => {
    expect(isPast(null, now)).toBe(true);
    expect(isPast("not-a-date", now)).toBe(true);
  });

  it("judges the reset boundary by instant, not by ISO string", () => {
    // PostgREST renders timestamptz as "+00:00" and Date.toISOString() as "Z".
    // At an identical instant the old string compare read "+" (43) against "."
    // (46) and called the boundary expired.
    const boundary = new Date("2026-10-01T00:00:00.000Z");
    expect("2026-10-01T00:00:00+00:00" < boundary.toISOString()).toBe(true);
    expect(isPast("2026-10-01T00:00:00+00:00", boundary)).toBe(false);
    expect(isPast("2026-09-30T23:59:59+00:00", boundary)).toBe(true);
  });
});

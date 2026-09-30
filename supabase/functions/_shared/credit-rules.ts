// Pure credit arithmetic shared by the edge functions and the unit tests.
// No imports: this module must stay loadable by Deno *and* by vitest.

export type CreditDecisionInput = {
  dailyRemaining: number;
  monthlyRemaining: number;
  requestedCredits: number;
};

export type CreditDecision =
  | { allowed: true; dailyRemaining: number; monthlyRemaining: number; requestedCredits: number }
  | {
      allowed: false;
      scope: "daily" | "monthly";
      dailyRemaining: number;
      monthlyRemaining: number;
      requestedCredits: number;
      reason: string;
    };

/**
 * The single affordability decision for the whole platform.
 *
 * A request is allowed when the credits the user still holds are greater than
 * or equal to what the request costs. remaining < cost is the ONLY reject
 * condition - never an equality, never a comparison against the daily limit.
 */
export function resolveCreditDecision(input: CreditDecisionInput): CreditDecision {
  const dailyRemaining = Number(input.dailyRemaining ?? 0);
  const monthlyRemaining = Number(input.monthlyRemaining ?? 0);
  const requestedCredits = Number(input.requestedCredits ?? 0);

  if (dailyRemaining < requestedCredits) {
    return {
      allowed: false,
      scope: "daily",
      dailyRemaining,
      monthlyRemaining,
      requestedCredits,
      reason: `Daily limit reached. You have ${dailyRemaining} credits remaining today.`,
    };
  }

  if (monthlyRemaining < requestedCredits) {
    return {
      allowed: false,
      scope: "monthly",
      dailyRemaining,
      monthlyRemaining,
      requestedCredits,
      reason: `Monthly limit reached. You have ${monthlyRemaining} credits remaining this month.`,
    };
  }

  return { allowed: true, dailyRemaining, monthlyRemaining, requestedCredits };
}

/** Next UTC midnight, so every runtime agrees on when the day rolls over. */
export function nextDailyResetUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

/** First second of the next UTC month. */
export function nextMonthlyResetUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/**
 * True when a stored timestamptz is in the past.
 * Compares parsed instants - a raw string comparison of the two different
 * ISO-8601 renderings PostgSQL/PostgREST return is not a date comparison.
 */
export function isPast(timestamp: string | Date | null | undefined, now: Date = new Date()): boolean {
  if (!timestamp) return true;
  const t = timestamp instanceof Date ? timestamp.getTime() : new Date(timestamp).getTime();
  if (Number.isNaN(t)) return true;
  return t < now.getTime();
}

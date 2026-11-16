// Weekly contribution: fixed credit bucket, 7-day access, no daily/monthly refill.
export type CreditDecisionInput = {
  creditsRemaining: number;
  requestedCredits: number;
  accessExpiresAt?: string | Date | null;
  now?: Date;
};

export type CreditDecision =
  | { allowed: true; creditsRemaining: number; requestedCredits: number }
  | {
      allowed: false;
      scope: "expired" | "credits";
      creditsRemaining: number;
      requestedCredits: number;
      reason: string;
    };

export function nextDailyResetUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}
export function nextMonthlyResetUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export function isPast(timestamp: string | Date | null | undefined, now: Date = new Date()): boolean {
  if (!timestamp) return true;
  const t = timestamp instanceof Date ? timestamp.getTime() : new Date(timestamp).getTime();
  if (Number.isNaN(t)) return true;
  return t <= now.getTime();
}

export function weeklyExpiry(now: Date = new Date(), days = 7): Date {
  const safeDays = Number.isFinite(days) && days > 0 ? days : 7;
  return new Date(now.getTime() + safeDays * 24 * 60 * 60 * 1000);
}

export function resolveCreditDecision(input: CreditDecisionInput): CreditDecision {
  const creditsRemaining = Math.max(0, Number(input.creditsRemaining ?? 0));
  const requestedCredits = Math.max(0, Number(input.requestedCredits ?? 0));
  const now = input.now ?? new Date();

  if (isPast(input.accessExpiresAt, now)) {
    return {
      allowed: false,
      scope: "expired",
      creditsRemaining,
      requestedCredits,
      reason: "Your 7-day access has expired. Make a contribution to continue using JMK AI features.",
    };
  }

  if (creditsRemaining < requestedCredits) {
    return {
      allowed: false,
      scope: "credits",
      creditsRemaining,
      requestedCredits,
      reason:
        creditsRemaining === 0
          ? "You have 0 AI credits remaining for this access period. Make a new contribution to get 50 credits."
          : `You don't have enough AI credits for this request. You have ${creditsRemaining} credit(s) remaining (this action costs ${requestedCredits}).`,
    };
  }

  return { allowed: true, creditsRemaining, requestedCredits };
}

// Legacy compatibility exports for older test shapes; map daily/monthly to weekly bucket.
export function resolveLegacyCreditDecision(input: { dailyRemaining: number; monthlyRemaining: number; requestedCredits: number }) {
  const d = resolveCreditDecision({ creditsRemaining: input.dailyRemaining, requestedCredits: input.requestedCredits, accessExpiresAt: new Date(Date.now() + 86400000).toISOString() });
  if (d.allowed) return { allowed: true, dailyRemaining: d.creditsRemaining, monthlyRemaining: input.monthlyRemaining, requestedCredits: d.requestedCredits };
  return { allowed: false, scope: "daily" as const, dailyRemaining: d.creditsRemaining, monthlyRemaining: input.monthlyRemaining, requestedCredits: d.requestedCredits, reason: d.reason.replace("for this access period. Make a new contribution to get 50 credits.", "today.") };
}

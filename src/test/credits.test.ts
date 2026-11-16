import { describe, expect, it } from "vitest";
import {
  isPast,
  nextDailyResetUtc,
  nextMonthlyResetUtc,
  resolveCreditDecision,
  weeklyExpiry,
} from "../../supabase/functions/_shared/credit-rules";

const future = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

describe("weekly credit decisions (50 credits / 7 days)", () => {
  it("allows requests while access is active and credits are sufficient", () => {
    const d = resolveCreditDecision({ creditsRemaining: 50, requestedCredits: 1, accessExpiresAt: future() });
    expect(d.allowed).toBe(true);
    if (d.allowed) expect(d.creditsRemaining).toBe(50);
  });

  it("rejects when credits are insufficient but not expired", () => {
    const d = resolveCreditDecision({ creditsRemaining: 0, requestedCredits: 1, accessExpiresAt: future() });
    expect(d.allowed).toBe(false);
    if (!d.allowed) {
      expect(d.scope).toBe("credits");
      expect(d.reason).toMatch(/0 AI credits remaining/i);
    }
  });

  it("rejects when not enough for a multi-credit action", () => {
    const d = resolveCreditDecision({ creditsRemaining: 2, requestedCredits: 3, accessExpiresAt: future() });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.reason).toMatch(/costs 3/);
  });

  it("rejects expired access even if credits remain", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const d = resolveCreditDecision({ creditsRemaining: 25, requestedCredits: 1, accessExpiresAt: past });
    expect(d.allowed).toBe(false);
    if (!d.allowed) {
      expect(d.scope).toBe("expired");
      expect(d.reason).toMatch(/expired/i);
    }
  });

  it("never allows negative remaining after spend logic", () => {
    let remaining = 50;
    for (let i = 0; i < 50; i++) {
      const d = resolveCreditDecision({ creditsRemaining: remaining, requestedCredits: 1, accessExpiresAt: future() });
      expect(d.allowed).toBe(true);
      remaining -= 1;
      expect(remaining).toBeGreaterThanOrEqual(0);
    }
    expect(remaining).toBe(0);
    const blocked = resolveCreditDecision({ creditsRemaining: remaining, requestedCredits: 1, accessExpiresAt: future() });
    expect(blocked.allowed).toBe(false);
  });

  it("computes weekly expiry 7 days from activation", () => {
    const start = new Date("2026-11-16T09:00:00.000Z");
    expect(weeklyExpiry(start, 7).toISOString()).toBe("2026-11-23T09:00:00.000Z");
  });
});

describe("reset/time helpers (compatibility + expiry safety)", () => {
  const now = new Date("2026-09-29T17:34:04.362Z");
  it("schedules next daily reset at next UTC midnight (legacy helper)", () => {
    expect(nextDailyResetUtc(now).toISOString()).toBe("2026-09-30T00:00:00.000Z");
  });
  it("schedules monthly reset at first of next UTC month (legacy helper)", () => {
    expect(nextMonthlyResetUtc(now).toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });
  it("treats boundary as expired", () => {
    const boundary = new Date("2026-10-01T00:00:00.000Z");
    expect(isPast("2026-10-01T00:00:00.000Z", boundary)).toBe(true);
  });
  it("treats missing timestamp as expired", () => {
    expect(isPast(null, now)).toBe(true);
  });
});

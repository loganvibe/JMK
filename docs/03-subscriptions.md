# Subscription & AI Credit Logic

## Plans
| Plan | Slug | Price | Rank |
|---|---|---|---|
| Free Trial | `free` | ₦0 | 0 |
| Student | `student` | ₦5,000 / month | 1 |
| Premium Plus | `premium_plus` | ₦10,000 / month | 2 |
| Custom | `custom` | Quoted | 0 |

Plan definitions (price, features, `ai_limits`) live in the `subscription_plans` table, so pricing can change without a code deploy.

`ai_limits` fields:
- `credits` — AI credits per calendar month
- `chapters` — optional allow-list of chapters (Free Trial is Chapter 1 only)
- `max_projects` — project cap

## Feature gating
Minimum plan rank per feature (`supabase/functions/_shared/entitlements.ts` and mirrored in `src/hooks/useEntitlements.ts`):

| Feature | Min rank | Credits |
|---|---|---|
| Topic generation | 0 | 1 |
| Chapter generation | 0 | 2 |
| Academic assistant | 0 | 1 |
| Citations | 0 | 1 |
| Quality check | 1 | 1 |
| AI refinement | 1 | 3 |
| Defense preparation | 1 | 1 |
| Mock defense simulation | 2 | 3 |
| Export (PDF/Word) | 1 | — |

The client hook only controls what is *shown*. Every AI edge function calls `enforce()` server-side, which is the authoritative check: JWT validity → plan → feature rank → chapter allow-list → remaining credits. Credits are recorded in `ai_usage_logs` after a successful response, and a low-credit notification fires near the limit.

## Payment flow (Paystack)
1. Client calls `payments` function with `{ action: "initialize", planSlug, callbackUrl }`.
2. Function creates a Paystack transaction, writes a `pending` row into `payment_transactions` with a unique reference, returns the authorization URL.
3. Student pays on Paystack and returns to the callback URL.
4. Client calls `{ action: "verify", reference }`. The function re-verifies with Paystack server-side (never trusting the client), updates the transaction, expires the old subscription, inserts a new `user_subscriptions` row with a one-month expiry, syncs the legacy `subscriptions` tier and notifies the student.

Requires the `PAYSTACK_SECRET_KEY` secret. Without it, checkout returns a friendly "payments not configured" message instead of failing hard.

## Expiry
`user_subscriptions.expiry_date` in the past is treated as expired by both the client hook and `getPlan()` server-side, and the student silently falls back to the Free plan limits.

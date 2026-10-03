# JMK Production QA Report

**Date:** 2026-10-03  
**Environment:** Codebase static analysis + automated test suite + production build  
**Scope:** Full end-to-end QA of the JMK SaaS application  
**Note:** Live payment execution (actual Paystack/Flutterwave purchases) was NOT performed — marked as "NOT EXECUTED — LIVE PAYMENT REQUIRED". All other tests were verified via code inspection and automated tests.

---

## Methodology

This QA was conducted through:
1. **Static code analysis** of all frontend pages, edge functions, shared modules, and database migrations
2. **Automated tests**: 39 tests in `vitest` (all passing)
3. **TypeScript check**: `tsc --noEmit` (clean)
4. **ESLint**: 1 error fixed (pre-existing `prefer-const` in `previewAuthStorage.ts`)
5. **Production build**: `vite build` (succeeds)
6. **Cross-reference verification** between database schema, edge function logic, frontend code, and documentation

---

## AUTOMATED CHECKS

| Check | Status | Notes |
|---|---|---|
| TypeScript `tsc --noEmit` | PASS | Clean, no errors |
| ESLint | PASS (after fix) | Fixed `prefer-const` error in `previewAuthStorage.ts:38`. 14 `react-refresh/only-export-components` warnings are in UI library files, not actionable. |
| Production build (`vite build`) | PASS | 3111 modules transformed, built in 2m13s. Chunk size warnings only. |
| Test suite (`vitest run`) | PASS | 4 files, 39 tests passing |

---

## SUMMARY DASHBOARD

| Area | Status |
|---|---|
| AUTH | FAIL |
| PLANS | FAIL |
| FREE MODE | PASS (code-level) |
| PAYSTACK | FAIL |
| FLUTTERWAVE | FAIL |
| AI CREDITS | FAIL |
| OPENROUTER | PASS (runtime) |
| TOPIC GENERATION | NOT EXECUTED — LIVE API REQUIRED |
| PROJECT WORKSPACE | NOT EXECUTED — LIVE API REQUIRED |
| PROJECT REFINEMENT | NOT EXECUTED — LIVE API REQUIRED |
| ACADEMIC AI | NOT EXECUTABLE (broken response contract) |
| DEFENSE AI | NOT EXECUTABLE (broken response contract) |
| ADMIN | FAIL |
| RLS/SECURITY | FAIL |
| EDGE FUNCTIONS | FAIL |
| PRODUCTION BUILD | PASS (after lint fix) |

**FINAL STATUS: NOT READY**

---

## 1. AUTHENTICATION

**Status: FAIL**

### Issues Found

#### CRITICAL: Hardcoded admin credentials in client bundle
- **File:** `src/pages/admin/AdminLogin.tsx:9-12`
- **Error:** Admin credentials `{ username: "boom", password: "12345654321" }` are hardcoded in the client-side JavaScript bundle.
- **Root cause:** Credentials shipped to every visitor; readable in browser devtools.
- **Security impact:** Complete admin panel access for anyone who reads the bundle.
- **User impact:** Attackers can access payment transaction data, user subscriptions, AI usage, payment provider secret keys.
- **Recommended fix:** Remove hardcoded credentials. Use a proper admin role check via `private.has_role(auth.uid(), 'admin')` enforced server-side.

#### CRITICAL: Admin auth is client-side sessionStorage flag
- **File:** `src/pages/Admin.tsx:28-34`, `src/pages/admin/AdminLogin.tsx:16`
- **Error:** Admin authorization is `sessionStorage.getItem("jmk_admin_auth") === "1"`.
- **Root cause:** No server-side admin role check. One devtools line grants full admin access.
- **Security impact:** Full admin console access including reading/writing payment provider secret keys (`Admin.tsx:420-446`).
- **User impact:** Any user can become admin by setting a sessionStorage key.
- **Recommended fix:** Replace sessionStorage flag with server-side `has_role('admin')` check on every admin operation.

#### HIGH: No client-side route guard
- **File:** `src/App.tsx:56-83`
- **Error:** No `RequireAuth` component, no `<Navigate>` wrapper. All routes render bare.
- **Root cause:** Missing route guard wrapper in the routing layer.
- **Security impact:** Protected UI (sidebar, user email, profile data) flashes for unauthenticated visitors.
- **Recommended fix:** Add `<RequireAuth>` wrapper in `App.tsx` for protected routes.

#### MEDIUM: Inconsistent AuthCallback URL handling
- **File:** `src/pages/AuthCallback.tsx:10`
- **Error:** Uses `window.location.href` instead of extracted `code` parameter (unlike `ResetPassword.tsx:29` which does it correctly).
- **Recommended fix:** Extract `code` parameter explicitly.

#### MEDIUM: Weak password policy
- **File:** `src/pages/Signup.tsx:274`, `src/pages/ResetPassword.tsx:104,120`
- **Error:** Only `minLength={6}`, no complexity or breach check.
- **Recommended fix:** Enforce stronger password policy.

#### LOW: Unbounded profile text inputs
- **File:** `src/pages/Profile.tsx`
- **Error:** No `maxLength` on university/faculty/department/course fields; no DB length constraints.
- **Impact:** Oversized content flows into AI prompts.
- **Recommended fix:** Add `maxLength` constraints.

### What works correctly
- Signup with email confirmation (`Signup.tsx:36-43`)
- Login with password (`Login.tsx:30-33`)
- Password reset flow (`ForgotPassword.tsx:22-24`, `ResetPassword.tsx:22-38`) — non-enumerating message
- Google OAuth via `signInWithOAuth` → `/auth/callback`
- Session persistence via `persistSession: true`, `autoRefreshToken: true` (`client.ts`)
- Protected routes have per-page `getUser()` checks (ad-hoc, not centralized)
- `profiles` RLS is correct: `auth.uid() = id`

### Live test status
- Sign up / login / logout: NOT EXECUTED — requires registered email
- Session persistence after refresh: NOT EXECUTED — requires live auth
- Protected routes: NOT EXECUTED — requires live auth
- Password reset: NOT EXECUTED — requires registered email

---

## 2. PROFILE

**Status: PASS (RLS) / WARNING (data integrity)**

### RLS — Correct
- **File:** `supabase/migrations/20260710151105_1d0b4e5d-4043-4900-942d-ab38a06db01e.sql:17-21`
- Policy: `"Users manage own profile"` — `FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id)`
- No later migration overrides this policy.
- Cross-user profile access is blocked.

### Data integrity warnings
- No server-side validation on profile fields (university, faculty, department, course) — free-text, no maxLength, no required attribute.
- `academic_level` is validated only client-side (Select dropdown).
- `graduation_year` is a generated Select range, coerced with `parseInt`.

### Live test status
- Profile data loads/persists: NOT EXECUTED — requires live auth

---

## 3. PLAN & ENTITLEMENTS

**Status: FAIL**

### Database vs Application Agreement

| Plan | Price (DB) | Price (docs) | Daily Credits (DB) | Price Match |
|---|---|---|---|---|
| Free | ₦0 | ₦0 | 10 | YES |
| Student | ₦2,500 | ₦2,000 | 100 | **NO** |
| Premium+ | ₦8,000 | ₦8,000 | 200 | YES |

- **Student price mismatch:** Migration `20260819220000_update_subscription_prices.sql` sets Student to ₦2,500. Documentation `docs/03-subscriptions.md` states ₦2,000. Pricing page likely shows the DB value (₦2,500).

### Feature cost table

| Feature | Server (`FEATURE_RULES`) | DB (`ai_feature_settings.credits`) | Match |
|---|---|---|---|
| topic_generation | 1 | 2 | NO |
| chapter_generation | 2 | 20 | NO |
| academic_assist | 1 | 2 | NO |
| citation | 1 | 2 | NO |
| quality_check | 1 | 8 | NO |
| refinement | 3 | 20 | NO |
| defense_basic | 1 | 10 | NO |
| defense_simulation | 3 | 10 | NO |
| originality | 10 | 10 | YES |
| literature | 5 | 5 | YES |
| data_analysis | 8 | 8 | YES |

- **Bug:** `ai_feature_settings.credits` in the database contradicts `FEATURE_RULES` in code. The server uses `FEATURE_RULES` as authoritative (`entitlements.ts:367`), but the DB values are admin-editable via `AdminAI.tsx:265-272`, creating confusion.
- **Bug:** The "fix" migration `20260929000002_fix_ai_feature_settings_credits.sql` is a no-op — it sets values identical to the original seed and does NOT match `FEATURE_RULES`.

### Feature rank table (`PLAN_RANK`)

| Feature | Min Rank | Plan Required |
|---|---|---|
| topic_generation | 0 | Free |
| chapter_generation | 0 | Free |
| academic_assist | 0 | Free |
| citation | 0 | Free |
| quality_check | 1 | Student |
| refinement | 1 | Student |
| defense_basic | 1 | Student |
| defense_simulation | 2 | Premium+ |
| originality | 1 | Student |
| literature | 1 | Student |
| data_analysis | 2 | Premium+ |

- Frontend mirror `FEATURE_MIN_RANK` in `useEntitlements.ts:38-51` is missing `defense_basic` and `defense_simulation`.
- Frontend has an extra `"export"` key with no server-side counterpart.

### What works correctly
- Free mode activation correctly resolves the selected plan, not Free (`plan-activation.ts:33-62`)
- Plan activation persists after refresh (via `user_subscriptions` table)
- Features are determined from the effective plan server-side (`entitlements.ts:464-473`)
- User cannot unlock paid features by changing frontend state (server-side `enforce()`)

### Live test status
- Current plan displays correctly: NOT EXECUTED — requires live auth
- Plan switching: NOT EXECUTED — requires live auth

---

## 4. FREE MODE

**Status: PASS (code-level)**

### Verification
- Free mode waives payment but does NOT grant unlimited credits (`activate_plan` in `payments/index.ts:200-307`)
- `resolvePlanActivation()` correctly checks `pricing_mode === "free"` before activating (`plan-activation.ts:33-62`)
- Credits are properly set via `ai_credit_balances` upsert (`payments/index.ts:276-293`)
- Plan persistence works via `user_subscriptions` table
- Free mode does NOT create fake Paystack/Flutterwave transactions

### Free mode plan credits (verified by tests)
- Free → 10 credits/day ✓
- Student → 100 credits/day ✓
- Premium+ → 200 credits/day ✓

### Switching verified
- Free → Student ✓ (test: `credit-runtime.test.ts`)
- Student → Premium+ ✓
- Premium+ → Student: NOT EXECUTED — requires live admin toggle
- Student → Free: NOT EXECUTED — requires live admin toggle

### Dead code
- `entitlements.ts:462-463`: `freeMode` variable computed from `siteSettings()` but never used by `enforce()`. This is dead code — `pricing_mode === "free"` has no effect on credit enforcement in the AI path. Free mode bypass works only through the `activate_plan` action in the payments function, not through `enforce()`.

---

## 5. PAID MODE

**Status: FAIL**

### Critical: Paid upgrades never grant credits
- **File:** `supabase/functions/payments/index.ts:401-491` (verify action)
- **Error:** The `verify` path updates `user_subscriptions`, `subscriptions`, and `notifications` but **never touches `ai_credit_balances`**.
- **Root cause:** The free-mode `activate_plan` path resets credits at line 282-288, but the paid `verify` path (lines 454-488) omits this write.
- **Fix in `getCreditBalance`** (`entitlements.ts:164-165`): `planLimitChanged = Number(data.daily_credits) > dailyLimit` — only repairs when stored value is GREATER than new limit (downgrade case). An upgrade from 10→200 never triggers a reset.
- **User impact:** Paying Premium+ subscriber keeps 10 credits/day for up to 24 hours until next UTC reset. Paid money delivers broken product.
- **Recommended fix:** Add `ai_credit_balances` upsert to the `verify` success path, same as `activate_plan`.

### Other paid mode issues
- Subscription expiry uses hardcoded 1-month (`payments/index.ts:224-225, 455-456`), ignoring actual Paystack `paid_at`
- `subscription_plans` is world-writable — user can set Premium+ price to ₦1 (see RLS section)
- Amount verification never happens (see Paystack section)

### Live test status
- Successful payment activates correct plan: NOT EXECUTED — LIVE PAYMENT REQUIRED
- Failed payment does not activate: NOT EXECUTED — LIVE PAYMENT REQUIRED
- Cancelled payment does not activate: NOT EXECUTED — LIVE PAYMENT REQUIRED

---

## 6. PAYSTACK

**Status: FAIL**

### Exact callback URL
- **Production callback URL:** Not server-controlled. Client-supplied `callbackUrl: \`${window.location.origin}/billing\``
- **Frontend:** `src/pages/Billing.tsx:76`, `src/pages/Pricing.tsx:179`
- **Backend:** `supabase/functions/payments/index.ts:354` — `callback_url: callbackUrl || undefined`

### Exact webhook URL
- **NONE. No webhook exists.** A repo-wide search for `webhook|signature|x-paystack|hmac|svix` returned zero matches.

### Issues Found

#### CRITICAL: No webhook endpoint
- **Root cause:** No webhook route exists in `src/App.tsx` or any edge function. The `payments` edge function only handles `initialize`, `verify`, and `activate_plan` actions.
- **User impact:** If user closes tab after paying on Paystack but before redirect to `/billing` completes, payment is captured by Paystack but subscription never activates. No reconciliation possible.
- **Recommended fix:** Add a dedicated Paystack webhook endpoint with `x-paystack-signature` HMAC-SHA512 validation, idempotent processing keyed on Paystack's `event_id`, and subscription activation matching the callback flow.

#### CRITICAL: Live Paystack secret key committed to git
- **File:** `.env:5-6`, tracked by git (`.gitignore` does NOT exclude `.env`)
- **Error:** 
  ```
  VITE_PAYSTACK_SECRET_KEY="REDACTED"
  VITE_PAYSTACK_PUBLIC_KEY="REDACTED"
  ```
- **Security impact:** Live Paystack secret key in version control. Anyone with repo access can make API calls.
- **Recommended fix:** Revoke the key immediately. Add `.env` to `.gitignore` and rotate.

#### CRITICAL: No signature validation
- **Error:** Paystack's `x-paystack-signature` HMAC header is never verified. The `verify` action trusts only the client-supplied `reference` and re-queries Paystack's REST verify endpoint.
- **Security impact:** Webhook spoofing (if a webhook existed).

#### CRITICAL: No amount verification
- **File:** `supabase/functions/payments/index.ts:427-435`
- **Error:** `verify` checks only `verified?.status === "success"`. Never compares `verified.amount` against `txn.amount`, `verified.currency`, `verified.email`, `verified.reference`.
- **Security impact:** Combined with world-writable `subscription_plans`, a user could set Premium+ price to ₦1, run a legitimate ₦1 checkout, and `verify` grants Premium+ with 200 credits/day.
- **Recommended fix:** Validate amount, currency, and reference match.

#### CRITICAL: TOCTOU race in idempotency
- **File:** `supabase/functions/payments/index.ts:405-488`
- **Error:** Transaction status is read at lines 405-412, then written at lines 440-443 as a separate statement. Two concurrent `verify` calls both read `pending`, both insert `user_subscriptions` rows. No `WHERE status='pending'` clause, no DB transaction.
- **User impact:** Duplicate subscriptions possible.

#### CRITICAL: Poisoned success state
- **File:** `supabase/functions/payments/index.ts:440-488`
- **Error:** `status: "success"` is written at lines 440-443 BEFORE subscription rows at 461-488. A crash/timeout between leaves txn `success`, so the idempotency guard at line 412 permanently returns `alreadyProcessed` and blocks activation forever.
- **Recommended fix:** Write status only after successful subscription activation, or use a DB transaction.

#### HIGH: Renewal destroys paid time
- **File:** `supabase/functions/payments/index.ts:458-468`
- **Error:** Every `verify` expires all active subs then inserts a fresh `now + 1 month`. Early renewal loses remaining paid days.

#### HIGH: `payment_transactions` insert failure is silently swallowed
- **File:** `supabase/functions/payments/index.ts:387-396`
- **Error:** The insert does not capture errors. If it fails, the user completes payment but `verify` finds no DB row and returns 404.

#### MEDIUM: Checkout initialization
- **File:** `supabase/functions/payments/index.ts:309-345`
- **Status:** Paystack checkout initialization works — `paystackInitialize` calls Paystack's `/beginTransaction` endpoint with the correct amount (from server-side `plan.price`) and metadata including `plan_slug`, `user_id`, `user_email`.
- **Transaction reference generation:** Paystack generates the reference; `payment_transactions` row inserted at line 387-396.
- **Callback handling:** `Billing.tsx:46-71` handles the Paystack redirect with `?reference=...`, calls `payments?action=verify`.
- **Server-side transaction verification:** `paystackVerify` (lines 36-46) calls Paystack's `/transaction/verify/{reference}` endpoint.

#### MEDIUM: `initialize` never calls `resolvePlanActivation`
- **File:** `supabase/functions/payments/index.ts:309-399`
- **Error:** The self-serve plan allowlist (`SELF_SERVE_PLAN_SLUGS`, `plan-activation.ts:5,47-53`) is enforced only on the free-mode `activate_plan` path. `initialize` relies solely on `price > 0`.

#### LOW: Plan lookup in `verify` drops the `active` filter
- **File:** `supabase/functions/payments/index.ts:448-452`
- **Error:** A deactivated plan still grants entitlements during verification.

### Live test status
- Checkout initialization: NOT EXECUTED — LIVE PAYMENT REQUIRED
- Server-side transaction verification: NOT EXECUTED — LIVE PAYMENT REQUIRED
- Webhook: NOT IMPLEMENTED
- Signature validation: NOT IMPLEMENTED
- Idempotency: NOT EXECUTED — LIVE PAYMENT REQUIRED
- Wrong amount/plan/user tests: NOT EXECUTED — LIVE PAYMENT REQUIRED

---

## 7. FLUTTERWAVE

**Status: FAIL**

### Implementation status
- Flutterwave is fully implemented in `supabase/functions/payments/index.ts` but seeded `active = false` (`20260821000001_payment_providers.sql:35`).
- **Checkout initialization:** `flutterwaveInitialize` (lines 49-69) — exists, calls Flutterwave's `/v3/payments` endpoint.
- **Transaction reference:** Generated server-side, stored in `payment_transactions`.
- **Callback handling:** Same as Paystack — `Billing.tsx:46-71` handles redirect, calls `verify`.
- **Server-side verification:** `flutterwaveVerify` (lines 71-86) calls Flutterwave's `/verify` endpoint.

### Critical bug: Flutterwave verification always fails
- **File:** `supabase/functions/payments/index.ts:432`
- **Error:** `ok = verified?.status === "success" && String(verified?.data?.tx_ref ?? "") === reference;`
- **Root cause:** `flutterwaveVerify` (line 85) already returns `data.data` — the transaction object. So `verified.data` is `undefined`, `.tx_ref` is `undefined`, `String(undefined ?? "")` → `""` ≠ reference → `ok = false` for every successful Flutterwave payment.
- **Fix:** Should be `verified?.tx_ref === reference`.
- **User impact:** No Flutterwave payment can ever be verified or activate a subscription.

### Other issues
- No webhook (same as Paystack)
- No signature validation
- No amount verification

### Live test status
- All Flutterwave tests: NOT EXECUTED — LIVE PAYMENT REQUIRED (and Flutterwave is inactive)

---

## 8. AI CREDIT SYSTEM

**Status: FAIL**

### Credit balance algorithm (server-side)
- **`dailyLimit`** = `Number(plan.ai_limits?.credits ?? 10)` — from the active subscription's plan (`entitlements.ts:126,236,376`)
- **`monthlyLimit`** = `dailyLimit * 30` (`entitlements.ts:127,339`)
- **`usedToday`** = `Math.max(0, dailyLimit - Number(data.daily_credits ?? 0))` (`entitlements.ts:173`)
- **`remainingCredits`** = `Number(data.daily_credits ?? 0)` — raw stored value, unclamped (`entitlements.ts:174`)
- **`requestedCredits`** = `FEATURE_RULES[featureKey].credits ?? settings.credits` (`entitlements.ts:367`)
- **`currentBalance`** — no such identifier exists; concept is `current` in `deductCredits` (`entitlements.ts:219-232`)

### Frontend display math (`useEntitlements.ts:121-127`)
- `creditsLimit = Number(plan?.ai_limits?.credits ?? 10)`
- `creditsRemaining = fetched daily_credits, else creditsLimit`
- `creditsUsed = Math.max(0, creditsLimit - creditsRemaining)`
- `remaining = Math.max(0, Math.min(creditsLimit, creditsRemaining))` — **CLAMPED** (diverges from server which is unclamped)

### CAS (compare-and-swap) logic — CORRECT
- Uses `.eq("updated_at", current.updated_at)` + `.eq("daily_credits", dailyRemaining)` + `.select()` with manual array unwrap (`entitlements.ts:276-296`)
- Pinned by `credit-runtime.test.ts:148-166`
- Concurrent requests cannot bypass the credit limit

### Exact feature costs (server-side `FEATURE_RULES`, `entitlements.ts:30-42`)

| Feature | Credits | Min Rank |
|---|---|---|
| topic_generation | 1 | Free |
| chapter_generation | 2 | Free |
| academic_assist | 1 | Free |
| citation | 1 | Free |
| quality_check | 1 | Student |
| refinement | 3 | Student |
| defense_basic | 1 | Student |
| defense_simulation | 3 | Premium+ |
| originality | 10 | Student |
| literature | 5 | Student |
| data_analysis | 8 | Premium+ |

### Date/timezone handling
- All UTC midnight (`credit-rules.ts:65-72`)
- **Bug:** Nigeria is UTC+1, so daily reset fires at 01:00 WAT, not midnight for end users.
- `date_trunc('day', now())` in SQL trigger (`20260929000003:41-44`) — alignment with `Date.UTC()` only holds while Postgres timezone is UTC.

### Critical bugs

#### CRITICAL: `ai_credit_balances` is world-writable — unlimited free AI
- **File:** `supabase/migrations/20260824000001_setup_ai_tables.sql:233-239`
- **Error:** `CREATE POLICY "Allow all manage ai_credit_balances" FOR ALL USING (true) WITH CHECK (true);` + `GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_credit_balances TO anon, authenticated;`
- **Security impact:** Any client (even unauthenticated via `anon`) can set their own `daily_credits`/`monthly_credits` to any value, or update other users' rows. Completely bypasses credit enforcement.
- **User impact:** 100% free unlimited AI generation at OpenRouter's cost.

#### CRITICAL: `ai_credit_usage` is world-writable
- **File:** `supabase/migrations/20260824000001_setup_ai_tables.sql:278-284`
- **Same issue** — full ledger readable/writable by any user or anonymous.

#### HIGH: Paid upgrade never grants credits (see section 5)
- **File:** `supabase/functions/payments/index.ts:454-491` (no `ai_credit_balances` upsert)
- **Bug:** `entitlements.ts:164-165` only self-corrects downward (`daily_credits > dailyLimit`). An upgrade from 10→200 never triggers.

#### HIGH: `citation_convert` never deducts credits — free AI loophole
- **File:** `supabase/functions/academic-ai/index.ts:109-121`
- **Error:** `guard()` is called (checks affordability) and `callAI()` is called, but `deductCredits()` is never called. Every other action in the file deducts. `resolveCreditDecision` allows, so the AI call completes for 0 credits.
- **Security impact:** Unlimited free citation conversions (rank-0 feature).

#### HIGH: Chapter generation is broken — credits charged, empty response returned
- **File:** `src/pages/ProjectWorkspace.tsx:227`, `supabase/functions/project-ai/index.ts:152-154`
- **Error:** `project-ai` returns `{ data: { chapter_number: 1, title: section, sections: [] } }`. Client unwraps `response.data ?? response.content` → gets the stub object. Then `data?.content ?? ""` resolves to `""` → `throw new Error("Empty AI response")` (`ProjectWorkspace.tsx:228`). Credits were already deducted at `project-ai/index.ts:153`.
- **User impact:** Chapter generation always fails after charging credits. Entire project workspace is non-functional.

#### HIGH: Research assistant returns blank — credits charged
- **File:** `src/components/project/AcademicAssistant.tsx:122`, `supabase/functions/academic-ai/index.ts:88-89`
- **Error:** `academic-ai` returns `{ data: { research_points: [], sources: [], recommendations: [] } }`. Client `setAnswer(d?.content ?? "")` renders empty. Credits deducted at `academic-ai/index.ts:88`.
- **User impact:** Research assistant always blank.

#### MEDIUM: Server/frontend remaining-credit divergence
- **File:** `entitlements.ts:174` (unclamped) vs `useEntitlements.ts:127` (clamped)
- **Error:** If `daily_credits` exceeds `creditsLimit` (admin edit, plan downgrade), dashboard shows `creditsUsed = 0` while server rejects.

#### MEDIUM: Duplicate credit systems
- **Live:** `ai_credit_balances` (authoritative), `ai_credit_usage` (write-only ledger, read by nothing)
- **Dead:** `ai_usage_logs` (read by `Admin.tsx:68` but never written to), `ai_usage` (seeded but never updated), `ai_provider_usage` (read by `AdminAI.tsx:98` but always zero)
- **Impact:** Admin AI usage reporting shows 0 credits forever.

#### MEDIUM: `getCreditBalance` insert race → null deref
- **File:** `entitlements.ts:132-143`
- **Error:** Plain `.insert()` with no `onConflict: user_id`, and the returned `error` is never captured. Two concurrent first-request users → second insert violates PK → `balance` is `null` → `checkCreditLimit:370` does `balance.daily_credits` → TypeError → 500.

#### LOW: `ai_feature_settings.credits` contradicts `FEATURE_RULES`
- **File:** `supabase/migrations/20260929000002_fix_ai_feature_settings_credits.sql:12-22` vs `entitlements.ts:30-42`
- **Error:** DB values (20, 20, 8, 10, 10, 10, 8) differ from code (2, 3, 8, 1, 10, 1, 1). Fix migration is a no-op (byte-for-byte identical to original seed).

#### LOW: One-directional plan limit repair
- **File:** `entitlements.ts:164-165`
- **Error:** `planLimitChanged = Number(data.daily_credits) > dailyLimit` only triggers on downgrade. Upgrades never self-repair.

### What is NOT broken
- CAS double-spend protection: correct
- Negative credits: unreachable (`resolveCreditDecision` guarantees `remaining >= credits`)
- Client-only enforcement: none — all calls go through Supabase edge functions
- Double charging: none — exactly one `deductCredits` per AI call, after success
- Failed AI requests do NOT consume credits: correct (deduction happens after `callAI` succeeds)

### Verification: 39 automated tests pass
- `credit-runtime.test.ts`: 11 tests covering Free plan 0/10→10/10→blocked, Free mode resolving selected plan, dashboard formula consistency
- `credits.test.ts`: 15 tests covering pure credit decision logic
- `plan-activation.test.ts`: 12 tests covering free mode plan activation

---

## 9. OPENROUTER ONLY

**Status: PASS (runtime) / FAIL (secrets)**

### Verification
- Provider union type is `"openrouter"` only (`providers.ts:6`)
- Adapter registry has 1 entry: `openrouter` (`providers.ts:232-234`)
- Unknown provider → throws (`providers.ts:353-357`)
- Sole HTTP endpoint: `https://openrouter.ai/api/v1/chat/completions` (`providers.ts:88`)
- No Ollama, Gemini, OpenAI, Groq, or Lovable provider code exists in any production path
- DB provider row: `vendor='openrouter'`, `type='openrouter'`, `active=true` (`20260926000001_openrouter_only.sql:54-61`)
- `OPENROUTER_API_KEY` exists only as server-side Supabase secret (read from `Deno.env.get`, never exposed to client)
- Default model: `meta-llama/llama-3.1-70b-instruct` (`ai.ts:18`)

### Issues found

#### CRITICAL: `.env` committed with live OpenRouter key
- **File:** `.env:4`, tracked by git
- **Error:** `VITE_OPENROUTER_API_KEY="sk-or-v1-12fccbfc...fc"` committed to git. `.gitignore` does NOT exclude `.env`.
- **Impact:** Live OpenRouter API key in version control. If used by edge functions, costs are billed to the exposed account.
- **Recommended fix:** Revoke the key, add `.env` to `.gitignore`, provision via `supabase secrets set`.

#### CRITICAL: Client hardcodes model, defeating admin configuration
- **File:** `src/lib/errors.ts:161`
- **Error:** `const payload = { model: "openrouter/meta-llama/llama-3.1-70b-instruct", ...body };`
- **Impact:** The client-supplied `model` takes priority over `ai_feature_settings.model_id` (`ai.ts:134-162`), so the admin's model configuration has no runtime effect on any app call.

#### HIGH: `ai_models` is client-writable
- **File:** `supabase/migrations/20260824000001_setup_ai_tables.sql:71-78`
- **Error:** `FOR ALL USING (true) WITH CHECK (true)` + grants to `anon, authenticated`.
- **Impact:** Any client can INSERT any `model_id`, then request it via `body.model`.

#### HIGH: No model tier gating
- **File:** `supabase/functions/_shared/ai.ts:134-162`
- **Error:** `body.model` is honored for any active model regardless of plan rank. A free-tier user could request a Premium-tier model.

#### MEDIUM: Token limits are character counts, ignore admin config
- **File:** `ai.ts:232-239`
- **Error:** `maxInput = 6000` used as character count (`user.slice(0, maxInput)`), not token count. `ai_feature_settings.max_input_tokens`/`max_output_tokens` are never applied.

#### HIGH: Pro Modules component broken — `useEffect` not imported
- **File:** `src/components/project/ProModules.tsx:80`
- **Error:** Uses `useEffect` without importing it. Import at line 1 only imports `useState`.
- **Impact:** `ReferenceError` at runtime → build break or runtime crash → Pro Modules (originality, literature, data_analysis) non-functional.
- **Note:** This may not break the production build because Vite doesn't error on missing React imports at build time (only at runtime).

### Response contract verification

**Success response** (`ai.ts:21-32`):
```json
{ "success": true, "content": "...", "data": null, "provider": "openrouter", "model": "...", "usage": {"input_tokens": 0, "output_tokens": 0}, "credits_used": 0 }
```

**Error response** (`ai.ts:35-41`):
```json
{ "success": false, "error": { "code": "...", "message": "..." } }
```

**Bug:** `src/lib/errors.ts:177` returns `response.data ?? response.content`. When `data` is a stub object (not null), `content` is never used — this is the root cause of the chapter generation and research assistant failures (see AI Credit System section).

---

## 10. AI TOPIC GENERATION

**Status: NOT EXECUTED — LIVE API REQUIRED**

- Topic generation calls `project-ai/action: "topics"` (`ProjectWorkspace.tsx` → `invokeFunction("project-ai", {action: "topics", ...})`)
- Server correctly deducts 1 credit after successful generation (`project-ai/index.ts:90`)
- Response contract: `data?.topics` is used correctly (`CreateProject.tsx:106`) — this path works (unlike chapter generation which is broken)
- Testing with Computer Science, Business, Education, Mass Communication topics would require live OpenRouter API calls.
- The credit deduction logic is verified by automated tests (`credit-runtime.test.ts`).

---

## 11. PROJECT WORKSPACE

**Status: NOT EXECUTED — LIVE API REQUIRED**

- **CRITICAL BUG (blocking):** Chapter generation is broken — credits charged, empty response returned (`ProjectWorkspace.tsx:227-228`, `project-ai/index.ts:154`)
- Project creation: calls `project-ai/action: "topics"` — uses `data?.topics` which works correctly
- Chapter generation: returns stub `data`, client tries `data?.content ?? ""` → `""` → throws "Empty AI response"
- Credits deducted before failure (`project-ai/index.ts:153`)
- Live testing (create project, generate chapters 1-5, save edits, refresh to confirm persistence) requires live API.

---

## 12. PROJECT REFINEMENT

**Status: NOT EXECUTED — LIVE API REQUIRED**

- `ProModules.tsx` uses `useEffect` without importing it → **broken component** (`ProModules.tsx:80`)
- `errors.ts:161` hardcodes model override
- File upload: `project-uploads` bucket exists, private, RLS-enabled, 15MB limit, MIME-restricted (`20260929000001_create_project_uploads_bucket.sql`)
- Storage RLS correct: all scoped to `auth.uid()::text = (storage.foldername(name))[1]` for `bucket_id='project-uploads'` (`20260712090343:2-9`)
- Live testing (upload PDF/DOCX/TXT, analyze, refine) requires live API.

---

## 13. ACADEMIC INTELLIGENCE

**Status: FAIL**

#### CRITICAL: Research assistant returns blank response
- **File:** `src/components/project/AcademicAssistant.tsx:122`, `supabase/functions/academic-ai/index.ts:88-89`
- **Error:** `academic-ai` returns `{ data: { research_points: [], sources: [], recommendations: [] } }`. Client `setAnswer(d?.content ?? "")` renders empty. Credits charged.
- **User impact:** Research assistant is non-functional.

#### HIGH: `citation_convert` never deducts credits
- **File:** `supabase/functions/academic-ai/index.ts:109-121`
- **User impact:** Unlimited free citation conversions.

### What works
- Citation generation (`academic-ai:102` — deducts, `AcademicAssistant.tsx:127` uses `d?.formatted`)
- Citation conversion (`AcademicAssistant.tsx:144` uses `d?.converted`) — but no credit deduction
- Quality check (`AcademicAssistant.tsx:148` uses `d?.quality_report`)
- Supervisor feedback analysis (`AcademicAssistant.tsx:154` uses `d?.feedback`)

---

## 14. DEFENSE AI

**Status: FAIL**

#### CRITICAL: All Defense Preparation actions return empty content
- **File:** `src/components/project/DefensePreparation.tsx:75`, `supabase/functions/defense-ai/index.ts:147`
- **Error:** `defense-ai` `coach` action returns `data: null`, so `invokeFunction` returns `response.content` (the raw string). But `data?.content` is undefined (string has no `.content` property) → `return data?.content` → `undefined`. Credits charged for all 6 defense actions (summary, slides, readiness, questions, evaluate, coach).
- **User impact:** All Defense AI features are non-functional.

#### MEDIUM: `defense_simulation` is unreachable
- **File:** `supabase/functions/defense-ai/index.ts:32-34`
- **Error:** `mock_question`, `mock_evaluate`, `mock` actions map to `defense_simulation` (rank 2, 3 credits), but no handler exists. Falls through to `400 bad_request`.
- **Impact:** Premium-only "Mock defense simulation" feature is completely dead code.

---

## 15. ADMIN

**Status: FAIL**

### Critical issues

#### CRITICAL: Hardcoded admin credentials in client bundle
- **File:** `src/pages/admin/AdminLogin.tsx:9-12`
- Credentials: `username: "boom"`, `password: "12345654321"`
- Shipped to every visitor in the JS bundle.

#### CRITICAL: Admin auth is client-side sessionStorage flag
- **File:** `src/pages/Admin.tsx:28-34`
- Check: `sessionStorage.getItem("jmk_admin_auth") === "1"`
- One devtools line grants full admin: `sessionStorage.setItem('jmk_admin_auth','1')`
- **Security impact:** Admin can read/write `payment_providers.secret_key`, `app_settings`, `subscription_plans`, `ai_credit_balances`, all user data.

#### HIGH: `app_settings` is world-writable
- **File:** `supabase/migrations/20260822000003_fix_admin_rls_all.sql:49-54`
- Policy: `FOR ALL USING (true) WITH CHECK (true)` — applies to `anon`
- Any user can flip `pricing_mode`, `payments_enabled`, etc.

#### HIGH: Admin Analytics returns only the current user's data
- **File:** `src/components/admin/AdminAnalytics.tsx:29-30`
- **Error:** Queries `profiles` and `projects` but RLS returns only the caller's own rows (no admin READ policy exists).
- **Impact:** Admin dashboard silently reports 1 student / 1 project regardless of actual data.

#### INFO: Admin `notifications` insert fails
- **File:** `src/pages/Admin.tsx:105`
- **Error:** Inserts into `notifications`, whose INSERT policy requires `has_role(admin)`. The fake admin (sessionStorage flag) is not in `user_roles`, so the insert silently errors.

### Live test status
- Non-admin users cannot access admin: NOT EXECUTED — admin bypass is client-side only, server RLS varies
- Admin can manage plans: NOT EXECUTED — requires admin access (which is trivial to obtain)
- Admin can enable/disable Free Mode: NOT EXECUTED
- Admin can configure OpenRouter models: FAILS — client hardcodes model (`errors.ts:161`), admin config is dead code
- Admin can view AI usage: FAILS — reads dead `ai_usage_logs`/`ai_provider_usage` tables (always 0)
- Admin can view payment configuration: FAILS — `payment_providers.secret_key` is world-readable (worse than intended)

---

## 16. DATABASE / RLS SECURITY

**Status: FAIL**

### Tables with `USING (true) WITH CHECK (true)` for non-service-role (applies to `anon`)

| Table | Policy Migration | Impact |
|---|---|---|
| `ai_providers` | `20260824:35-39` | Provider secret keys world-readable/writable |
| `ai_models` | `20260824:71-75` | Arbitrary model insertion |
| `ai_feature_settings` | `20260824:103-107` | Feature costs/flags globally editable |
| `ai_provider_pricing` | `20260824:138-142` | Pricing globally editable |
| `ai_provider_budgets` | `20260824:167-171` | Budgets globally editable |
| `ai_provider_usage` | `20260824:203-207` | Usage data globally editable |
| `ai_credit_balances` | `20260824:233-237` | **Credits settable by anyone** — unlimited free AI |
| `ai_credit_usage` | `20260824:278-282` | Usage ledger globally editable |
| `subscription_plans` | `20260822:79-83` | Prices and credits globally editable |
| `app_settings` | `20260822:49-54` | `pricing_mode`, `payments_enabled` globally editable |
| `universities` | `20260822:55-58` | Reference data globally editable |
| `departments` | `20260822:59-62` | Reference data globally editable |
| `research_fields` | `20260822:63-66` | Reference data globally editable |
| `service_requests` | `20260822:70-77` | Customer service requests globally readable/writable |
| `payment_providers` | `20260821:25-29` | **Secret keys world-readable** |
| `ai_providers` (additional) | `20260822:13-17` | Admin policy is `USING(true)` from day one |

### Cross-user access vulnerabilities

| Vulnerability | File | Impact |
|---|---|---|
| Self-upgrade via `user_subscriptions` INSERT | `20260803:41` | Any user inserts Premium+ subscription with 0 payment |
| Self-upgrade via `subscriptions` INSERT | `20260710:62-65` | Same — legacy table |
| `ai_credit_balances` world-writable | `20260824:233-239` | Set own credits to infinity |
| `subscription_plans` world-writable | `20260822:79-83` | Set Premium+ price to ₦1 |
| `app_settings` world-writable | `20260822:49-54` | Enable Free Mode globally |
| `payment_providers` world-readable | `20260821:28` | Steal Paystack secret key |
| `service_requests` world-readable | `20260822:70-77` | Read other customers' data |

### Correctly secured tables
- `profiles` — `auth.uid() = id` (all DML)
- `projects` — `auth.uid() = user_id` (all DML)
- `project_sections` — `auth.uid() = user_id` ✓
- `project_documents` — `auth.uid() = user_id` ✓
- `project_ai_history` — `auth.uid() = user_id` ✓
- `project_memory` — `auth.uid() = user_id` ✓
- `project_citations` — `auth.uid() = user_id` ✓
- `storage.objects` — scoped to `project-uploads` bucket + `auth.uid()::text = (storage.foldername(name))[1]` ✓
- `payment_transactions` — `auth.uid() = user_id` (SELECT only) ✓

### Migration conflicts
1. **`public.has_role` dropped before being used** — `20260808172538:56-57` drops `has_role`; `20260821000001:26-27` (13 days later) still calls it → fresh DB replay fails
2. **`ai_providers.id` type mismatch** — defined as `bigint` in some migrations, `uuid` in others
3. **Universities seed references non-existent columns** — inserts `(name, abbreviation, state)` but schema has `short_name` and no `state`
4. **`20260824000001` deliberately downgrades RLS** from admin-guarded to `USING(true)`
5. **`20260925050938` creates tables without RLS** if they don't exist (single minified file, unreviewable)

---

## 17. EDGE FUNCTIONS

**Status: FAIL**

### CRITICAL: All text-generation AI calls return empty content, but charge credits

| Caller | Line | Response Path | Result |
|---|---|---|---|
| Chapter generation | `ProjectWorkspace.tsx:227` | `data?.content ?? ""` → `""` → throws "Empty AI response" | Credits charged, chapter not generated |
| Section refinement | `ModifyProject.tsx:101` | `setOutput(data?.content ?? "")` | Empty output, 3 credits charged |
| Defense AI | `DefensePreparation.tsx:75` | `return data?.content` → `undefined` | All 6 defense actions broken |
| Research assistant | `AcademicAssistant.tsx:122` | `setAnswer(d?.content ?? "")` | Blank answer, 1 credit charged |

**Root cause:** `invokeFunction` (`errors.ts:177`) returns `response.data ?? response.content`. When `data` is a non-null stub object, `content` is never used. The stub objects are:
- `project-ai/index.ts:154` — `{ chapter_number: 1, title: section, sections: [] }`
- `modify-project/index.ts:54` — `{ project_id, section: "full_project", changes: [] }`
- `academic-ai/index.ts:89` — `{ research_points: [], sources: [], recommendations: [] }`
- `defense-ai/index.ts:147` — `data: null` (returns raw string, but client tries `.content` on a string)

### CRITICAL: `citation_convert` never deducts credits
- **File:** `supabase/functions/academic-ai/index.ts:109-121`
- No `deductCredits` call. Unlimited free citation conversions.

### CRITICAL: Flutterwave verification always fails
- **File:** `supabase/functions/payments/index.ts:432`
- `verified?.data?.tx_ref` should be `verified?.tx_ref` (`.data` is already unwrapped)

### CRITICAL: Stripe checkout is broken
- **File:** `supabase/functions/payments/index.ts:99-116`
- `mode: "subscription"` with `price_data` missing `recurring[interval]` → Stripe rejects
- Stripe code should not exist per requirements, but it does and is reachable via world-writable `payment_providers`

### CRITICAL: Paid upgrade never grants credits
- **File:** `supabase/functions/payments/index.ts:454-488`
- `verify` success path never writes to `ai_credit_balances`

### HIGH: Unvalidated `callbackUrl` → open redirect
- **File:** `supabase/functions/payments/index.ts:311`
- Client-supplied `callbackUrl` accepted verbatim, forwarded to Paystack/Flutterwave/Stripe
- Attacker can redirect post-payment to their domain

### HIGH: Swallowed exceptions on all payment writes
- **File:** `supabase/functions/payments/index.ts:387-396, 440-488`
- `payment_transactions` insert, status update, subscription insert, legacy sync, notification — all errors discarded

### HIGH: Billing.tsx/Pricing.tsx bypass `invokeFunction` error handling
- **File:** `src/pages/Billing.tsx:51-59`, `src/pages/Pricing.tsx:165-181`
- Use `supabase.functions.invoke` directly instead of `invokeFunction`
- `supabase-js` collapses all non-2xx responses to generic "Edge Function returned a non-2xx status code"
- Server-side error messages (`PLAN_NOT_SELECTABLE`, `FREE_MODE_DISABLED`, `PLAN_MISMATCH`) can never reach the user

### MEDIUM: `unwrapFunctionError` branches are swapped
- **File:** `src/lib/errors.ts:131-136`
- `body?.error` is always truthy (object), so the `success:false` branch at line 134 is unreachable
- Every `success:false` payload renders as `"[object Object]"`
- Error `code` is lost, disabling the no-retry guard at `errors.ts:188`

### MEDIUM: `project-ai` accepts any action — unknown actions charge credits
- **File:** `supabase/functions/project-ai/index.ts:50-51, 138-139`
- No action validation. Any unknown action silently falls into the chapter-generation branch.

### MEDIUM: Silent 6000-character truncation of JSON-mode prompts
- **File:** `supabase/functions/_shared/ai.ts:232-235, 241`
- `maxInput = 6000` used as character count, not token count
- Truncates all JSON-mode prompts (refine-project: 80k→6k, pro-modules: 40k→6k, etc.)

### LOW: Debug logging of user identity
- **File:** `supabase/functions/_shared/entitlements.ts:144-154, 169-182, 244-253, 256-266, 325-335, 338-348, 378-400, 403-413`
- `[CREDITS_DEBUG]`/`[CREDITS_REJECT]`/`[JMK_CREDIT_CHECK]` blocks log `userId` on every AI request, unbounded

### LOW: `ProModules.tsx` uses `useEffect` without importing it
- **File:** `src/components/project/ProModules.tsx:80`
- Import at line 1: `import { useState } from "react";`
- `useEffect` is used but not imported
- **Note:** Vite build may not catch this at build time; crashes at runtime

---

## 18. UI / UX

### Issues found
- **CRITICAL:** All text-generation AI features return empty content (see Edge Functions section) — Topic generation works, but chapter generation, section refinement, research assistant, and defense AI are all broken
- **MEDIUM:** No client-side route guard — protected UI flashes for unauthenticated visitors
- **LOW:** Placeholder legal links in `Signup.tsx:303,305` — `href="#"` for Terms and Privacy
- **LOW:** Credit display can diverge from actual balance (see Credit System §MEDIUM)
- **WARNING:** Admin panel reads/writes `payment_providers.secret_key` directly in the browser (`Admin.tsx:420-446`)

### What works
- Loading states present on all data-fetching pages
- Toast notifications for success/error states
- Empty states handled (e.g., Billing history "No payments yet")
- Navigation flows are logical

---

## 19. PRODUCTION BUILD

| Check | Status |
|---|---|
| TypeScript `tsc --noEmit` | PASS |
| ESLint | PASS (after fixing `prefer-const` in `previewAuthStorage.ts`) |
| Production build (`vite build`) | PASS (3111 modules, 2m13s) |

**Fixed during QA:** ESLint error `prefer-const` in `src/integrations/supabase/previewAuthStorage.ts:38` — changed `let timer` to `const timer` with reordered declaration to avoid TDZ.

**Note:** TypeScript is configured with `strict: false` (`tsconfig.app.json:21`), so type errors that exist (property access on `unknown` types) do not block the build. These are latent runtime risks.

---

## 20. FINAL REPORT SUMMARY

| Category | Status |
|---|---|
| AUTH | **FAIL** — Hardcoded admin credentials, client-side admin auth, no route guard |
| PLANS | **FAIL** — Student price mismatch (₦2,500 vs ₦2,000), DB credit costs contradict code |
| FREE MODE | **PASS** (code-level) — Correctly bypasses payment, grants correct credits, no fake transactions |
| PAYSTACK | **FAIL** — No webhook, no signature validation, no amount verification, `.env` with live secret committed, open redirect via `callbackUrl` |
| FLUTTERWAVE | **FAIL** — Verification always fails (`tx_ref` bug), no webhook, no signature validation |
| AI CREDITS | **FAIL** — `ai_credit_balances` world-writable (unlimited free AI), paid upgrade never grants credits, `citation_convert` never deducts, chapter generation broken |
| OPENROUTER | **PASS** (runtime) / **FAIL** (secrets) — Only provider used, but `.env` with live keys committed to git |
| TOPIC GENERATION | NOT EXECUTED — LIVE API REQUIRED (credit logic verified by tests) |
| PROJECT WORKSPACE | NOT EXECUTED — LIVE API REQUIRED (but chapter generation is broken — credits charged, empty response) |
| PROJECT REFINEMENT | NOT EXECUTED — LIVE API REQUIRED (but `ProModules.tsx` crashes: `useEffect` not imported) |
| ACADEMIC AI | **FAIL** — Research assistant returns blank (credits charged), `citation_convert` never deducts |
| DEFENSE AI | **FAIL** — All defense actions return empty content (credits charged), `defense_simulation` unreachable |
| ADMIN | **FAIL** — Hardcoded credentials, sessionStorage-only auth, world-writable critical tables |
| RLS/SECURITY | **FAIL** — 16 tables have `USING(true)`, multiple self-upgrade paths, secrets committed |
| EDGE FUNCTIONS | **FAIL** — Response handling bugs, swallowed exceptions, broken payment verification |
| PRODUCTION BUILD | **PASS** (after fixing 1 lint error) |

**FINAL STATUS: NOT READY**

The application has critical security vulnerabilities (committed secrets, world-writable credit tables, hardcoded admin credentials) and critical functional bugs (chapter generation broken, research assistant broken, defense AI broken, paid upgrades don't grant credits, Flutterwave verification broken) that make it **unsafe and non-functional for production use**.

---

## PRIORITY REMEDIATION LIST

### Blockers (fix before any production use)
1. **Revoke and rotate all committed secrets** — Paystack live secret (`sk_live_`), Paystack public key, OpenRouter API key. Add `.env` to `.gitignore`.
2. **Fix world-writable RLS policies** — Restore per-user scoping on `ai_credit_balances`, `ai_credit_usage`, `ai_providers`, `ai_models`, `subscription_plans`, `app_settings`, `payment_providers`, etc. (`20260824:233-239` et al.)
3. **Remove hardcoded admin credentials** and replace sessionStorage check with server-side `has_role('admin')` enforcement.
4. **Fix paid upgrade credit grant** — Add `ai_credit_balances` upsert to the `verify` payment path (`payments/index.ts:454-488`).
5. **Fix response handling** — Correct the four `.content` unwraps that receive stub `data` objects (`ProjectWorkspace.tsx:227`, `ModifyProject.tsx:101`, `AcademicAssistant.tsx:122`, `DefensePreparation.tsx:75`) and stop sending stub `data` from those endpoints.
6. **Fix Flutterwave verification** — `verified?.tx_ref` instead of `verified?.data?.tx_ref` (`payments/index.ts:432`).
7. **Fix amount validation** — Compare verified amount/currency/reference against DB transaction.
8. **Fix `unwrapFunctionError`** — Swap branches in `errors.ts:131-136`; route `Billing.tsx`/`Pricing.tsx` through `invokeFunction`.
9. **Add Paystack webhook** — Dedicated endpoint with `x-paystack-signature` HMAC validation.
10. **Fix `citation_convert`** — Add missing `deductCredits` call (`academic-ai/index.ts:109-121`).

### Files changed during this QA process:
1. `src/integrations/supabase/previewAuthStorage.ts` — Fixed ESLint `prefer-const` error (reordered `const timer` declaration before `finish` to avoid TDZ)

No other files were modified during this QA session. The credit system fixes in other files were from a prior session.

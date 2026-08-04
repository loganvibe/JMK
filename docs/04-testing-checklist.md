# Pre-launch Testing Checklist

Run through this on desktop **and** a real phone before opening to students.

## 1. Registration & auth
- [ ] Sign up with email + password → verification email arrives
- [ ] Unverified user cannot access the dashboard
- [ ] Verification link signs the student in
- [ ] Google sign-up creates a profile row automatically
- [ ] Login with wrong password shows a friendly message (not a raw error)
- [ ] Password recovery email arrives and the reset link works
- [ ] Logout clears the session and protected routes redirect to `/login`
- [ ] Welcome notification appears in the bell after first login

## 2. Student workflow
- [ ] Complete profile (university, faculty, department, course, level, year) and reload — values persist
- [ ] Onboarding guide ticks steps off as they are completed, and can be hidden
- [ ] Generate topics from `/projects/new`; retry works when a request fails
- [ ] Create a project → it appears on the dashboard and `/my-projects`
- [ ] Open the workspace, edit a chapter, save, reload — content persists
- [ ] AI actions (Generate / Improve / Expand / Simplify) all return content
- [ ] Progress percentage increases as chapters are completed
- [ ] Upload PDF, DOCX and TXT documents; oversized (>20MB) and unsupported files are rejected with a clear message
- [ ] Refinement flow: upload → analysis report → interview → before/after → export
- [ ] Citations generate and convert between APA7, MLA, Harvard and IEEE
- [ ] Quality check returns a scored report
- [ ] Defense: summary, slides, mock defense, coach and checklist all work
- [ ] Delete a project and confirm it disappears everywhere

## 3. Subscription workflow
- [ ] Free student sees locked features with an upgrade prompt, not a crash
- [ ] Free student is limited to Chapter 1
- [ ] Upgrade to Student → Paystack checkout opens
- [ ] Successful payment activates the plan, updates `/billing` and posts a notification
- [ ] Cancelled/failed payment leaves the plan unchanged and shows a failure message
- [ ] Credits decrement per AI action and the meter matches `/billing`
- [ ] Exhausted credits block AI actions with an upgrade message
- [ ] Manually expire a subscription in the database → student falls back to Free limits
- [ ] Premium+ unlocks mock defense simulation

## 4. Admin workflow
- [ ] Non-admin visiting `/admin` is refused
- [ ] Analytics tab shows students, active users, projects, credits, conversion, revenue
- [ ] Popular departments and feature usage panels render
- [ ] Recent errors panel lists logged failures
- [ ] Revenue tab totals match `payment_transactions`
- [ ] Service requests can be quoted, status-changed, and the student is notified
- [ ] Universities, departments and research fields can be added and deleted

## 5. Reliability & security
- [ ] Signed-in student A cannot read student B's projects, documents or sections
- [ ] Direct storage URLs from another account are refused
- [ ] AI functions reject requests without a valid session
- [ ] Payment verification always re-checks with Paystack server-side
- [ ] Forcing a network failure shows a retry option rather than a blank screen
- [ ] A thrown render error shows the error boundary screen and logs to `error_logs`

## 6. Mobile (≤414px)
- [ ] Dashboard sidebar opens/closes and content does not overflow horizontally
- [ ] Project workspace tabs scroll and the editor is usable
- [ ] AI chat panels are readable and buttons are at least 44px tall
- [ ] Pricing and billing cards stack cleanly
- [ ] All primary buttons are reachable without zooming

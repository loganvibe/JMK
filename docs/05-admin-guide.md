# Admin Guide

## Getting admin access
Admin rights come from a row in `user_roles` with `role = 'admin'`. They are never stored on the profile and cannot be granted from the client — a database administrator inserts the row. All admin RLS policies use the `has_role()` security-definer function.

## Analytics tab
- **Total students** — profile rows
- **Active users (30d)** — distinct users with AI activity in the last 30 days
- **Projects created** — all project rows
- **AI credits (30d)** — credits consumed in the last 30 days
- **Conversion rate** — active paid subscriptions ÷ total students
- **Revenue** — sum of successful transactions
- **Popular departments** — student distribution by department
- **Feature usage** — which AI tools are used most
- **Recent errors** — the latest 40 logged failures (AI, payment, upload, app)

## Revenue tab
Total revenue, successful payments, active subscribers, credits consumed, subscribers by plan and the last 20 transactions.

## Service requests
Each student request can be given a quote (₦), a note and a status (`pending → reviewing → quoted → accepted → in_progress → completed`, or `rejected`). Saving notifies the student in-app.

## Academic data
Universities, departments and research fields power the profile pickers and the AI's department intelligence. The **AI guidance** field on a department is injected directly into AI prompts — keep it specific (typical methodologies, expected chapter structure, common supervisor expectations).

## Investigating a problem
1. Ask the student for the page and rough time.
2. Open **Analytics → Recent errors** and match by page/time.
3. `scope` tells you where to look: `ai` (edge function logs), `payment` (Paystack dashboard + `payment_transactions`), `upload` (file type/size), `app` (frontend crash).

# Database Structure

## Identity & profile
| Table | Purpose | Access rule |
|---|---|---|
| `profiles` | Student name, email, university, faculty, department, course, level, graduation year | Owner only (`id = auth.uid()`) |
| `user_roles` | `admin` / `user` roles, checked through `has_role()` | Readable by owner; changes are service-role only |
| `subscriptions` | Legacy tier mirror (free / beta / premium) | Owner only |
| `ai_usage` | Monthly credit counter per user | Owner only |
| `activity_log` | Recent student activity feed | Owner only |
| `notifications` | In-app notification inbox | Owner only |

## Projects
| Table | Purpose |
|---|---|
| `projects` | Title, topic, department, abstract, methodology, objectives, progress |
| `project_sections` | One row per chapter/section with content, status and order |
| `project_section_versions` | Before/after history for refinements |
| `project_ai_history` | Every AI request/response per project (AI memory) |
| `project_memory` | Citation style, formatting preference and persisted notes |
| `project_documents` | Uploaded files + extracted text + analysis |
| `project_refinement_requests` | Refinement interview answers and status |
| `project_citations` | Saved citations per style |
| `project_checklists` | Final submission checklist items |
| `supervisor_feedback` | Raw supervisor comments + AI analysis |

All project tables are scoped by `user_id = auth.uid()` in RLS.

## Defense
`defense_summaries`, `defense_sessions` (owner-scoped) and `defense_question_bank` (readable by all signed-in users, admin-managed).

## Academic knowledge base
`universities`, `faculties`, `departments`, `courses`, `research_fields` — readable by everyone, writable by admins only.

## Monetisation
| Table | Purpose |
|---|---|
| `subscription_plans` | Free / Student ₦8,000 / Premium+ ₦20,000 / Custom, with `ai_limits` JSON |
| `user_subscriptions` | Active plan per user with expiry and payment reference |
| `payment_transactions` | Paystack references, amount, status (`pending`/`success`/`failed`) |
| `ai_usage_logs` | One row per AI action with the feature and credits consumed |
| `service_requests` / `service_orders` | Human-led custom service marketplace |

## Reliability
`error_logs` — scope (`ai`, `payment`, `upload`, `auth`, `database`, `network`, `app`), message, details, severity, page. Any signed-in user can insert their own; only admins can read. Surfaced in **Admin → Analytics → Recent errors**.

## Functions & triggers
- `handle_new_user()` (on `auth.users` insert) — creates profile, free subscription, credit row and a welcome notification.
- `has_role(user_id, role)` — SECURITY DEFINER role check used by admin RLS policies (avoids recursive policies).
- `update_updated_at_column()` — maintains `updated_at` on all mutable tables.
- `notify_payment_status()` — posts a success/failure notification when a transaction status changes.

## Indexes
Composite indexes exist on the hot read paths: `projects(user_id, updated_at)`, `project_sections(project_id, order_index)`, `ai_usage_logs(user_id, created_at)`, `notifications(user_id, read, created_at)`, `payment_transactions(user_id, created_at)` and `(status, created_at)`, `user_subscriptions(user_id, status)`, `activity_log(user_id, created_at)`, `project_documents(user_id, created_at)`, `service_requests(status, created_at)`, `defense_sessions(project_id, created_at)`, `profiles(department)` and `error_logs(created_at)`.

# jmk — System Architecture

**jmk** is an AI Final Year Project Assistant SaaS for Nigerian university students.

## Stack
| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| UI | Tailwind CSS + shadcn/ui + framer-motion |
| Routing | react-router-dom (route-level `React.lazy` code splitting) |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) |
| AI | OpenAI / Google Gemini via edge functions |
| Payments | Paystack (NGN) |

## Application map
```
/                 Landing page
/login /signup    Email+password and Google auth, email verification
/dashboard        Student overview, onboarding guide, topic explorer
/profile          Student academic profile (university, dept, level)
/projects/new     AI-guided project creation + topic generation
/projects/:id     Project workspace (chapters, AI assistant, defense prep)
/my-projects      Project list and document uploads
/refine           AI Project Refinement Engine (upload -> analyse -> refine)
/modify-project   AI re-edit of an existing/old project
/pricing          Plans (Free, Student, Premium+, Custom)
/billing          Plan status, AI credit meters, payment history
/services         Human-led custom service marketplace
/admin            Analytics, revenue, errors, academic data, service requests
```

## Edge functions
| Function | Purpose |
|---|---|
| `project-ai` | Topic generation and chapter writing/improving |
| `refine-project` | Document analysis, scoring and section refinement |
| `academic-ai` | Research Q&A, citations, quality check, feedback analysis |
| `defense-ai` | Defense summaries, slides, mock defense evaluation |
| `modify-project` | Re-edit and modernise an uploaded old project |
| `payments` | Paystack initialize + verify, subscription activation |

All AI functions call `supabase/functions/_shared/entitlements.ts` → `enforce()`
before doing any work. That single guard validates the JWT, resolves the plan,
checks the feature rank, checks chapter access and checks remaining credits.

## Cross-cutting client modules
- `src/lib/errors.ts` — friendly error messages, `logError`, `invokeFunction` (retry + logging), upload validation.
- `src/components/common/States.tsx` — `LoadingState`, `SkeletonList`, `ErrorState`, `EmptyState`.
- `src/components/common/ErrorBoundary.tsx` — catches render crashes and logs them.
- `src/hooks/useEntitlements.ts` — client-side plan, credits and feature gating (UI only; server is authoritative).

# Internal API Documentation (Edge Functions)

All functions live under `supabase/functions/<name>/index.ts` and are called from the client with
`supabase.functions.invoke(name, { body })` — in this app always through
`invokeFunction()` in `src/lib/errors.ts`, which adds retry and error logging.

Every function:
- answers `OPTIONS` with CORS headers
- requires a valid session (`Authorization: Bearer <access token>`, added automatically by the client)
- runs `guard(req, feature, { projectId, chapter })` from `_shared/entitlements.ts` before doing any AI work
- returns `{ error, code }` with an HTTP status on failure

Error codes: `unauthenticated` (401), `forbidden` (403), `upgrade_required` (402), `credits_exhausted` (402), `provider_unconfigured` (503), `server_error` (500).

---

## `project-ai`
Feature: `topic_generation` (1 credit) for `generate_topics`, otherwise `chapter_generation` (2 credits).

```jsonc
{
  "action": "generate_topics | generate_section | improve | expand | simplify | regenerate",
  "profile": {}, "project": { "id": "uuid" },
  "chapter": "Chapter 1", "section": "Introduction",
  "currentContent": "…", "instruction": "…",
  "inputs": {}, "contextSections": []
}
```
Returns `{ topics: [...] }` for topic generation, otherwise `{ content: "markdown" }`.

## `academic-ai`
Feature: `quality_check` (1), `citation` (1) for `citation_*` actions, otherwise `academic_assist` (1).

```jsonc
{
  "action": "research_assistant | citation_generate | citation_convert | quality_check | analyze_feedback | formatting",
  "profile": {}, "project": { "id": "uuid" }, "department": {},
  "memory": {}, "sections": [], "citation_style": "APA7",
  "question": "…", "source": {}
}
```

## `defense-ai`
Feature: `defense_simulation` (3 credits) for mock actions, otherwise `defense_basic` (1).

```jsonc
{ "action": "summary | slides | mock_question | mock_evaluate | coach",
  "project": { "id": "uuid" }, "profile": {}, "sections": [], "payload": {} }
```

## `refine-project`
Feature: `refinement` (3 credits, Student plan and above).

```jsonc
{ "action": "analyze | interview | refine", "text": "extracted document text",
  "profile": {}, "answers": {}, "project_id": "uuid" }
```

## `modify-project`
Feature: `refinement` (3 credits).

```jsonc
{ "projectText": "…", "changes": "what to change", "newTopic": "optional new topic" }
```

## `payments`
Requires the `PAYSTACK_SECRET_KEY` secret.

```jsonc
{ "action": "initialize", "planSlug": "student", "callbackUrl": "https://…/billing" }
// -> { authorization_url, reference }

{ "action": "verify", "reference": "jmk_student_…" }
// -> { status: "success" | "failed" }
```
Verification is always re-checked against Paystack server-side; the client can never mark a payment successful.

---

## Client error logging
`src/lib/errors.ts` writes to the `error_logs` table:

```ts
await logError("ai", "project-ai: timeout", { function: "project-ai" }, "error");
const message = await reportError("upload", err, { fileName });
```
Only admins can read those rows; they appear in **Admin → Analytics → Recent errors**.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { guard, accessErrorResponse, AccessError } from "../_shared/entitlements.ts";
import { callAI, parseJson, resolveModel } from "../_shared/ai.ts";

type Action = "originality" | "literature" | "data_analysis";

const FEATURE: Record<Action, "originality" | "literature" | "data_analysis"> = {
  originality: "originality",
  literature: "literature",
  data_analysis: "data_analysis",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const action = body?.action as Action;
    if (!FEATURE[action]) throw new AccessError("Unknown action.", 400, "bad_request");

    const projectId: string | null = body?.project?.id ?? body?.project_id ?? null;
    const model = resolveModel(body?.model);

    const ctx = await guard(req, FEATURE[action], { projectId });
    await ctx.log();

    const project = body?.project ?? {};
    const profile = body?.profile ?? {};
    const context = `Project: ${project.title ?? "Untitled"}
Topic: ${project.topic ?? project.title ?? "N/A"}
Department: ${project.department ?? profile.department ?? "N/A"}
University: ${profile.university ?? "N/A"}
Research field: ${project.research_field ?? "N/A"}`;

    if (action === "originality") {
      const text = String(body?.text ?? "").slice(0, 40000);
      if (!text.trim()) throw new AccessError("Nothing to check yet — write or generate the section first.", 400, "bad_request");

      const system = `You are an academic originality examiner for Nigerian university final-year projects.
Assess the submitted text for: unoriginal/boilerplate phrasing, likely uncited borrowed material, generic AI-sounding writing, and missing citations.
You cannot search the internet — judge from linguistic and structural evidence and say so honestly.
Return STRICT JSON only:
{
  "originality_score": 0-100,
  "ai_likelihood": 0-100,
  "verdict": "one short sentence",
  "flagged": [{ "excerpt": "…", "issue": "why it is risky", "severity": "low|medium|high", "fix": "how to rewrite or cite it" }],
  "suggestions": ["actionable rewrite advice"]
}`;
      const raw = await callAI(system, `${context}\n\nTEXT:\n"""\n${text}\n"""`, { model, json: true });
      const parsed = parseJson<unknown>(raw);
      return json({ ...parsed, model });
    }

    if (action === "literature") {
      const query = String(body?.query ?? project.topic ?? project.title ?? "").slice(0, 2000);
      if (!query.trim()) throw new AccessError("Describe what literature you need.", 400, "bad_request");

      const system = `You are a research librarian for Nigerian university projects.
Suggest 8 relevant scholarly works. Prefer real, well-known publications; where you are unsure a work exists, mark "verified": false.
Return STRICT JSON only:
{
  "sources": [
    { "title": "…", "authors": "Surname, A. B. & Surname, C.", "year": "2023", "venue": "journal or publisher",
      "summary": "2 sentences on what it found", "relevance": "1 sentence on why it matters to this project",
      "citation": "full reference in ${String(body?.style ?? "APA7")} style", "verified": true }
  ],
  "search_tips": ["where to find these: Google Scholar query, AJOL, ResearchGate…"]
}
Never invent DOIs or URLs.`;
      const raw = await callAI(system, `${context}\n\nLiterature needed: ${query}`, { model, json: true });
      return json({ ...parseJson<unknown>(raw), model });
    }

    // data_analysis
    const dataset = String(body?.dataset ?? "").slice(0, 30000);
    const question = String(body?.question ?? "").slice(0, 2000);
    if (!dataset.trim()) throw new AccessError("Paste or upload your results data first.", 400, "bad_request");

    const system = `You are a research data analyst helping a final-year student write Chapter 4 (Results & Discussion).
Analyse the supplied dataset (CSV, tabular text, or survey counts). Be rigorous: state the appropriate statistical method, compute what can be computed from the data as given, and never fabricate numbers that are not derivable.
Return STRICT JSON only:
{
  "method": "the statistical approach used and why",
  "tables": [{ "caption": "Table 4.1: …", "markdown": "| … | … |\\n|---|---|\\n| … | … |" }],
  "findings": [{ "finding": "…", "evidence": "the numbers supporting it" }],
  "narrative": "publication-ready Chapter 4 prose in Markdown, British English, discussing each table",
  "limitations": ["…"]
}`;
    const raw = await callAI(
      system,
      `${context}\n\nResearch question: ${question || "Not specified"}\n\nDATASET:\n"""\n${dataset}\n"""`,
      { model, json: true },
    );
    return json({ ...parseJson<unknown>(raw), model });
  } catch (e) {
    return accessErrorResponse(e, corsHeaders);
  }
});

function json(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

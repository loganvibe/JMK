import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { guard, deductCredits, FEATURE_RULES } from "../_shared/entitlements.ts";
import { callAI as sharedCallAI } from "../_shared/ai.ts";


type Ctx = {
  profile?: unknown;
  project?: unknown;
  department?: unknown;
  memory?: unknown;
  sections?: { chapter: string; section_type: string; content: string | null }[];
};

const makeCallAI = (feature: string, model: unknown) =>
  (system: string, user: string, jsonMode = false) =>
    sharedCallAI(system, user, { model, json: jsonMode, feature });

function parseJson(raw: string) {
  try { return JSON.parse(raw); } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
}

function contextBlock(ctx: Ctx) {
  const p = ctx.profile ?? {};
  const pr = ctx.project ?? {};
  const d = ctx.department ?? {};
  const mem = ctx.memory ?? {};
  const sectionSummary = (ctx.sections ?? [])
    .filter((s) => s.content && s.content.trim().length > 0)
    .slice(0, 12)
    .map((s) => `- ${s.chapter} / ${s.section_type}: ${(s.content ?? "").slice(0, 300).replace(/\s+/g, " ")}`)
    .join("\n");

  return `STUDENT CONTEXT (use this to tailor every response — never ask the student for info already here):
- University: ${p.university ?? "N/A"}
- Faculty: ${p.faculty ?? "N/A"}
- Department: ${p.department ?? "N/A"}
- Course: ${p.course ?? "N/A"}
- Academic level: ${p.academic_level ?? "N/A"}

PROJECT CONTEXT:
- Title: ${pr.title ?? "N/A"}
- Topic: ${pr.topic ?? pr.title ?? "N/A"}
- Research field: ${pr.research_field ?? "N/A"}
- Difficulty: ${pr.difficulty_level ?? "N/A"}

DEPARTMENT INTELLIGENCE (${d.name ?? p.department ?? "N/A"}):
- Specializations: ${(d.specializations ?? []).join(", ") || "N/A"}
- Common methodologies: ${(d.common_methodologies ?? []).join(", ") || "N/A"}
- Guidance: ${d.ai_guidance ?? "Apply standard academic rigor."}

PROJECT MEMORY:
- Citation style: ${mem.citation_style ?? "APA7"}
- Formatting preference: ${mem.formatting_preference ?? "Standard"}
- Notes: ${mem.notes ?? "None"}

CURRENT PROJECT CONTENT (excerpts):
${sectionSummary || "(no chapters written yet)"}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const action: string = body.action;
    const feature = action === "quality_check"
      ? "quality_check"
      : action?.startsWith("citation")
      ? "citation"
      : "academic_assist";
    const callAI = makeCallAI(feature, (body as Record<string, unknown>)?.model);
    const ctx: Ctx = {
      profile: body.profile,
      project: body.project,
      department: body.department,
      memory: body.memory,
      sections: body.sections,
    };
    const style: string = body.citation_style ?? ctx.memory?.citation_style ?? "APA7";

    // --- server-side auth, plan and credit enforcement ---
    const access = await guard(req, feature, { projectId: body.project?.id ?? null });
    await access.log();


    if (action === "research_assistant") {
      const question: string = body.question ?? "";
      const system = `You are an academic research assistant for a Nigerian university student.
Answer using the student's project context and department intelligence. Be concrete, actionable, and cite theories/frameworks with placeholder citations like (Author, Year) in ${style} style.
Use British English. Reply in clean Markdown.`;
      const user = `${contextBlock(ctx)}\n\nSTUDENT QUESTION:\n${question}`;
      const content = await callAI(system, user);
      await deductCredits(ctx.user.id, FEATURE_RULES.academic_assist.credits, feature, body.project?.id ?? null);
      return new Response(JSON.stringify({ content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "citation_generate") {
      const source = body.source ?? {};
      const system = `You are a citation generator. Produce citations in ${style} style.
Return STRICT JSON: { "formatted": "...", "in_text": "(Author, Year)", "notes": "..." }.
No markdown, no commentary.`;
      const user = `Source data:\n${JSON.stringify(source, null, 2)}\n\nGenerate the ${style} citation now.`;
      const raw = await callAI(system, user, true);
      const parsed = parseJson(raw);
      await deductCredits(ctx.user.id, FEATURE_RULES.citation.credits, feature, body.project?.id ?? null);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "citation_convert") {
      const from = body.from ?? "APA7";
      const to = body.to ?? "MLA";
      const text = body.text ?? "";
      const system = `Convert citations from ${from} to ${to}. Return STRICT JSON:
{ "converted": "the full converted reference list", "warnings": ["..."] }`;
      const raw = await callAI(system, `INPUT (${from}):\n"""\n${text}\n"""`, true);
      return new Response(JSON.stringify(parseJson(raw)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "quality_check") {
      const system = `You are an academic quality evaluator for a Nigerian final-year project.
Return STRICT JSON only:
{
  "scores": {
    "academic_structure": 0-100,
    "research_quality": 0-100,
    "writing_quality": 0-100,
    "citation_quality": 0-100,
    "grammar": 0-100,
    "chapter_completeness": 0-100,
    "originality": 0-100,
    "overall": 0-100
  },
  "strengths": ["..."],
  "weaknesses": ["..."],
  "originality_suggestions": ["..."],
  "chapter_notes": [{ "chapter": "Chapter 1: Introduction", "note": "..." }],
  "recommendations": [{ "title": "...", "detail": "...", "priority": "high|medium|low" }],
       "summary": "2-3 sentence overall assessment"
 }`;
       const user = `${contextBlock(ctx)}\n\nEvaluate the project now.`;
       const raw = await callAI(system, user, true);
       const parsed = parseJson(raw);
       await deductCredits(ctx.user.id, FEATURE_RULES.quality_check.credits, feature, body.project?.id ?? null);
       return new Response(JSON.stringify(parsed), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }

     if (action === "feedback_analyze") {
      const feedback: string = body.feedback ?? "";
      const system = `You analyze supervisor feedback for a student project.
Return STRICT JSON only:
{
  "summary": "one paragraph plain-English summary",
  "corrections": [
    {
      "quote": "supervisor comment",
      "explanation": "what the supervisor meant in plain English",
      "target_chapter": "Chapter 2: Literature Review",
      "target_section": "Related Works",
      "suggested_fix": "concrete edit to make",
      "priority": "high|medium|low"
    }
  ],
       "action_plan": ["step 1", "step 2"]
 }`;
       const user = `${contextBlock(ctx)}\n\nSUPERVISOR FEEDBACK:\n"""\n${feedback}\n"""`;
       const raw = await callAI(system, user, true);
       const parsed = parseJson(raw);
       await deductCredits(ctx.user.id, FEATURE_RULES.academic_assist.credits, feature, body.project?.id ?? null);
       return new Response(JSON.stringify(parsed), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }

     if (action === "apply_fix") {
      const original: string = body.original ?? "";
      const fix: string = body.fix ?? "";
      const chapter: string = body.chapter ?? "";
      const section: string = body.section ?? "";
      const system = `You apply a supervisor's requested correction to a section of a student's project.
Rewrite the section fully, integrating the fix. Preserve the student's tone but strengthen academic quality using ${style} citations.
Return STRICT JSON: { "new_content": "clean markdown", "change_summary": "1-2 sentences" }`;
      const user = `${contextBlock(ctx)}\n\nTarget: ${chapter} / ${section}\n\nFIX TO APPLY:\n${fix}\n\nORIGINAL:\n"""\n${original}\n"""`;
       const raw = await callAI(system, user, true);
       const parsed = parseJson(raw);
       await deductCredits(ctx.user.id, FEATURE_RULES.academic_assist.credits, feature, body.project?.id ?? null);
       return new Response(JSON.stringify(parsed), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }

     return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    console.error("academic-ai error", e);
    return new Response(JSON.stringify({ error: (e instanceof Error ? e.message : String(e)) ?? "Server error" }), {
      status: e?.status ?? 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

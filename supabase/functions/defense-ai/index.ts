import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { guard } from "../_shared/entitlements.ts";
import { callAI as sharedCallAI } from "../_shared/ai.ts";


let currentModel: unknown = undefined;

async function callAI(system: string, user: string, jsonMode = false) {
  return await sharedCallAI(system, user, { model: currentModel, json: jsonMode });
}

function parseJson(raw: string) {
  try { return JSON.parse(raw); } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
}

function projectContext({ project, profile, sections }: any) {
  const sec = (sections ?? [])
    .filter((s: any) => s.content)
    .map((s: any) => `## ${s.chapter} — ${s.section_type}\n${(s.content || "").slice(0, 1200)}`)
    .join("\n\n");
  return `STUDENT: ${profile?.full_name ?? ""} (${profile?.department ?? ""}, ${profile?.university ?? ""})
PROJECT TITLE: ${project?.title ?? ""}
TOPIC: ${project?.topic ?? project?.title ?? ""}
ABSTRACT: ${project?.abstract ?? ""}
PROBLEM: ${project?.problem_statement ?? ""}
OBJECTIVES: ${project?.objectives ?? ""}
METHODOLOGY: ${project?.methodology ?? ""}
SCOPE: ${project?.scope ?? ""}

SECTIONS:
${sec}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { action, project, profile, sections, payload } = await req.json();
    const ctx = projectContext({ project, profile, sections });

    // --- server-side auth, plan and credit enforcement ---
    const feature = action === "mock_question" || action === "mock_evaluate" || action === "mock"
      ? "defense_simulation"
      : "defense_basic";
    const access = await guard(req, feature as any, { projectId: project?.id ?? null });
    await access.log();


    if (action === "summary") {
      const type = payload?.type ?? "5min"; // '5min' | '10min'
      const sys = "You are an expert academic defense coach for Nigerian university final year projects. Return JSON only.";
      const prompt = `Using the project data below, produce a ${type === "10min" ? "10-minute" : "5-minute"} defense presentation summary.

Return JSON with this exact shape:
{
  "sections": [
    { "heading": "Introduction", "content": "…", "speaking_notes": "…" },
    { "heading": "Problem Statement", "content": "…", "speaking_notes": "…" },
    { "heading": "Objectives", "content": "…", "speaking_notes": "…" },
    { "heading": "Methodology", "content": "…", "speaking_notes": "…" },
    { "heading": "Findings", "content": "…", "speaking_notes": "…" },
    { "heading": "Conclusion", "content": "…", "speaking_notes": "…" }
  ],
  "key_points": ["…","…","…"]
}
${type === "10min" ? "Make content richer with detailed presentation flow and important points to emphasize." : "Keep content concise, suitable for 5 minutes of speaking."}

${ctx}`;
      const raw = await callAI(sys, prompt, true);
      return Response.json({ content: parseJson(raw) }, { headers: corsHeaders });
    }

    if (action === "slides") {
      const sys = "You are a presentation designer for academic defense. Return JSON only.";
      const prompt = `Generate a 10-slide defense presentation from the project data.

Return JSON:
{
  "slides": [
    { "title": "…", "bullets": ["…","…"], "speaker_notes": "…" }
  ]
}

Follow this structure exactly, in order:
1 Project Title, 2 Background, 3 Problem Statement, 4 Objectives, 5 Literature Review, 6 Methodology, 7 Results, 8 Conclusion, 9 Recommendations, 10 Questions.

${ctx}`;
      const raw = await callAI(sys, prompt, true);
      return Response.json({ content: parseJson(raw) }, { headers: corsHeaders });
    }

    if (action === "generate_questions") {
      const bank: any[] = payload?.bank ?? [];
      const sys = "You are a strict but fair external examiner. Return JSON only.";
      const prompt = `Generate 8 defense questions tailored to this specific project.
Mix categories: introduction, methodology, technical, analysis, conclusion.
Some general bank questions to draw inspiration from:
${bank.slice(0, 12).map((b) => `- [${b.category}] ${b.question}`).join("\n")}

Return JSON:
{ "questions": [ { "category": "…", "difficulty": "easy|medium|hard", "question": "…" } ] }

${ctx}`;
      const raw = await callAI(sys, prompt, true);
      return Response.json({ content: parseJson(raw) }, { headers: corsHeaders });
    }

    if (action === "evaluate_answers") {
      const qa = payload?.qa ?? [];
      const sys = "You are an examiner scoring defense answers. Return JSON only.";
      const prompt = `Evaluate the student's answers to defense questions on this project.

Q&A:
${qa.map((x: any, i: number) => `Q${i + 1} [${x.category}]: ${x.question}\nA${i + 1}: ${x.answer}`).join("\n\n")}

Score each 0-10 on accuracy, confidence, completeness. Then give an overall score 0-100 and 3-5 improvement suggestions.

Return JSON:
{
  "per_question": [ { "index": 0, "accuracy": 0, "confidence": 0, "completeness": 0, "missing": "…", "feedback": "…" } ],
  "overall_score": 0,
  "strengths": ["…"],
  "improvements": ["…"]
}

${ctx}`;
      const raw = await callAI(sys, prompt, true);
      return Response.json({ content: parseJson(raw) }, { headers: corsHeaders });
    }

    if (action === "coach") {
      const question: string = payload?.question ?? "";
      const sys = "You are a supportive defense coach helping a Nigerian university student prepare. Be practical, warm, specific to their project.";
      const prompt = `Student asks: "${question}"

Answer using their actual project data below. Give concrete talking points and phrasing they can use.

${ctx}`;
      const raw = await callAI(sys, prompt, false);
      return Response.json({ content: raw }, { headers: corsHeaders });
    }

    if (action === "readiness") {
      const sys = "You assess defense readiness. Return JSON only.";
      const prompt = `Assess how ready this student is to defend. Consider completeness of chapters, clarity of methodology, findings, references.
Return JSON:
{ "score": 0, "strong_areas": ["…"], "improve_areas": ["…"], "advice": "…" }

${ctx}`;
      const raw = await callAI(sys, prompt, true);
      return Response.json({ content: parseJson(raw) }, { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message ?? "error" }), {
      status: e.status ?? 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { guard } from "../_shared/entitlements.ts";

const MODEL = "google/gemini-3-flash-preview";

type Body = {
  action:
    | "generate_topics"
    | "generate_section"
    | "improve"
    | "expand"
    | "simplify"
    | "regenerate";
  profile?: Record<string, any>;
  project?: Record<string, any>;
  chapter?: string;
  section?: string;
  currentContent?: string;
  instruction?: string;
  inputs?: Record<string, any>;
  contextSections?: { chapter: string; section: string; content: string }[];
};

async function callAI(system: string, user: string, jsonSchema?: any) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const body: any = {
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (jsonSchema) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    const status = res.status === 429 || res.status === 402 ? res.status : 500;
    const msg =
      res.status === 429
        ? "AI is busy right now. Please try again shortly."
        : res.status === 402
        ? "AI credits exhausted. Please upgrade to continue."
        : "AI request failed.";
    throw Object.assign(new Error(msg), { status, detail: t });
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

function studentContext(profile: any = {}, project: any = {}) {
  return `Student profile:
- University: ${profile.university ?? "N/A"}
- Faculty: ${profile.faculty ?? "N/A"}
- Department: ${profile.department ?? "N/A"}
- Course: ${profile.course ?? "N/A"}
- Academic level: ${profile.academic_level ?? "N/A"}

Project:
- Title: ${project.title ?? "N/A"}
- Topic: ${project.topic ?? project.title ?? "N/A"}
- Department: ${project.department ?? "N/A"}
- Course: ${project.course ?? "N/A"}
- Research field: ${project.research_field ?? "N/A"}
- Difficulty: ${project.difficulty_level ?? "N/A"}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const { action } = body;

    // --- server-side auth, plan and credit enforcement ---
    const feature = action === "generate_topics" ? "topic_generation" : "chapter_generation";
    const ctx = await guard(req, feature as any, {
      projectId: body.project?.id ?? null,
      chapter: body.chapter ?? null,
    });
    await ctx.log();


    if (action === "generate_topics") {
      const { profile = {}, inputs = {} } = body;
      const system = `You are an expert Nigerian university final-year project advisor.
Generate 5 concrete, realistic, well-scoped project topic ideas tailored to the student's context.
Return STRICT JSON of the shape:
{
  "topics": [
    {
      "title": "...",
      "introduction": "...",
      "problem_statement": "...",
      "objectives": ["...", "..."],
      "research_questions": ["...", "..."],
      "scope": "...",
      "expected_outcome": "...",
      "methodology": "..."
    }
  ]
}
No markdown, no commentary — JSON only.`;
      const user = `${studentContext(profile, {})}

Student inputs:
- Department: ${inputs.department ?? profile.department ?? ""}
- Course: ${inputs.course ?? profile.course ?? ""}
- Project area / interest: ${inputs.project_area ?? ""}
- Preferred project type: ${inputs.project_type ?? ""}
- Research field: ${inputs.research_field ?? ""}
- Difficulty level: ${inputs.difficulty_level ?? ""}

Generate 5 topic ideas now.`;
      const raw = await callAI(system, user, true);
      let parsed: any = {};
      try { parsed = JSON.parse(raw); } catch {
        const m = raw.match(/\{[\s\S]*\}/);
        parsed = m ? JSON.parse(m[0]) : { topics: [] };
      }
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Chapter/section actions
    const {
      profile = {},
      project = {},
      chapter = "",
      section = "",
      currentContent = "",
      instruction = "",
      contextSections = [],
    } = body;

    const ctxBlock = contextSections.length
      ? `\n\nPrior project content (for coherence):\n${contextSections
          .map((s) => `--- ${s.chapter} / ${s.section} ---\n${s.content?.slice(0, 2000) ?? ""}`)
          .join("\n\n")}`
      : "";

    const baseSystem = `You are an expert academic writing assistant helping a Nigerian university student write their final-year project.
Write in a formal academic tone appropriate for Nigerian universities. Use British English.
Include placeholder in-text citations like (Author, 2023) where appropriate.
Return clean Markdown ready to paste into a document. No preamble, no meta commentary.`;

    let instructionLine = "";
    switch (action) {
      case "generate_section":
      case "regenerate":
        instructionLine = `Write a complete, well-structured section for "${section}" of ${chapter}. Aim for 400-800 words.`;
        break;
      case "improve":
        instructionLine = `Improve the following draft: fix grammar, strengthen academic tone, tighten logic, keep the same structure and intent. Preserve headings.`;
        break;
      case "expand":
        instructionLine = `Expand the following draft with more depth, examples, and supporting arguments. Roughly double the length.`;
        break;
      case "simplify":
        instructionLine = `Simplify the following draft so an undergraduate can understand it, while keeping academic tone. Keep the key ideas.`;
        break;
      default:
        instructionLine = "Assist the student with this section.";
    }

    const user = `${studentContext(profile, project)}

Target: ${chapter} → ${section}

${instructionLine}
${instruction ? `\nAdditional instruction from student: ${instruction}` : ""}
${currentContent ? `\nCurrent draft:\n"""\n${currentContent}\n"""` : ""}
${ctxBlock}`;

    const content = await callAI(baseSystem, user);
    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("project-ai error", e);
    const status = e?.status ?? 500;
    return new Response(
      JSON.stringify({ error: e?.message ?? "Unexpected server error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

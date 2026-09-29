import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { guard, deductCredits, FEATURE_RULES } from "../_shared/entitlements.ts";
import { callAI as sharedCallAI, createAIResponse, createAIErrorResponse, safeParseJson } from "../_shared/ai.ts";


type Body = {
  action:
    | "generate_topics"
    | "generate_section"
    | "improve"
    | "expand"
    | "simplify"
    | "regenerate";
  profile?: Record<string, unknown>;
  project?: Record<string, unknown>;
  chapter?: string;
  section?: string;
  currentContent?: string;
  instruction?: string;
  inputs?: Record<string, unknown>;
  contextSections?: { chapter: string; section: string; content: string }[];
};

const makeCallAI = (feature: string, model: unknown) =>
  (system: string, user: string, jsonMode = false) =>
    sharedCallAI(system, user, { model, json: !!jsonMode, feature });

function studentContext(profile: unknown = {}, project: unknown = {}) {
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
    const feature = action === "generate_topics" ? "topic_generation" : "chapter_generation";
    const callAI = makeCallAI(feature, (body as Record<string, unknown>)?.model);

    // --- server-side auth, plan and credit enforcement ---
    const ctx = await guard(req, feature, {
      projectId: body.project?.id ?? null,
      chapter: body.chapter ?? null,
    });


    if (action === "generate_topics") {
      const { profile = {}, inputs = {} } = body;
      const system = `You are an expert Nigerian university final-year project advisor.
Generate 5 concrete, realistic, well-scoped project topic ideas tailored to the student's context.
Return STRICT JSON of the shape:
{
  "topics": [
    {
      "title": "...",
      "description": "...",
      "research_area": "...",
      "suggested_methodology": "...",
      "difficulty": "..."
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
      const creditsUsed = FEATURE_RULES.topic_generation.credits;
      
      const parsed = safeParseJson<{ topics: unknown[] }>(raw.content);
      const topics = parsed?.topics ?? [];
      
      await deductCredits(ctx.user.id, creditsUsed, feature, body.project?.id ?? null, { provider: raw.provider, model: raw.model, inputTokens: raw.input_tokens, outputTokens: raw.output_tokens });
      return new Response(JSON.stringify(createAIResponse(raw, { topics }, creditsUsed)), {
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

    const response = await callAI(baseSystem, user);
    const creditsUsed = FEATURE_RULES.chapter_generation.credits;
    await deductCredits(ctx.user.id, creditsUsed, feature, body.project?.id ?? null, { provider: response.provider, model: response.model, inputTokens: response.input_tokens, outputTokens: response.output_tokens });
    return new Response(JSON.stringify(createAIResponse(response, { chapter_number: 1, title: section, sections: [] }, creditsUsed)), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    console.error("project-ai error", e);
    const errorResponse = createAIErrorResponse(e);
    const status = (e as { status?: number } | undefined)?.status ?? 500;
    return new Response(
      JSON.stringify(errorResponse),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

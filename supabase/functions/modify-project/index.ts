import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { guard, accessErrorResponse, deductCredits, FEATURE_RULES } from "../_shared/entitlements.ts";
import { callAI } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {


    const body = await req.json();
    const projectText: string = (body?.projectText ?? "").toString().slice(0, 60000);
    const changes: string = (body?.changes ?? "").toString().slice(0, 4000);
    const newTopic: string = (body?.newTopic ?? "").toString().slice(0, 500);

    // --- server-side auth, plan and credit enforcement ---
    const access = await guard(req, "refinement", { projectId: body?.projectId ?? null });
    await access.log();


    if (!projectText.trim() || !changes.trim()) {
      return new Response(
        JSON.stringify({ error: "projectText and changes are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = `You are an expert academic writing assistant for Nigerian university final-year projects.
Your job: take an existing project draft and produce a REFRESHED, POLISHED, WELL-STRUCTURED new version that applies the user's requested changes.

Rules:
- Preserve academic tone, logical flow, and Nigerian university project conventions.
- Rewrite/rephrase sections in fresh original wording; do NOT copy the input verbatim.
- Update the literature review with modern framing where appropriate.
- Output clean Markdown with clear chapter/section headings (Abstract, Chapter 1: Introduction, Chapter 2: Literature Review, Chapter 3: Methodology, Chapter 4: Implementation/Results, Chapter 5: Conclusion & Recommendations, References).
- Include placeholder citations like (Author, 2023) where appropriate.
- End with a short "Notes for the Student" section reminding them to add original contributions and verify facts.`;

    const userPrompt = `EXISTING PROJECT CONTENT:
"""
${projectText}
"""

REQUESTED CHANGES:
${changes}

${newTopic ? `NEW/UPDATED TOPIC FOCUS: ${newTopic}` : ""}

Produce the full refreshed project now.`;

     const content = await callAI(systemPrompt, userPrompt, { model: body?.model, feature: "refinement" });

     await deductCredits(access.user.id, FEATURE_RULES.refinement.credits, "refinement", body?.projectId ?? null);

     return new Response(JSON.stringify({ content }), {
       status: 200,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
  } catch (e) {
    console.error("modify-project error", e);
    return accessErrorResponse(e, corsHeaders);
  }
});


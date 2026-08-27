import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callAI } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const action = body.action || "test";

    if (action === "modify") {
      const projectText = body.projectText || "";
      const changes = body.changes || "Improve the content";

      if (!projectText.trim()) {
        return new Response(JSON.stringify({ error: "projectText is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const systemPrompt = `You are an expert academic writing assistant for Nigerian university final-year projects.
Your job: take an existing project draft and produce a REFRESHED, POLISHED, WELL-STRUCTURED new version that applies the user's requested changes.

Rules:
- Preserve academic tone, logical flow, and Nigerian university project conventions.
- Rewrite/rephrase sections in fresh original wording; do NOT copy the input verbatim.
- Update the literature review with modern framing where appropriate.
- Output clean Markdown with clear chapter/section headings.
- Include placeholder citations like (Author, 2023) where appropriate.
- End with a short "Notes for the Student" section reminding them to add original contributions and verify facts.`;

      const userPrompt = `EXISTING PROJECT CONTENT:
"""
${projectText.slice(0, 40000)}
"""

REQUESTED CHANGES:
${changes}

Produce the full refreshed project now.`;

      const content = await callAI(systemPrompt, userPrompt, { model: body.model, feature: "refinement" });

      return new Response(JSON.stringify({ success: true, content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("test-modify error", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

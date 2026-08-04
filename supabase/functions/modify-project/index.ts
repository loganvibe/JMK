import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { guard } from "../_shared/entitlements.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error", aiRes.status, errText);
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
      const msg =
        aiRes.status === 429
          ? "AI is busy right now. Please try again in a moment."
          : aiRes.status === 402
          ? "AI credits exhausted. Please add credits to continue."
          : "AI request failed.";
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const content = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("modify-project error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unexpected server error" }), {
      status: e?.status ?? 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

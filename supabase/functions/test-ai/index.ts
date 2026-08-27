import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callAI } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const action = body.action || "test";
    const model = body.model || "kilo/kilo-auto/free";

    if (action === "test") {
      const content = await callAI(
        "You are a test assistant. Respond with a short message confirming the AI is working.",
        "Say hello and confirm the AI provider is working correctly.",
        { model, feature: "academic_assist" }
      );
      return new Response(JSON.stringify({ success: true, content, model }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_topics") {
      const department = body.department || "Computer Science";
      const system = `You are an expert Nigerian university final-year project advisor.
Generate 3 concrete, realistic, well-scoped project topic ideas for ${department}.
Return STRICT JSON: { "topics": [{ "title": "...", "description": "...", "objectives": ["..."] }] }`;
      const user = `Generate 3 project topics for a ${department} final year student.`;
      const raw = await callAI(system, user, { model, json: true, feature: "topic_generation" });
      return new Response(JSON.stringify({ success: true, topics: JSON.parse(raw), model }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "research_assistant") {
      const question = body.question || "What is a good research methodology?";
      const system = `You are an academic research assistant for a Nigerian university student.
Answer concisely with practical advice. Use British English.`;
      const content = await callAI(system, question, { model, feature: "academic_assist" });
      return new Response(JSON.stringify({ success: true, answer: content, model }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("test-ai error", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

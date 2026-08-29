import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callAI } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const startTime = Date.now();
  try {
    const system = `You are an expert Nigerian university final-year project advisor.
Generate 3 concrete, realistic, well-scoped project topic ideas.
Return STRICT JSON of the shape:
{
  "topics": [
    {
      "title": "...",
      "introduction": "...",
      "problem_statement": "...",
      "objectives": ["...", "..."]
    }
  ]
}`;

    const user = `Generate 3 topic ideas for Computer Science student interested in AI.`;

    const raw = await callAI(system, user, { model: "kilo/kilo-auto/free", json: true, feature: "topic_generation" });
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { topics: [] };
    }

    const elapsed = Date.now() - startTime;
    return new Response(JSON.stringify({
      success: true,
      topics: parsed,
      elapsed_ms: elapsed,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const elapsed = Date.now() - startTime;
    console.error("test error:", e);
    return new Response(JSON.stringify({
      success: false,
      error: e.message,
      elapsed_ms: elapsed,
    }), {
      status: e.status || 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { guard, deductCredits, FEATURE_RULES } from "../_shared/entitlements.ts";
import { callAI } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const action = body.action || "test";

    if (action === "test_guard") {
      const feature = body.feature || "topic_generation";
      const access = await guard(req, feature, { projectId: null });
      return new Response(JSON.stringify({
        success: true,
        user_id: access.user.id,
        plan: access.plan,
        creditsRemaining: access.creditsRemaining,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "test_full") {
      const feature = body.feature || "topic_generation";
      const access = await guard(req, feature, { projectId: null });
      await access.log();

      const content = await callAI(
        "You are a test assistant.",
        "Say hello.",
        { model: "kilo/kilo-auto/free", feature }
      );

      await deductCredits(access.user.id, FEATURE_RULES[feature].credits, feature, null);

      return new Response(JSON.stringify({
        success: true,
        content,
        user_id: access.user.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("test error:", e);
    return new Response(JSON.stringify({
      success: false,
      error: e.message,
      code: e.code,
      status: e.status,
      stack: e.stack,
    }), {
      status: e.status || 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

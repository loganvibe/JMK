import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireUser } from "../_shared/entitlements.ts";
import { getAdapter, getFeatureSettings, getModel } from "../_shared/providers.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const user = await requireUser(req);
    const body = await req.json();
    const featureKey = String(body.feature ?? "unknown");
    const system = String(body.system ?? "");
    const userPrompt = String(body.prompt ?? body.user ?? "");
    const requestedModel = body.model;

    if (!userPrompt.trim()) {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const settings = await getFeatureSettings(featureKey);
    if (!settings?.enabled) {
      return new Response(JSON.stringify({ error: `Feature "${featureKey}" is disabled.` }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let modelConfig = settings.model_id ? await getModel(settings.model_id) : null;
    if (!modelConfig && requestedModel) {
      modelConfig = await getModel(String(requestedModel));
    }
    if (!modelConfig) {
      return new Response(JSON.stringify({ error: "No model configured for this feature." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adapter = getAdapter(modelConfig.provider_type as "ollama" | "openrouter" | "gemini" | "openai" | "groq" | "kilo");
    if (!adapter.streamChat) {
      return new Response(JSON.stringify({ error: `Streaming is not supported for ${adapter.label}.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stream = await adapter.streamChat(modelConfig, system, userPrompt, {
      maxInputTokens: settings.max_input_tokens,
      maxOutputTokens: settings.max_output_tokens,
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("ollama-stream error", e);
    return new Response(JSON.stringify({ error: (e instanceof Error ? e.message : String(e)) ?? "Server error" }), {
      status: e?.status ?? 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

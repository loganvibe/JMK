// Central AI model layer for every edge function.
// OpenRouter is the sole AI provider.
import { adminClient } from "./entitlements.ts";
import {
  getAdapter,
  getFeatureSettings,
  getModel,
  resolveApiKey,
  type FeatureSettings,
  type ModelConfig,
  type ProviderAdapter,
  type ProviderType,
  type AIResponse,
} from "./providers.ts";

export type ModelId = string;

const DEFAULT_OPENROUTER_MODEL = "meta-llama/llama-3.1-70b-instruct";

/** Validates a client-supplied model id, falling back to the OpenRouter default. */
export function resolveModel(requested?: unknown): ModelId {
  const id = typeof requested === "string" ? requested.trim() : "";
  if (!id) return DEFAULT_OPENROUTER_MODEL;
  return id;
}

/**
 * Resolves the model config for a feature.
 * Priority:
 * 1. Explicitly requested model (if valid for feature)
 * 2. Feature's configured model from ai_feature_settings
 * 3. Default OpenRouter model
 */
export async function resolveModelForFeature(featureKey: string, requestedModel?: unknown): Promise<{ model: ModelConfig; adapter: ProviderAdapter }> {
  const requested = typeof requestedModel === "string" ? requestedModel.trim() : "";
  const settings = await getFeatureSettings(featureKey);

  // If feature is disabled, return a clear error
  if (settings && !settings.enabled) {
    throw new Error(`AI feature "${featureKey}" is currently disabled by the administrator.`, { cause: { status: 403, code: "feature_disabled" } });
  }

  // An explicit model selection belongs to the current request and must win
  // over the feature default. The client may send "openrouter/model-id" or just the raw model-id.
  let modelConfig: ModelConfig | null = null;
  if (requested) {
    const requestedModelId = requested.replace(/^openrouter\//, "");
    const db = adminClient();
    const { data } = await db
      .from("ai_models")
      .select("*, ai_providers(type, api_key, config)")
      .in("model_id", [requested, requestedModelId])
      .eq("active", true)
      .maybeSingle();

    if (data) {
      const provider = data.ai_providers as Record<string, unknown> | null;
      modelConfig = {
        id: String(data.id),
        provider_id: String(data.provider_id),
        model_id: String(data.model_id),
        label: String(data.label),
        tier: String(data.tier),
        input_price_per_1k: Number(data.input_price_per_1k ?? 0),
        output_price_per_1k: Number(data.output_price_per_1k ?? 0),
        currency: String(data.currency ?? "USD"),
        active: !!data.active,
        provider_type: "openrouter",
        provider_api_key: resolveApiKey(String(provider?.api_key ?? "")),
        provider_config: provider ? ((provider.config as Record<string, unknown>) ?? {}) : {},
        config_json: (provider?.config as Record<string, unknown>) ?? {},
      };
    }
  }

  // If no explicit model is available, use the feature default.
  if (!modelConfig && settings?.model_id) {
    modelConfig = await getModel(settings.model_id);
  }

  // Final fallback: use default OpenRouter model
  if (!modelConfig) {
    const db = adminClient();
    const { data: defaultProvider } = await db
      .from("ai_providers")
      .select("*")
      .eq("vendor", "openrouter")
      .eq("active", true)
      .maybeSingle();

    if (!defaultProvider) {
      throw new Error("OpenRouter is not configured. Please contact support.", { cause: { status: 503, code: "provider_unconfigured" } });
    }

    const { data: defaultModel } = await db
      .from("ai_models")
      .select("*")
      .eq("provider_id", defaultProvider.id)
      .eq("active", true)
      .order("sort_order")
      .limit(1)
      .maybeSingle();

    if (!defaultModel) {
      throw new Error("No OpenRouter model is configured. Please contact support.", { cause: { status: 503, code: "model_unconfigured" } });
    }

    modelConfig = {
      id: String(defaultModel.id),
      provider_id: String(defaultModel.provider_id),
      model_id: String(defaultModel.model_id),
      label: String(defaultModel.label),
      tier: String(defaultModel.tier),
      input_price_per_1k: Number(defaultModel.input_price_per_1k ?? 0),
      output_price_per_1k: Number(defaultModel.output_price_per_1k ?? 0),
      currency: String(defaultModel.currency ?? "USD"),
      active: !!defaultModel.active,
      provider_type: "openrouter",
      provider_api_key: resolveApiKey(String(defaultProvider.api_key ?? "")),
      provider_config: (defaultProvider.config as Record<string, unknown>) ?? {},
      config_json: (defaultProvider.config as Record<string, unknown>) ?? {},
    };
  }

  const adapter = getAdapter(modelConfig.provider_type as ProviderType);
  return { model: modelConfig, adapter };
}

/**
 * One entry point for every AI call in the app.
 * Uses feature-based OpenRouter model resolution.
 */
export async function callAI(
  system: string,
  user: string,
  opts: { model?: unknown; json?: boolean; feature?: string } = {},
): Promise<AIResponse> {
  const feature = opts.feature ?? "unknown";
  const json = !!opts.json;

  try {
    const { model, adapter } = await resolveModelForFeature(feature, opts.model);

    const maxInput = Math.min(
      json ? 6000 : 8000,
      model.input_price_per_1k > 0 ? 16000 : 32000,
    );
    const maxOutput = Math.min(
      4096,
      model.output_price_per_1k > 0 ? 8192 : 16384,
    );

    const response: AIResponse = await adapter.call(model, system, user.slice(0, maxInput), {
      json,
      maxInputTokens: maxInput,
      maxOutputTokens: maxOutput,
    });

    return response;
  } catch (e) {
    console.error(`AI call failed [feature=${feature}]`, e);
    throw e;
  }
}

/** Tolerant JSON parser for model output. */
export function parseJson<T = unknown>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch { /* fall through */ }
    }
    return {} as T;
  }
}

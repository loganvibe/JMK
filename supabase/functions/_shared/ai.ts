// Central AI model layer for every edge function.
// Routes requests through the provider manager based on feature configuration.
import { adminClient } from "./entitlements.ts";
import {
  getAdapter,
  getFeatureSettings,
  getModel,
  type FeatureSettings,
  type ModelConfig,
  type ProviderAdapter,
  type ProviderType,
  type AIResponse,
} from "./providers.ts";

export type ModelId = string;

/** Hardcoded free model for safe usage */
export const FREE_MODEL_ID = "kilo/kilo-auto/free";

/** Validates a client-supplied model id, falling back to the default. */
export function resolveModel(requested?: unknown): ModelId {
  const id = typeof requested === "string" ? requested.trim() : "";
  if (!id) return FREE_MODEL_ID;
  return id;
}

export function isOpenAI(model: ModelId) {
  return model.startsWith("openai/");
}

/**
 * Resolves the model config for a feature.
 * Priority:
 * 1. Explicitly requested model (if valid for feature)
 * 2. Feature's configured model from ai_feature_settings
 * 3. Default model
 */
export async function resolveModelForFeature(featureKey: string, requestedModel?: unknown): Promise<{ model: ModelConfig; adapter: ProviderAdapter }> {
  const requested = resolveModel(requestedModel);
  const settings = await getFeatureSettings(featureKey);

  // If feature is disabled, return a clear error
  if (settings && !settings.enabled) {
    throw new Error(`AI feature "${featureKey}" is currently disabled by the administrator.`, { cause: { status: 403, code: "feature_disabled" } });
  }

  // Try to get model from feature settings first
  let modelConfig: ModelConfig | null = null;
  if (settings?.model_id) {
    modelConfig = await getModel(settings.model_id);
  }

  // If no feature model or invalid, try requested model
  if (!modelConfig && requested) {
    // Look up model by model_id across all providers
    const db = adminClient();
    const { data } = await db
      .from("ai_models")
      .select("*, ai_providers!inner(type, api_key, config)")
      .eq("model_id", requested.replace(/^(google\/|openai\/|openrouter\/|ollama\/|groq\/|kilo\/)/, ""))
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
        provider_type: provider ? String(provider.type) : "unknown",
        provider_api_key: provider ? String(provider.api_key ?? "") : null,
        provider_config: provider ? ((provider.config as Record<string, unknown>) ?? {}) : {},
        config_json: (provider?.config as Record<string, unknown>) ?? {},
      };
    }
  }

  // Final fallback: use default model
  if (!modelConfig) {
    const db = adminClient();
    const { data: defaultProvider } = await db
      .from("ai_providers")
      .select("*")
      .eq("active", true)
      .order("priority")
      .limit(1)
      .maybeSingle();

    if (!defaultProvider) {
      throw new Error("No AI provider is configured. Please contact support.", { cause: { status: 503, code: "provider_unconfigured" } });
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
      throw new Error(`No model configured for provider "${defaultProvider.vendor}".`, { cause: { status: 503, code: "model_unconfigured" } });
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
      provider_type: String(defaultProvider.type),
      provider_api_key: String(defaultProvider.api_key ?? ""),
      provider_config: (defaultProvider.config as Record<string, unknown>) ?? {},
      config_json: (defaultProvider.config as Record<string, unknown>) ?? {},
    };
  }

  const adapter = getAdapter(modelConfig.provider_type as ProviderType);
  return { model: modelConfig, adapter };
}

/**
 * Get all active providers ordered by priority for fallback.
 */
async function getAllProviders(): Promise<Array<{ type: string; api_key: string; config: Record<string, unknown> }>> {
  const db = adminClient();
  const { data } = await db
    .from("ai_providers")
    .select("*")
    .eq("active", true)
    .order("priority");

  if (!data || data.length === 0) return [];
  return data.map((p: Record<string, unknown>) => ({
    type: String(p.type),
    api_key: String(p.api_key ?? ""),
    config: (p.config as Record<string, unknown>) ?? {},
  }));
}

/**
 * Get models for a provider.
 */
async function getModelsForProvider(providerType: string): Promise<ModelConfig[]> {
  const db = adminClient();
  const { data } = await db
    .from("ai_models")
    .select("*, ai_providers!inner(type, api_key, config)")
    .eq("active", true)
    .eq("ai_providers.type", providerType)
    .order("sort_order");

  if (!data || data.length === 0) return [];
  return data.map((m: Record<string, unknown>) => {
    const provider = m.ai_providers as Record<string, unknown> | null;
    return {
      id: String(m.id),
      provider_id: String(m.provider_id),
      model_id: String(m.model_id),
      label: String(m.label),
      tier: String(m.tier),
      input_price_per_1k: Number(m.input_price_per_1k ?? 0),
      output_price_per_1k: Number(m.output_price_per_1k ?? 0),
      currency: String(m.currency ?? "USD"),
      active: !!m.active,
      provider_type: provider ? String(provider.type) : "unknown",
      provider_api_key: provider ? String(provider.api_key ?? "") : null,
      provider_config: provider ? ((provider.config as Record<string, unknown>) ?? {}) : {},
      config_json: (provider?.config as Record<string, unknown>) ?? {},
    };
  });
}

/**
 * One entry point for every AI call in the app.
 * Now uses feature-based provider resolution with automatic fallback.
 */
export async function callAI(
  system: string,
  user: string,
  opts: { model?: unknown; json?: boolean; feature?: string } = {},
): Promise<string> {
  const feature = opts.feature ?? "unknown";
  const json = !!opts.json;
  const errors: Array<{ provider: string; error: string }> = [];
  let primaryProviderType = "";

  // First try the feature-configured model
  try {
    const { model, adapter } = await resolveModelForFeature(feature, opts.model);
    primaryProviderType = model.provider_type;
    const maxInput = Math.min(opts.json ? 6000 : 8000, model.input_price_per_1k > 0 ? 16000 : 32000);
    const maxOutput = Math.min(4096, model.output_price_per_1k > 0 ? 8192 : 16384);

    const response: AIResponse = await adapter.call(model, system, user.slice(0, maxInput), {
      json,
      maxInputTokens: maxInput,
      maxOutputTokens: maxOutput,
    });
    return response.content;
  } catch (e) {
    const primaryError = e instanceof Error ? e.message : String(e);
    errors.push({ provider: feature, error: primaryError });
    console.warn(`Primary AI provider failed [feature=${feature}]: ${primaryError}`);
  }

  // Fallback: try all providers in priority order (skip the one that already failed)
  try {
    const providers = await getAllProviders();
    for (const provider of providers) {
      // Skip the primary provider that already failed
      if (provider.type === primaryProviderType) continue;

      try {
        const models = await getModelsForProvider(provider.type);
        if (models.length === 0) continue;

        const model = models[0];
        const adapter = getAdapter(provider.type as ProviderType);
        const maxInput = Math.min(opts.json ? 6000 : 8000, 32000);
        const maxOutput = Math.min(4096, 16384);

        const response: AIResponse = await adapter.call(model, system, user.slice(0, maxInput), {
          json,
          maxInputTokens: maxInput,
          maxOutputTokens: maxOutput,
        });
        console.info(`AI fallback succeeded with provider: ${provider.type}/${model.model_id}`);
        return response.content;
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        errors.push({ provider: provider.type, error: errMsg });
        console.warn(`Fallback provider ${provider.type} failed: ${errMsg}`);
      }
    }
  } catch (e) {
    console.error("Failed to get fallback providers:", e);
  }

  // All providers failed
  const errorDetails = errors.map((e) => `${e.provider}: ${e.error}`).join("; ");
  throw new Error(`All AI providers failed. ${errorDetails}`);
}

/** Tolerant JSON parser for model output. */
export function parseJson<T = unknown>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (err2) { /* fall through */ }
    }
    return {} as T;
  }
}

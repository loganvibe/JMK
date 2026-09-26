// Provider abstraction layer for JMK AI.
// OpenRouter is the sole AI provider.

import { adminClient } from "./entitlements.ts";

export type ProviderType = "openrouter";

export interface ProviderConfig {
  id: string;
  vendor: string;
  type: ProviderType;
  api_key: string | null;
  config: Record<string, unknown>;
  active: boolean;
  priority: number;
}

export interface ModelConfig {
  id: string;
  provider_id: string;
  model_id: string;
  label: string;
  tier: string;
  input_price_per_1k: number;
  output_price_per_1k: number;
  currency: string;
  active: boolean;
  provider_type: string;
  provider_api_key: string | null;
  provider_config: Record<string, unknown>;
  config_json: Record<string, unknown>;
}

export interface FeatureSettings {
  feature_key: string;
  provider_id: string | null;
  model_id: string | null;
  enabled: boolean;
  credits: number;
  max_input_tokens: number;
  max_output_tokens: number;
  daily_limit: number | null;
  monthly_limit: number | null;
}

export interface PricingEntry {
  provider: string;
  model: string;
  input_price_per_1k: number;
  output_price_per_1k: number;
  currency: string;
}

export interface BudgetConfig {
  provider: string;
  monthly_budget: number;
  warning_threshold: number;
  hard_limit: number;
  current_spend: number;
  reset_at: string;
}

export interface AIResponse {
  content: string;
  input_tokens?: number;
  output_tokens?: number;
  model: string;
  provider: string;
}

export interface ProviderAdapter {
  type: ProviderType;
  label: string;
  call(
    model: ModelConfig,
    system: string,
    user: string,
    opts: { json?: boolean; maxInputTokens?: number; maxOutputTokens?: number },
  ): Promise<AIResponse>;
  streamChat(
    model: ModelConfig,
    system: string,
    user: string,
    opts: { maxInputTokens?: number; maxOutputTokens?: number },
  ): Promise<ReadableStream>;
}

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

class OpenRouterAdapter implements ProviderAdapter {
  type: ProviderType = "openrouter";
  label = "OpenRouter";

  async call(
    model: ModelConfig,
    system: string,
    user: string,
    opts: { json?: boolean; maxInputTokens?: number; maxOutputTokens?: number },
  ): Promise<AIResponse> {
    const apiKey = String(model.provider_api_key ?? "");
    if (!apiKey) throw new Error("OpenRouter API key is not configured.");

    const modelName = model.model_id;
    const maxTokens = opts.maxOutputTokens ?? 4096;

    const res = await fetch(OPENROUTER_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://jmk.ng",
        "X-Title": "JMK AI",
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: maxTokens,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: user },
        ],
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(`OpenRouter error [${res.status}]`, text.slice(0, 1000));
      throw new Error(`OpenRouter error [${res.status}]: ${text.slice(0, 300)}`);
    }

    let data: Record<string, unknown> = {};
    try { data = JSON.parse(text); } catch {
      throw new Error("OpenRouter returned an invalid response.");
    }

    const extracted = data?.choices?.[0]?.message?.content ?? "";
    if (!extracted.trim()) throw new Error("OpenRouter returned an empty response.");

    const usage = data?.usage as Record<string, unknown> | undefined;

    return {
      content: extracted,
      model: modelName,
      provider: "openrouter",
      input_tokens: usage ? Number(usage.prompt_tokens ?? 0) : undefined,
      output_tokens: usage ? Number(usage.completion_tokens ?? 0) : undefined,
    };
  }

  async streamChat(
    model: ModelConfig,
    system: string,
    user: string,
    opts: { maxInputTokens?: number; maxOutputTokens?: number },
  ): Promise<ReadableStream> {
    const apiKey = String(model.provider_api_key ?? "");
    if (!apiKey) throw new Error("OpenRouter API key is not configured.");

    const modelName = model.model_id;
    const maxTokens = opts.maxOutputTokens ?? 4096;

    const res = await fetch(OPENROUTER_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://jmk.ng",
        "X-Title": "JMK AI",
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: maxTokens,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: user },
        ],
        stream: true,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`OpenRouter error [${res.status}]`, text.slice(0, 1000));
      throw new Error(`OpenRouter error [${res.status}]: ${text.slice(0, 300)}`);
    }

    if (!res.body) throw new Error("OpenRouter response body is missing.");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    return new ReadableStream({
      async pull(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              return;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (payload === "[DONE]") {
                controller.close();
                return;
              }
              try {
                const parsed = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(new TextEncoder().encode(content));
                }
              } catch {
                // skip malformed chunk
              }
            }
          }
        } catch (e) {
          controller.error(e);
        }
      },
    });
  }
}

const ADAPTERS: Record<ProviderType, ProviderAdapter> = {
  openrouter: new OpenRouterAdapter(),
};

// ============================================================
// Database queries
// ============================================================

export async function getActiveProvider(): Promise<ProviderConfig | null> {
  const db = adminClient();
  const { data } = await db
    .from("ai_providers")
    .select("*")
    .eq("vendor", "openrouter")
    .eq("active", true)
    .maybeSingle();

  if (!data) return null;
  return {
    id: String(data.id),
    vendor: String(data.vendor),
    type: "openrouter",
    api_key: String(data.api_key ?? ""),
    config: ((data.config as Record<string, unknown>) ?? {}) as Record<string, unknown>,
    active: !!data.active,
    priority: Number(data.priority ?? 0),
  };
}

export async function getModel(modelId: string): Promise<ModelConfig | null> {
  const db = adminClient();
  const { data } = await db
    .from("ai_models")
    .select("*, ai_providers(type, api_key, config)")
    .eq("id", modelId)
    .eq("active", true)
    .maybeSingle();

  if (!data) return null;

  const provider = data.ai_providers as Record<string, unknown> | null;
  const providerType = provider ? (String(provider.type) as ProviderType) : "openrouter";
  return {
    id: String(data.id),
    provider_id: String(data.provider_id),
    model_id: String(data.model_id),
    label: String(data.label),
    tier: String(data.tier),
    input_price_per_1k: Number(data.input_price_per_1k ?? 0),
    output_price_per_1k: Number(data.output_price_per_1k ?? 0),
    currency: String(data.currency ?? "USD"),
    active: !!data.active,
    provider_type: providerType,
    provider_api_key: provider ? resolveApiKey(String(provider.api_key ?? "")) : null,
    provider_config: provider ? ((provider.config as Record<string, unknown>) ?? {}) : {},
    config_json: (provider?.config as Record<string, unknown>) ?? {},
  };
}

export async function getFeatureSettings(featureKey: string): Promise<FeatureSettings | null> {
  const db = adminClient();
  const { data } = await db
    .from("ai_feature_settings")
    .select("*")
    .eq("feature_key", featureKey)
    .maybeSingle();

  if (!data) return null;
  return {
    feature_key: String(data.feature_key),
    provider_id: data.provider_id ? String(data.provider_id) : null,
    model_id: data.model_id ? String(data.model_id) : null,
    enabled: !!data.enabled,
    credits: Number(data.credits ?? 1),
    max_input_tokens: Number(data.max_input_tokens ?? 8000),
    max_output_tokens: Number(data.max_output_tokens ?? 4096),
    daily_limit: data.daily_limit ? Number(data.daily_limit) : null,
    monthly_limit: data.monthly_limit ? Number(data.monthly_limit) : null,
  };
}

export async function getPricing(provider: string, model: string): Promise<PricingEntry | null> {
  const db = adminClient();
  const { data } = await db
    .from("ai_provider_pricing")
    .select("*")
    .eq("provider", provider)
    .eq("model", model)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    provider: String(data.provider),
    model: String(data.model),
    input_price_per_1k: Number(data.input_price_per_1k ?? 0),
    output_price_per_1k: Number(data.output_price_per_1k ?? 0),
    currency: String(data.currency ?? "USD"),
  };
}

export async function getBudget(provider: string): Promise<BudgetConfig | null> {
  const db = adminClient();
  const { data } = await db
    .from("ai_provider_budgets")
    .select("*")
    .eq("provider", provider)
    .maybeSingle();

  if (!data) return null;
  return {
    provider: String(data.provider),
    monthly_budget: Number(data.monthly_budget ?? 1000),
    warning_threshold: Number(data.warning_threshold ?? 0.8),
    hard_limit: Number(data.hard_limit ?? 1),
    current_spend: Number(data.current_spend ?? 0),
    reset_at: String(data.reset_at ?? ""),
  };
}

export function getAdapter(type: ProviderType): ProviderAdapter {
  const adapter = ADAPTERS[type];
  if (!adapter) throw new Error(`Unknown provider type: ${type}`);
  return adapter;
}

/**
 * OpenRouter API key is sourced exclusively from the OPENROUTER_API_KEY
 * Edge Function secret. The database api_key column is intentionally ignored
 * so the key is never stored in or exposed from any DB record.
 */
export function resolveApiKey(dbKey?: string | null): string {
  return Deno.env.get("OPENROUTER_API_KEY") ?? "";
}

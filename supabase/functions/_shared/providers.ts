// Provider abstraction layer for JMK AI.
// Each adapter implements the same interface so features don't need to know which provider is active.

import { adminClient } from "./entitlements.ts";

export type ProviderType = "ollama" | "openrouter" | "gemini" | "openai";

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
  streamChat?(
    model: ModelConfig,
    system: string,
    user: string,
    opts: { maxInputTokens?: number; maxOutputTokens?: number },
  ): Promise<ReadableStream>;
}

class OllamaAdapter implements ProviderAdapter {
  type: ProviderType = "ollama";
  label = "Ollama";

  async call(model: ModelConfig, system: string, user: string, opts: { json?: boolean; maxInputTokens?: number; maxOutputTokens?: number }): Promise<AIResponse> {
    const baseUrl = String(model.config_json?.base_url ?? "http://localhost:11434");
    const modelName = model.model_id;
    const maxTokens = opts.maxOutputTokens ?? 4096;

    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        stream: false,
        options: { num_predict: maxTokens },
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Ollama error [${res.status}]: ${text.slice(0, 300)}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const content = String(data?.message?.content ?? "");
    if (!content.trim()) throw new Error("Ollama returned an empty response.");

    return {
      content,
      model: modelName,
      provider: "ollama",
    };
  }

  async streamChat(model: ModelConfig, system: string, user: string, opts: { maxInputTokens?: number; maxOutputTokens?: number }): Promise<ReadableStream> {
    const baseUrl = String(model.config_json?.base_url ?? "http://localhost:11434");
    const modelName = model.model_id;
    const maxTokens = opts.maxOutputTokens ?? 4096;

    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        stream: true,
        options: { num_predict: maxTokens },
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Ollama error [${res.status}]: ${text.slice(0, 300)}`);
    }

    if (!res.body) throw new Error("Ollama stream response body is missing.");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    return new ReadableStream({
      async pull(controller) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("{")) continue;
            try {
              const json = JSON.parse(trimmed);
              const chunk = String(json?.message?.content ?? "");
              if (chunk) {
                controller.enqueue(new TextEncoder().encode(chunk));
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      },
      cancel() {
        reader.cancel();
      },
    });
  }
}

class OpenRouterAdapter implements ProviderAdapter {
  type: ProviderType = "openrouter";
  label = "OpenRouter";

  async call(model: ModelConfig, system: string, user: string, opts: { json?: boolean; maxInputTokens?: number; maxOutputTokens?: number }): Promise<AIResponse> {
    const apiKey = String(model.provider_api_key ?? "");
    if (!apiKey) throw new Error("OpenRouter API key is not configured.");

    const modelName = model.model_id;
    const maxTokens = opts.maxOutputTokens ?? 4096;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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

    return {
      content: extracted,
      model: modelName,
      provider: "openrouter",
    };
  }
}

class GeminiAdapter implements ProviderAdapter {
  type: ProviderType = "gemini";
  label = "Gemini";

  async call(model: ModelConfig, system: string, user: string, opts: { json?: boolean; maxInputTokens?: number; maxOutputTokens?: number }): Promise<AIResponse> {
    const apiKey = String(model.provider_api_key ?? "");
    if (!apiKey) throw new Error("Gemini API key is not configured.");

    const modelName = model.model_id;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${apiKey}`;

    const body: Record<string, unknown> = {
      contents: [
        {
          parts: [
            { text: system ? `${system}\n\n${user}` : user },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: opts.maxOutputTokens ?? 4096,
      },
    };

    if (opts.json) {
      body.generationConfig = {
        ...(body.generationConfig as Record<string, unknown>),
        responseMimeType: "application/json",
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(`Gemini error [${res.status}]`, text.slice(0, 1000));
      throw new Error(`Gemini error [${res.status}]: ${text.slice(0, 300)}`);
    }

    let data: Record<string, unknown> = {};
    try { data = JSON.parse(text); } catch {
      throw new Error("Gemini returned an invalid response.");
    }

    const extracted = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!extracted.trim()) throw new Error("Gemini returned an empty response.");

    return {
      content: extracted,
      model: modelName,
      provider: "gemini",
    };
  }
}

class OpenAIAdapter implements ProviderAdapter {
  type: ProviderType = "openai";
  label = "OpenAI";

  async call(model: ModelConfig, system: string, user: string, opts: { json?: boolean; maxInputTokens?: number; maxOutputTokens?: number }): Promise<AIResponse> {
    const apiKey = String(model.provider_api_key ?? "");
    if (!apiKey) throw new Error("OpenAI API key is not configured.");

    const modelName = model.model_id;
    const body: Record<string, unknown> = {
      model: modelName,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      max_tokens: opts.maxOutputTokens ?? 4096,
    };

    if (opts.json) body.response_format = { type: "json_object" };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(`OpenAI error [${res.status}]`, text.slice(0, 1000));
      throw new Error(`OpenAI error [${res.status}]: ${text.slice(0, 300)}`);
    }

    let data: Record<string, unknown> = {};
    try { data = JSON.parse(text); } catch {
      throw new Error("OpenAI returned an invalid response.");
    }

    const extracted = data?.choices?.[0]?.message?.content ?? "";
    if (!extracted.trim()) throw new Error("OpenAI returned an empty response.");

    return {
      content: extracted,
      model: modelName,
      provider: "openai",
    };
  }
}

const ADAPTERS: Record<ProviderType, ProviderAdapter> = {
  ollama: new OllamaAdapter(),
  openrouter: new OpenRouterAdapter(),
  gemini: new GeminiAdapter(),
  openai: new OpenAIAdapter(),
};

// ============================================================
// Database queries
// ============================================================

export async function getActiveProvider(vendor: string): Promise<ProviderConfig | null> {
  const db = adminClient();
  const { data } = await db
    .from("ai_providers")
    .select("*")
    .eq("vendor", vendor)
    .eq("active", true)
    .maybeSingle();

  if (!data) return null;
  return {
    id: String(data.id),
    vendor: String(data.vendor),
    type: String(data.type) as ProviderType,
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
    provider_type: provider ? String(provider.type) : "unknown",
    provider_api_key: provider ? String(provider.api_key ?? "") : null,
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

// Central AI model layer for every edge function.
// Routes OpenAI models through Chat Completions and Google models through Gemini API.
import { adminClient } from "./entitlements.ts";

export type ModelId = string;

export const MODELS: {
  id: ModelId;
  label: string;
  vendor: "google" | "openai";
  tier: "standard" | "pro";
  blurb: string;
}[] = [
  {
    id: "google/gemini-1.5-flash",
    label: "Gemini 1.5 Flash",
    vendor: "google",
    tier: "standard",
    blurb: "Fast, balanced default for drafting and everyday academic writing.",
  },
  {
    id: "google/gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    vendor: "google",
    tier: "pro",
    blurb: "Deeper reasoning for literature reviews and methodology.",
  },
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o Mini",
    vendor: "openai",
    tier: "standard",
    blurb: "OpenAI quality at low latency — great for edits and citations.",
  },
  {
    id: "openai/gpt-4o",
    label: "GPT-4o",
    vendor: "openai",
    tier: "pro",
    blurb: "Balanced OpenAI flagship for full chapters and analysis.",
  },
  {
    id: "openai/o3-mini",
    label: "o3 Mini",
    vendor: "openai",
    tier: "pro",
    blurb: "Strongest reasoning for defense prep and complex critique.",
  },
];

export const DEFAULT_MODEL: ModelId = "google/gemini-1.5-flash";

const ALLOWED = new Set(MODELS.map((m) => m.id));

/** Validates a client-supplied model id, falling back to the default. */
export function resolveModel(requested?: unknown): ModelId {
  const id = typeof requested === "string" ? requested.trim() : "";
  return ALLOWED.has(id) ? id : DEFAULT_MODEL;
}

export function isOpenAI(model: ModelId) {
  return model.startsWith("openai/");
}

function openaiKey() {
  const envKey = Deno.env.get("OPENAI_API_KEY");
  if (envKey) return envKey;

  try {
    const db = adminClient();
    const { data } = db.from("ai_providers").select("api_key").eq("vendor", "openai").eq("active", true).maybeSingle();
    const dbKey = (data as Record<string, string> | null)?.api_key;
    if (dbKey) return dbKey;
  } catch {
    // fall through to env fallback below
  }

  throw Object.assign(new Error("OpenAI is not configured."), { status: 503, code: "provider_unconfigured" });
}

function googleKey() {
  const envKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (envKey) return envKey;

  try {
    const db = adminClient();
    const { data } = db.from("ai_providers").select("api_key").eq("vendor", "google").eq("active", true).maybeSingle();
    const dbKey = (data as Record<string, string> | null)?.api_key;
    if (dbKey) return dbKey;
  } catch {
    // fall through to env fallback below
  }

  throw Object.assign(new Error("Google AI is not configured."), { status: 503, code: "provider_unconfigured" });
}

function gatewayError(status: number, detail: string) {
  console.error("AI gateway error", status, detail.slice(0, 800));
  const mapped = status === 429 || status === 402 ? status : 500;
  const message =
    status === 429
      ? "AI is busy right now. Please try again shortly."
      : status === 402
      ? "AI credits exhausted. Please upgrade to continue."
      : "AI request failed.";
  return Object.assign(new Error(message), { status: mapped });
}

/** Calls Google Gemini API directly. */
async function callGemini(model: ModelId, system: string, user: string, json: boolean) {
  const key = googleKey();
  const modelName = model.replace("google/", "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${key}`;

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
      maxOutputTokens: 8192,
    },
  };

  if (json) {
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
    console.error(`Google AI error [${res.status}]`, text.slice(0, 1000));
    throw new Error(`Google AI error [${res.status}]: ${text.slice(0, 300)}`);
  }

  let data: Record<string, unknown> = {};
  try { data = JSON.parse(text); } catch {
    console.error("Google AI invalid JSON", text.slice(0, 500));
    throw new Error("Google AI returned an invalid response. Please try again.");
  }

  const extracted = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!extracted.trim()) {
    console.error("Google AI empty response", JSON.stringify(data).slice(0, 500));
    throw new Error("The AI returned an empty response. Please retry.");
  }
  return extracted;
}

/** Calls OpenAI Chat Completions API directly. */
async function callOpenAI(model: ModelId, system: string, user: string, json: boolean) {
  const key = openaiKey();
  const body: Record<string, unknown> = {
    model: model.replace("openai/", ""),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.7,
    max_tokens: 8192,
  };
  if (json) body.response_format = { type: "json_object" };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
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
    console.error("OpenAI invalid JSON", text.slice(0, 500));
    throw new Error("OpenAI returned an invalid response. Please try again.");
  }

  const extracted = data?.choices?.[0]?.message?.content ?? "";
  if (!extracted.trim()) {
    console.error("OpenAI empty response", JSON.stringify(data).slice(0, 500));
    throw new Error("The AI returned an empty response. Please retry.");
  }
  return extracted;
}

/**
 * One entry point for every AI call in the app.
 * `model` may come straight from the client — it is validated here.
 */
export async function callAI(
  system: string,
  user: string,
  opts: { model?: unknown; json?: boolean } = {},
): Promise<string> {
  const model = resolveModel(opts.model);
  const json = !!opts.json;
  try {
    const text = isOpenAI(model)
      ? await callOpenAI(model, system, user, json)
      : await callGemini(model, system, user, json);
    return text;
  } catch (e) {
    console.error(`AI call failed [model=${model}]`, e);
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

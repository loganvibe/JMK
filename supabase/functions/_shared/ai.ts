// Central AI model layer for every edge function.
// Routes OpenAI models through the gateway Responses API (streaming, consumed
// server-side) and every other vendor through chat completions.

export type ModelId = string;

export const MODELS: {
  id: ModelId;
  label: string;
  vendor: "google" | "openai";
  tier: "standard" | "pro";
  blurb: string;
}[] = [
  {
    id: "google/gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
    vendor: "google",
    tier: "standard",
    blurb: "Fast, balanced default for drafting and everyday academic writing.",
  },
  {
    id: "google/gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro",
    vendor: "google",
    tier: "pro",
    blurb: "Deeper reasoning for literature reviews and methodology.",
  },
  {
    id: "openai/gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    vendor: "openai",
    tier: "standard",
    blurb: "OpenAI quality at low latency — great for edits and citations.",
  },
  {
    id: "openai/gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    vendor: "openai",
    tier: "pro",
    blurb: "Balanced OpenAI flagship for full chapters and analysis.",
  },
  {
    id: "openai/gpt-5.5",
    label: "GPT-5.5",
    vendor: "openai",
    tier: "pro",
    blurb: "Strongest reasoning for defense prep and complex critique.",
  },
];

export const DEFAULT_MODEL: ModelId = "google/gemini-3.6-flash";

const ALLOWED = new Set(MODELS.map((m) => m.id));

/** Validates a client-supplied model id, falling back to the default. */
export function resolveModel(requested?: unknown): ModelId {
  const id = typeof requested === "string" ? requested.trim() : "";
  return ALLOWED.has(id) ? id : DEFAULT_MODEL;
}

export function isOpenAI(model: ModelId) {
  return model.startsWith("openai/");
}

function apiKey() {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw Object.assign(new Error("AI is not configured."), { status: 503, code: "provider_unconfigured" });
  return key;
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

/** Streams a Responses API call and returns the concatenated output text. */
async function callResponses(model: ModelId, system: string, user: string, json: boolean) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey(),
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model,
      instructions: system,
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: json ? `${user}\n\nRespond with JSON only.` : user }],
        },
      ],
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
    }),
  });

  if (!res.ok || !res.body) {
    throw gatewayError(res.status, await res.text().catch(() => ""));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          text += evt.delta;
        } else if (evt.type === "response.completed" && !text) {
          text = evt.response?.output_text ?? "";
        }
      } catch {
        // partial / non-JSON keepalive frame — ignore
      }
    }
  }

  return text;
}

async function callChatCompletions(model: ModelId, system: string, user: string, json: boolean) {
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (json) body.response_format = { type: "json_object" };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey(),
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw gatewayError(res.status, await res.text().catch(() => ""));
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
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
  const text = isOpenAI(model)
    ? await callResponses(model, system, user, json)
    : await callChatCompletions(model, system, user, json);

  if (!text.trim()) throw Object.assign(new Error("The AI returned an empty response. Please retry."), { status: 502 });
  return text;
}

/** Tolerant JSON parser for model output. */
export function parseJson<T = any>(raw: string): T {
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

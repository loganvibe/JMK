// Client-side mirror of OpenRouter models available to JMK.
export type AIModel = {
  id: string;
  label: string;
  vendor: "OpenRouter";
  tier: "standard" | "pro";
  blurb: string;
};

export const AI_MODELS: AIModel[] = [
  {
    id: "openrouter/meta-llama/llama-3.1-70b-instruct",
    label: "Llama 3.1 70B Instruct",
    vendor: "OpenRouter",
    tier: "standard",
    blurb: "Balanced general-purpose model for everyday academic writing.",
  },
  {
    id: "openrouter/meta-llama/llama-3.1-405b-instruct",
    label: "Llama 3.1 405B Instruct",
    vendor: "OpenRouter",
    tier: "pro",
    blurb: "Deep reasoning for literature reviews and defense prep.",
  },
  {
    id: "openrouter/google/gemini-pro-1.5",
    label: "Gemini Pro 1.5 (via OpenRouter)",
    vendor: "OpenRouter",
    tier: "standard",
    blurb: "Strong all-around model via OpenRouter.",
  },
  {
    id: "openrouter/z-ai/glm-5.2:free",
    label: "GLM-5.2 Free",
    vendor: "OpenRouter",
    tier: "standard",
    blurb: "Free OpenRouter model.",
  },
  {
    id: "openrouter/stealth/ox-alpha",
    label: "Stealth OX Alpha",
    vendor: "OpenRouter",
    tier: "standard",
    blurb: "Free OpenRouter model.",
  },
];

export const DEFAULT_MODEL = "openrouter/meta-llama/llama-3.1-70b-instruct";
const STORAGE_KEY = "jmk.ai.model";

export const modelLabel = (id: string) =>
  AI_MODELS.find((m) => m.id === id)?.label ?? "Llama 3.1 70B Instruct";

/** Returns the default OpenRouter model. Kept for backward compatibility. */
export function getPreferredModel(): string {
  if (typeof window === "undefined") return DEFAULT_MODEL;
  const saved = window.localStorage.getItem(STORAGE_KEY) ?? "";
  return AI_MODELS.some((m) => m.id === saved) ? saved : DEFAULT_MODEL;
}

export function setPreferredModel(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, id);
  window.dispatchEvent(new CustomEvent("jmk:model-changed", { detail: id }));
}

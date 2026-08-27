// Client-side mirror of the models the backend accepts (supabase/functions/_shared/ai.ts).
export type AIModel = {
  id: string;
  label: string;
  vendor: "Google" | "OpenAI" | "OpenRouter" | "Groq";
  tier: "standard" | "pro";
  blurb: string;
};

export const AI_MODELS: AIModel[] = [
  // Free models (recommended)
  {
    id: "groq/llama-3.3-70b-versatile",
    label: "Llama 3.3 70B (Groq)",
    vendor: "Groq",
    tier: "standard",
    blurb: "Fast, free model — great for most academic tasks.",
  },
  {
    id: "groq/llama-3.1-8b-instant",
    label: "Llama 3.1 8B (Groq)",
    vendor: "Groq",
    tier: "standard",
    blurb: "Quick responses for simple queries and edits.",
  },
  {
    id: "groq/mixtral-8x7b-32768",
    label: "Mixtral 8x7B (Groq)",
    vendor: "Groq",
    tier: "standard",
    blurb: "Mixture of experts — strong for analysis.",
  },
  {
    id: "groq/gemma2-9b-it",
    label: "Gemma 2 9B (Groq)",
    vendor: "Groq",
    tier: "standard",
    blurb: "Google's open model — good for writing.",
  },
  {
    id: "openrouter/z-ai/glm-5.2:free",
    label: "GLM-5.2 Free",
    vendor: "OpenRouter",
    tier: "standard",
    blurb: "Free OpenRouter model — good for testing.",
  },
  {
    id: "openrouter/stealth/ox-alpha",
    label: "Stealth OX Alpha",
    vendor: "OpenRouter",
    tier: "standard",
    blurb: "Free experimental model.",
  },
  // Standard paid models
  {
    id: "google/gemini-1.5-flash",
    label: "Gemini 1.5 Flash",
    vendor: "Google",
    tier: "standard",
    blurb: "Fast, balanced default for everyday academic writing.",
  },
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o Mini",
    vendor: "OpenAI",
    tier: "standard",
    blurb: "OpenAI quality at low latency — great for edits and citations.",
  },
  // Pro models
  {
    id: "google/gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    vendor: "Google",
    tier: "pro",
    blurb: "Deeper reasoning for literature reviews and methodology.",
  },
  {
    id: "openai/gpt-4o",
    label: "GPT-4o",
    vendor: "OpenAI",
    tier: "pro",
    blurb: "Balanced OpenAI flagship for full chapters and analysis.",
  },
  {
    id: "openai/o3-mini",
    label: "o3 Mini",
    vendor: "OpenAI",
    tier: "pro",
    blurb: "Strongest reasoning for defense prep and deep critique.",
  },
];

export const DEFAULT_MODEL = "groq/llama-3.3-70b-versatile";
const STORAGE_KEY = "jmk.ai.model";

export const modelLabel = (id: string) =>
  AI_MODELS.find((m) => m.id === id)?.label ?? "Llama 3.3 70B (Groq)";

/** The model every AI request should use. Read synchronously anywhere. */
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

// Client-side mirror of the models the backend accepts (supabase/functions/_shared/ai.ts).
export type AIModel = {
  id: string;
  label: string;
  vendor: "Google" | "OpenAI";
  tier: "standard" | "pro";
  blurb: string;
};

export const AI_MODELS: AIModel[] = [
  {
    id: "google/gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
    vendor: "Google",
    tier: "standard",
    blurb: "Fast, balanced default for everyday academic writing.",
  },
  {
    id: "google/gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro",
    vendor: "Google",
    tier: "pro",
    blurb: "Deeper reasoning for literature reviews and methodology.",
  },
  {
    id: "openai/gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    vendor: "OpenAI",
    tier: "standard",
    blurb: "OpenAI quality at low latency — great for edits and citations.",
  },
  {
    id: "openai/gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    vendor: "OpenAI",
    tier: "pro",
    blurb: "Balanced OpenAI flagship for full chapters and analysis.",
  },
  {
    id: "openai/gpt-5.5",
    label: "GPT-5.5",
    vendor: "OpenAI",
    tier: "pro",
    blurb: "Strongest reasoning for defense prep and deep critique.",
  },
];

export const DEFAULT_MODEL = "google/gemini-3.6-flash";
const STORAGE_KEY = "jmk.ai.model";

export const modelLabel = (id: string) =>
  AI_MODELS.find((m) => m.id === id)?.label ?? "Gemini 3.6 Flash";

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

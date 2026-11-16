// Centralised error handling: friendly messages, logging and retry helpers.
import { supabase } from "@/integrations/supabase/client";

export type ErrorScope = "ai" | "payment" | "upload" | "auth" | "database" | "network" | "app";

/** Standard AI response from edge functions */
export interface StandardAIResponse<T = unknown> {
  success: boolean;
  content: string;
  data: T | null;
  provider: "openrouter";
  model: string;
  usage: { input_tokens: number; output_tokens: number };
  credits_used: number;
}

/** Standard AI error response from edge functions */
export interface StandardAIErrorResponse {
  success: false;
  error: { code: string; message: string };
}

type AIEdgeResponse<T = unknown> = StandardAIResponse<T> | StandardAIErrorResponse;

/** Turns any thrown value into a short, student-friendly sentence. */
export function friendlyError(err: unknown, scope: ErrorScope = "app"): string {
  const raw =
    typeof err === "string"
      ? err
      : ((err as Record<string, unknown>)?.message ?? (err as Record<string, unknown>)?.error_description ?? "") as string;
  const msg = String(raw);
  const lower = msg.toLowerCase();

  if (!navigator.onLine) return "You appear to be offline. Check your internet connection and try again.";
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("load failed"))
    return "We couldn't reach the server. Please check your connection and retry.";
  if (lower.includes("access_expired") || (lower.includes("expired") && lower.includes("access")))
    return msg || "Your 7-day access has expired. Make a contribution to continue using JMK AI features.";
  if (lower.includes("credits_exhausted") || (lower.includes("credits") && (lower.includes("0") || lower.includes("not enough") || lower.includes("remaining"))))
    return msg || "You don't have enough AI credits for this request. Make a contribution to get more credits.";
  if (lower.includes("upgrade_required") || lower.includes("upgrade your plan"))
    return msg || "This feature requires an active weekly contribution.";
  if (lower.includes("rate limit") || lower.includes("429")) {
    if (scope === "ai") return "The AI is handling a lot of requests right now. Please wait a few seconds and try again.";
    return "Too many requests. Please wait a moment before trying again.";
  }
  const authRateLimitCodes = ["over_request_rate_limit", "over_email_send_rate_limit", "over_sms_send_rate_limit"];
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: string }).code;
    if (code && authRateLimitCodes.includes(code)) return "Too many requests. Please wait a moment before trying again.";
  }
  if (lower.includes("payment required") || lower.includes("402"))
    return msg || "Active weekly access and AI credits are required for this action.";
  if (lower.includes("jwt") || lower.includes("unauthenticated") || lower.includes("invalid session"))
    return "Your session expired. Please sign in again.";
  if (lower.includes("row-level security") || lower.includes("permission denied") || lower.includes("forbidden"))
    return "You don't have permission to do that.";
  if (lower.includes("duplicate key")) return "That item already exists.";
  if (scope === "upload") return msg || "We couldn't process that file. Try a PDF, DOCX or TXT under 20MB.";
  if (scope === "ai") return msg || "The AI request failed. Please try again in a moment.";
  if (scope === "payment") return msg || "We couldn't complete the payment. No money has been taken — please try again.";
  return msg || "Something went wrong. Please try again.";
}

/** Records an error for the admin error console. Never throws. */
export async function logError(scope: ErrorScope, message: string, details: Record<string, unknown> = {}, severity: "warning" | "error" | "critical" = "error") {
  try {
    const { data } = await supabase.auth.getUser();
    const userId = data?.user?.id;
    if (!userId) return;
    await supabase.from("error_logs").insert({ user_id: userId, scope, source: typeof window !== "undefined" ? window.location.pathname : null, message: String(message).slice(0, 2000), details: details as Record<string, unknown>, severity });
  } catch {
    // logging must never break the app
  }
}

/** Handles an error end to end: logs it and returns the friendly message. */
export async function reportError(scope: ErrorScope, err: unknown, details: Record<string, unknown> = {}): Promise<string> {
  const message = friendlyError(err, scope);
  await logError(scope, (err instanceof Error ? err.message : String(err)) ?? "unknown", { ...details, shown: message });
  return message;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function unwrapFunctionError(err: any): Promise<Error> {
  const ctx = err?.context;
  try {
    if (ctx && typeof ctx.json === "function") {
      const cloned = typeof ctx.clone === "function" ? ctx.clone() : ctx;
      const body = await cloned.json();
      if (body?.success === false && body?.error?.message) return Object.assign(new Error(body.error.message), { code: body.error.code });
      if (body?.error) return Object.assign(new Error(String(body.error)), { code: body.code });
    } else if (ctx && typeof ctx.text === "function") {
      const text = await ctx.text();
      if (text) return new Error(text);
    }
  } catch {
    // fall through
  }
  return err instanceof Error ? err : new Error(String(err?.message ?? err));
}

export async function invokeFunction<T = unknown>(name: string, body: Record<string, unknown>, opts: { retries?: number; scope?: ErrorScope } = {}): Promise<T> {
  const retries = opts.retries ?? 1;
  const scope = opts.scope ?? "ai";
  let lastErr: unknown;
  const payload = { model: "openrouter/meta-llama/llama-3.1-70b-instruct", ...body };
  const invokeOptions: Record<string, any> = { body: payload };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) invokeOptions.headers = { Authorization: `Bearer ${session.access_token}` };
  } catch {}

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(name, invokeOptions);
      if (error) throw await unwrapFunctionError(error);
      if (data && typeof data === "object" && "success" in data) {
        const response = data as AIEdgeResponse<T>;
        if (!response.success) { const e = new Error(response.error.message) as any; e.code = response.error.code; throw e; }
        return response as unknown as T;
      }
      if (data && (data as any).error) throw new Error(String((data as any).error));
      return data as T;
    } catch (err: any) {
      lastErr = err;
      const text = String(err?.message ?? "").toLowerCase();
      const code = String(err?.code ?? "");
      if (["upgrade_required", "credits_exhausted", "access_expired", "unauthenticated", "forbidden", "payment_required"].includes(code)) break;
      const transient = text.includes("failed to fetch") || text.includes("timeout") || text.includes("rate limit") || text.includes("503") || text.includes("502");
      if (attempt < retries && transient) { await sleep(1200 * (attempt + 1)); continue; }
      break;
    }
  }
  await logError(scope, (lastErr instanceof Error ? lastErr.message : String(lastErr)) ?? "unknown", { function: name });
  const friendly = friendlyError(lastErr, scope);
  const err = new Error(friendly) as any;
  err.originalMessage = lastErr instanceof Error ? lastErr.message : String(lastErr ?? "unknown");
  throw err;
}

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXT = [".pdf", ".doc", ".docx", ".txt", ".md"];
export function validateUpload(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ALLOWED_EXT.some((e) => name.endsWith(e))) return "Unsupported file type. Please upload a PDF, DOCX, DOC, TXT or MD file.";
  if (file.size > MAX_UPLOAD_BYTES) return "That file is larger than 20MB. Please upload a smaller document.";
  if (file.size === 0) return "That file appears to be empty.";
  return null;
}

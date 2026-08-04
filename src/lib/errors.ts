// Centralised error handling: friendly messages, logging and retry helpers.
import { supabase } from "@/integrations/supabase/client";

export type ErrorScope =
  | "ai"
  | "payment"
  | "upload"
  | "auth"
  | "database"
  | "network"
  | "app";

/** Turns any thrown value into a short, student-friendly sentence. */
export function friendlyError(err: unknown, scope: ErrorScope = "app"): string {
  const raw =
    typeof err === "string"
      ? err
      : (err as any)?.message || (err as any)?.error_description || "";
  const msg = String(raw);
  const lower = msg.toLowerCase();

  if (!navigator.onLine) return "You appear to be offline. Check your internet connection and try again.";

  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("load failed"))
    return "We couldn't reach the server. Please check your connection and retry.";

  if (lower.includes("credits_exhausted") || lower.includes("all ") && lower.includes("credits"))
    return "You've used all your AI credits for this month. Upgrade your plan to keep going.";

  if (lower.includes("upgrade_required") || lower.includes("upgrade your plan"))
    return msg || "This feature isn't included in your current plan. Upgrade to unlock it.";

  if (lower.includes("rate limit") || lower.includes("429"))
    return "The AI is handling a lot of requests right now. Please wait a few seconds and try again.";

  if (lower.includes("payment required") || lower.includes("402"))
    return "AI usage requires an active plan or workspace credits.";

  if (lower.includes("jwt") || lower.includes("unauthenticated") || lower.includes("invalid session"))
    return "Your session expired. Please sign in again.";

  if (lower.includes("row-level security") || lower.includes("permission denied"))
    return "You don't have permission to do that.";

  if (lower.includes("duplicate key"))
    return "That item already exists.";

  if (scope === "upload")
    return msg || "We couldn't process that file. Try a PDF, DOCX or TXT under 20MB.";

  if (scope === "ai")
    return msg || "The AI request failed. Please try again in a moment.";

  if (scope === "payment")
    return msg || "We couldn't complete the payment. No money has been taken — please try again.";

  return msg || "Something went wrong. Please try again.";
}

/** Records an error for the admin error console. Never throws. */
export async function logError(
  scope: ErrorScope,
  message: string,
  details: Record<string, unknown> = {},
  severity: "warning" | "error" | "critical" = "error",
) {
  try {
    const { data } = await supabase.auth.getUser();
    await supabase.from("error_logs" as any).insert({
      user_id: data?.user?.id ?? null,
      scope,
      source: typeof window !== "undefined" ? window.location.pathname : null,
      message: String(message).slice(0, 2000),
      details: details as any,
      severity,
    });
  } catch {
    // logging must never break the app
  }
}

/** Handles an error end to end: logs it and returns the friendly message. */
export async function reportError(
  scope: ErrorScope,
  err: unknown,
  details: Record<string, unknown> = {},
): Promise<string> {
  const message = friendlyError(err, scope);
  await logError(scope, (err as any)?.message ?? String(err), { ...details, shown: message });
  return message;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Invokes an edge function with one automatic retry on transient failures,
 * consistent error shape and automatic error logging.
 */
export async function invokeFunction<T = any>(
  name: string,
  body: Record<string, unknown>,
  opts: { retries?: number; scope?: ErrorScope } = {},
): Promise<T> {
  const retries = opts.retries ?? 1;
  const scope = opts.scope ?? "ai";
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(name, { body });
      if (error) throw error;
      if (data && (data as any).error) throw new Error((data as any).error);
      return data as T;
    } catch (err: any) {
      lastErr = err;
      const text = String(err?.message ?? "").toLowerCase();
      const transient =
        text.includes("failed to fetch") ||
        text.includes("timeout") ||
        text.includes("rate limit") ||
        text.includes("503") ||
        text.includes("502");
      if (attempt < retries && transient) {
        await sleep(1200 * (attempt + 1));
        continue;
      }
      break;
    }
  }

  await logError(scope, `${name}: ${(lastErr as any)?.message ?? "unknown"}`, { function: name });
  throw new Error(friendlyError(lastErr, scope));
}

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXT = [".pdf", ".doc", ".docx", ".txt", ".md"];

/** Returns an error string when a file can't be accepted, otherwise null. */
export function validateUpload(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ALLOWED_EXT.some((e) => name.endsWith(e)))
    return "Unsupported file type. Please upload a PDF, DOCX, DOC, TXT or MD file.";
  if (file.size > MAX_UPLOAD_BYTES) return "That file is larger than 20MB. Please upload a smaller document.";
  if (file.size === 0) return "That file appears to be empty.";
  return null;
}

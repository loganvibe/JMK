import { supabase } from "@/integrations/supabase/client";

/**
 * Signs the user out and always lands them somewhere safe, even when the
 * stored session is already stale (Supabase throws in that case).
 */
export async function signOutAndRedirect(to = "/") {
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore: the local session is cleared below regardless.
  }
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Ignore.
  }
  window.location.replace(to);
}

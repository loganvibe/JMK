import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  id: string;
  pricing_mode: "paid" | "free";
  free_mode_message: string | null;
  payments_enabled: boolean;
};

const DEFAULTS: SiteSettings = {
  id: "global",
  pricing_mode: "paid",
  free_mode_message: null,
  payments_enabled: true,
};

/** Global platform switches controlled from the admin site. */
export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", "global")
      .maybeSingle();
    if (data) setSettings(data as SiteSettings);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return {
    settings,
    loading,
    freeMode: settings.pricing_mode === "free",
    refresh: load,
  };
}

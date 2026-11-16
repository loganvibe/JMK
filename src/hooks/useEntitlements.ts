import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchCreditBalance } from "@/lib/credits";

export type Plan = {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  description: string | null;
  features: string[];
  ai_limits: Record<string, unknown>;
  sort_order: number;
  active?: boolean;
};

export const WEEKLY_PLAN_SLUG = "weekly_support";

export type FeatureKey =
  | "topic_generation"
  | "chapter_generation"
  | "refinement"
  | "quality_check"
  | "academic_assist"
  | "citation"
  | "defense_simulation"
  | "defense_basic"
  | "originality"
  | "literature"
  | "data_analysis"
  | "export";

export const FEATURE_LABEL: Record<FeatureKey, string> = {
  topic_generation: "AI topic generation",
  chapter_generation: "Project chapter assistance",
  academic_assist: "Academic research assistance",
  citation: "Citation assistance",
  quality_check: "Project quality checks",
  refinement: "Project refinement",
  defense_basic: "Project defence preparation",
  defense_simulation: "Mock defence and AI tools",
  originality: "Originality checks",
  literature: "Literature assistance",
  data_analysis: "Methodology and data analysis assistance",
  export: "Project exports",
};

export const formatNaira = (amount: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);

export function useEntitlements() {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [creditsRemaining, setCreditsRemaining] = useState(0);
  const [creditsTotal, setCreditsTotal] = useState(50);
  const [accessExpiresAt, setAccessExpiresAt] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [featureSettings, setFeatureSettings] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const [subRes, planRes, balanceRes, featuresRes] = await Promise.all([
      supabase
        .from("user_subscriptions")
        .select("*, subscription_plans(*)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("subscription_plans").select("*").eq("slug", WEEKLY_PLAN_SLUG).maybeSingle(),
      fetchCreditBalance(user.id),
      supabase.from("ai_feature_settings").select("feature_key, enabled"),
    ]);

    const weeklyPlan = (planRes.data as Plan | null) ?? null;
    const active = subRes.data as any;
    const expired = active?.expiry_date ? new Date(active.expiry_date).getTime() <= Date.now() : true;
    const effectiveExpiry = balanceRes.accessExpiresAt ?? active?.expiry_date ?? null;
    const effectiveExpired = effectiveExpiry ? new Date(effectiveExpiry).getTime() <= Date.now() : true;

    setPlan(weeklyPlan);
    setSubscription(!expired ? active : null);
    setCreditsTotal(Number((weeklyPlan?.ai_limits as any)?.credits ?? balanceRes.creditsTotal ?? 50));
    setCreditsRemaining(effectiveExpired ? 0 : balanceRes.creditsRemaining);
    setAccessExpiresAt(effectiveExpiry);
    setFeatureSettings((featuresRes.data ?? []).reduce((acc, f) => ({ ...acc, [f.feature_key]: f.enabled }), {} as Record<string, boolean>));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const hasActiveAccess = !!accessExpiresAt && new Date(accessExpiresAt).getTime() > Date.now() && creditsRemaining >= 0;
  const canUseAI = hasActiveAccess && creditsRemaining > 0;

  const can = (_feature: FeatureKey) => hasActiveAccess; // all AI features available while access active; credits enforced server-side
  const isFeatureEnabled = (feature: FeatureKey) => featureSettings[feature] !== false;
  const canUseChapter = (_chapter: string) => true;

  return {
    loading,
    plan,
    slug: WEEKLY_PLAN_SLUG,
    rank: hasActiveAccess ? 2 : 0,
    subscription,
    userId,
    freeMode: false,
    creditsUsed: Math.max(0, creditsTotal - creditsRemaining),
    creditsLimit: creditsTotal,
    creditsRemaining,
    creditsTotal,
    accessExpiresAt,
    hasActiveAccess,
    canUseAI,
    maxProjects: 999,
    can,
    canUseChapter,
    isFeatureEnabled,
    refresh: load,
  };
}

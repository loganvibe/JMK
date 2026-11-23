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
export const FREE_PLAN_SLUG = "free";

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

// Minimum plan rank required per feature (matches backend FEATURE_RULES).
export const FEATURE_MIN_RANK: Record<FeatureKey, number> = {
  topic_generation: 0,
  chapter_generation: 0,
  academic_assist: 0,
  citation: 0,
  quality_check: 1,
  refinement: 1,
  defense_basic: 1,
  defense_simulation: 2,
  originality: 1,
  literature: 1,
  data_analysis: 2,
  export: 0,
};

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
  const [creditsTotal, setCreditsTotal] = useState(0);
  const [accessExpiresAt, setAccessExpiresAt] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [featureSettings, setFeatureSettings] = useState<Record<string, boolean>>({});
  const [isFree, setIsFree] = useState(false);

  const loadEntitlements = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const [subRes, weeklyPlanRes, balanceRes, featuresRes, freePlanRes] = await Promise.all([
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
      supabase.from("subscription_plans").select("*").eq("slug", FREE_PLAN_SLUG).maybeSingle(),
    ]);

    const activeSub = subRes.data as any;
    const weeklyPlan = (weeklyPlanRes.data as Plan | null) ?? null;
    const freePlan = (freePlanRes.data as Plan | null) ?? null;
    const expired = activeSub?.expiry_date ? new Date(activeSub.expiry_date).getTime() <= Date.now() : true;

    // Determine effective plan: weekly if active and not expired, otherwise free
    const planIsFree = expired || !activeSub;
    const effectivePlan = planIsFree ? freePlan : weeklyPlan;

    const effectiveExpiry = balanceRes.accessExpiresAt ?? activeSub?.expiry_date ?? null;
    const effectiveExpired = effectiveExpiry ? new Date(effectiveExpiry).getTime() <= Date.now() : true;

    const creditsTotalValue = planIsFree
      ? Number((effectivePlan?.ai_limits as any)?.credits ?? 10)
      : Number((weeklyPlan?.ai_limits as any)?.credits ?? balanceRes.creditsTotal ?? 50);

    // Free users always have access (daily credits); weekly contributors need non-expired access
    const hasActiveAccess = planIsFree || (!!effectiveExpiry && !effectiveExpired);

    setPlan(effectivePlan);
    setSubscription(!expired ? activeSub : null);
    setCreditsTotal(creditsTotalValue);
    setCreditsRemaining(balanceRes.creditsRemaining);
    setAccessExpiresAt(planIsFree ? null : effectiveExpiry);
    setIsFree(planIsFree);
    setFeatureSettings((featuresRes.data ?? []).reduce((acc, f) => ({ ...acc, [f.feature_key]: f.enabled }), {} as Record<string, boolean>));
    setLoading(false);
  }, []);

  useEffect(() => { loadEntitlements(); }, [loadEntitlements]);

  const hasActiveAccess = isFree || (!!accessExpiresAt && new Date(accessExpiresAt).getTime() > Date.now() && creditsRemaining >= 0);
  const canUseAI = hasActiveAccess && creditsRemaining > 0;

  const can = (feature: FeatureKey) => {
    if (!canUseAI) return false;
    const minRank = FEATURE_MIN_RANK[feature] ?? 0;
    const userRank = isFree ? 0 : 2;
    return userRank >= minRank;
  };

  const isFeatureEnabled = (feature: FeatureKey) => featureSettings[feature] !== false;

  const canUseChapter = (chapter: string | null) => {
    if (!canUseAI) return false;
    if (isFree) {
      const m = String(chapter ?? "").match(/chapter\s*(\d+)/i);
      const chapterNum = m ? `chapter${m[1]}` : null;
      const allowed = (plan?.ai_limits as any)?.chapters ?? ["chapter1"];
      return chapterNum ? allowed.includes(chapterNum) : allowed.includes("chapter1");
    }
    return true;
  };

  return {
    loading,
    plan,
    slug: isFree ? FREE_PLAN_SLUG : WEEKLY_PLAN_SLUG,
    rank: isFree ? 0 : (hasActiveAccess ? 2 : 0),
    subscription,
    userId,
    isFree,
    freeMode: false,
    creditsUsed: Math.max(0, creditsTotal - creditsRemaining),
    creditsLimit: creditsTotal,
    creditsRemaining,
    creditsTotal,
    accessExpiresAt,
    hasActiveAccess,
    canUseAI,
    maxProjects: isFree ? 1 : 999,
    can,
    canUseChapter,
    isFeatureEnabled,
    refresh: loadEntitlements,
  };
}

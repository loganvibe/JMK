import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Plan = {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  description: string | null;
  features: string[];
  ai_limits: Record<string, any>;
  sort_order: number;
};

export const PLAN_RANK: Record<string, number> = {
  free: 0,
  custom: 0,
  student: 1,
  premium_plus: 2,
};

export type FeatureKey =
  | "topic_generation"
  | "chapter_generation"
  | "refinement"
  | "quality_check"
  | "academic_assist"
  | "citation"
  | "defense_simulation"
  | "defense_basic"
  | "export";

export const FEATURE_MIN_RANK: Record<FeatureKey, number> = {
  topic_generation: 0,
  chapter_generation: 0,
  academic_assist: 0,
  citation: 0,
  quality_check: 1,
  refinement: 1,
  defense_basic: 1,
  defense_simulation: 2,
  export: 1,
};

export const FEATURE_LABEL: Record<FeatureKey, string> = {
  topic_generation: "AI topic generation",
  chapter_generation: "Chapter generation",
  academic_assist: "Academic assistant",
  citation: "Citation tools",
  quality_check: "Academic quality check",
  refinement: "AI project refinement",
  defense_basic: "Defense preparation",
  defense_simulation: "Mock defense simulation",
  export: "PDF / Word export",
};

export const formatNaira = (amount: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);

export function useEntitlements() {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const [subRes, freeRes, usageRes] = await Promise.all([
      supabase
        .from("user_subscriptions")
        .select("*, subscription_plans(*)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("subscription_plans").select("*").eq("slug", "free").maybeSingle(),
      supabase
        .from("ai_usage_logs")
        .select("credits_used")
        .eq("user_id", user.id)
        .gte("created_at", monthStart.toISOString()),
    ]);

    const active: any = subRes.data;
    const expired = active?.expiry_date ? new Date(active.expiry_date).getTime() < Date.now() : false;
    const resolved = !expired && active?.subscription_plans ? active.subscription_plans : freeRes.data;

    setSubscription(expired ? null : active);
    setPlan((resolved as Plan) ?? null);
    setCreditsUsed((usageRes.data ?? []).reduce((s, r: any) => s + (r.credits_used || 0), 0));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const slug = plan?.slug ?? "free";
  const rank = PLAN_RANK[slug] ?? 0;
  const creditsLimit = Number(plan?.ai_limits?.credits ?? 10);
  const creditsRemaining = Math.max(0, creditsLimit - creditsUsed);

  const can = (feature: FeatureKey) => rank >= FEATURE_MIN_RANK[feature];
  const canUseChapter = (chapter: string) => {
    const allowed = plan?.ai_limits?.chapters;
    if (!Array.isArray(allowed)) return true;
    // Plans store "chapter1"; the UI passes labels like "Chapter 1: Introduction".
    const key = (s: string) => {
      const m = /chapter\s*[-_]?\s*([1-9])/i.exec(String(s));
      return m ? `chapter${m[1]}` : null;
    };
    const wanted = key(chapter);
    if (!wanted) return true; // Abstract, references, defense… are never chapter-gated
    const list = allowed.map(key).filter(Boolean) as string[];
    return !list.length || list.includes(wanted);
  };


  return {
    loading, plan, slug, rank, subscription, userId,
    creditsUsed, creditsLimit, creditsRemaining,
    maxProjects: Number(plan?.ai_limits?.max_projects ?? 1),
    can, canUseChapter, refresh: load,
  };
}

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Settings, TrendingUp, DollarSign, AlertTriangle, Cpu } from "lucide-react";

type FeatureSetting = {
  feature_key: string;
  provider_id: string | null;
  model_id: string | null;
  enabled: boolean;
  credits: number;
  max_input_tokens: number;
  max_output_tokens: number;
  daily_limit: number | null;
  monthly_limit: number | null;
};

type Model = {
  id: string;
  provider_id: string;
  model_id: string;
  label: string;
  tier: string;
  active: boolean;
};

type Pricing = {
  provider: string;
  model: string;
  input_price_per_1k: number;
  output_price_per_1k: number;
};

type Budget = {
  provider: string;
  monthly_budget: number;
  warning_threshold: number;
  hard_limit: number;
  current_spend: number;
};

type Usage = {
  provider: string;
  model: string;
  date: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
};

const FEATURE_LABELS: Record<string, string> = {
  topic_generation: "Topic Generation",
  chapter_generation: "Chapter Generation",
  refinement: "Project Refinement",
  academic_assist: "Academic Assistant",
  citation: "Citation Tools",
  quality_check: "Quality Check",
  defense_basic: "Defense Preparation",
  defense_simulation: "Mock Defense Simulation",
  originality: "Originality Checker",
  literature: "Literature Finder",
  data_analysis: "Data Analysis",
};

const OPENROUTER_DEFAULT_MODEL = "meta-llama/llama-3.1-70b-instruct";

const AdminAI = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [features, setFeatures] = useState<FeatureSetting[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [pricing, setPricing] = useState<Pricing[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [activeTab, setActiveTab] = useState("features");

  const [error, setError] = useState<string | null>(null);
  const [savingModel, setSavingModel] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [featuresRes, modelsRes, pricingRes, budgetsRes, usageRes] = await Promise.all([
        supabase.from("ai_feature_settings").select("*").order("feature_key"),
        supabase.from("ai_models").select("*").order("sort_order"),
        supabase.from("ai_provider_pricing").select("*"),
        supabase.from("ai_provider_budgets").select("*"),
        supabase.from("ai_provider_usage").select("*").order("date", { ascending: false }).limit(30),
      ]);

      setFeatures((featuresRes.data ?? []) as FeatureSetting[]);
      setModels((modelsRes.data ?? []) as Model[]);
      setPricing((pricingRes.data ?? []) as Pricing[]);
      setBudgets((budgetsRes.data ?? []) as Budget[]);
      setUsage((usageRes.data ?? []) as Usage[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load AI settings";
      setError(msg);
      toast({ title: "Could not load AI data", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const saveFeature = async (feature: FeatureSetting) => {
    setSaving(true);
    const { error } = await supabase
      .from("ai_feature_settings")
      .update({
        model_id: feature.model_id,
        enabled: feature.enabled,
        credits: feature.credits,
        max_input_tokens: feature.max_input_tokens,
        max_output_tokens: feature.max_output_tokens,
        daily_limit: feature.daily_limit,
        monthly_limit: feature.monthly_limit,
      })
      .eq("feature_key", feature.feature_key);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: `${FEATURE_LABELS[feature.feature_key] ?? feature.feature_key} updated` });
  };

  const updateFeature = (featureKey: string, values: Partial<FeatureSetting>) => {
    setFeatures((list) => list.map((f) => (f.feature_key === featureKey ? { ...f, ...values } : f)));
  };

  const totalMonthlySpend = usage.reduce((s, u) => s + Number(u.estimated_cost || 0), 0);
  const totalRequests = usage.reduce((s, u) => s + Number(u.requests || 0), 0);

  if (loading) {
    return (
      <div className="py-16 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 space-y-4">
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-sm text-destructive">
          <p className="font-medium mb-1">AI tables not found</p>
          <p>Run the Supabase migrations in <code>supabase/migrations/</code> to create the AI provider tables, then refresh this page.</p>
        </div>
        <Button size="sm" onClick={loadAll}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground">Total requests (30d)</span>
          </div>
          <p className="text-2xl font-bold">{totalRequests}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground">Est. cost (30d)</span>
          </div>
          <p className="text-2xl font-bold">${totalMonthlySpend.toFixed(2)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground">AI Provider</span>
          </div>
          <p className="text-2xl font-bold">OpenRouter</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground">Features enabled</span>
          </div>
          <p className="text-2xl font-bold">{features.filter((f) => f.enabled).length}/{features.length}</p>
        </Card>
      </div>

      <div className="border border-border rounded-xl p-1 bg-muted/20 inline-flex">
        <Button variant={activeTab === "features" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("features")}>
          Feature Settings
        </Button>
        <Button variant={activeTab === "models" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("models")}>
          Models
        </Button>
        <Button variant={activeTab === "budgets" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("budgets")}>
          Budgets
        </Button>
        <Button variant={activeTab === "usage" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("usage")}>
          Usage
        </Button>
      </div>

      {activeTab === "features" && (
        <div className="space-y-4">
          <Card className="p-4 border border-border">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-accent mt-0.5" />
              <div>
                <h3 className="font-semibold">OpenRouter is the sole AI provider</h3>
                <p className="text-sm text-muted-foreground">
                  The OpenRouter API key is configured as a server-side environment variable
                  (<code>OPENROUTER_API_KEY</code>) and is never stored in or displayed from the database.
                  Administrators configure which OpenRouter model each feature uses below.
                </p>
              </div>
            </div>
          </Card>

          {features.map((feature) => {
            return (
              <Card key={feature.feature_key} className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{FEATURE_LABELS[feature.feature_key] ?? feature.feature_key}</h3>
                    <p className="text-xs text-muted-foreground">Feature key: {feature.feature_key}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{feature.enabled ? "Enabled" : "Disabled"}</span>
                    <Switch
                      checked={feature.enabled}
                      onCheckedChange={(v) => updateFeature(feature.feature_key, { enabled: v })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>OpenRouter Model</Label>
                    <Select
                      value={feature.model_id ?? "none"}
                      onValueChange={(v) => updateFeature(feature.feature_key, { model_id: v === "none" ? null : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Use default model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Use default ({OPENROUTER_DEFAULT_MODEL})</SelectItem>
                        {models.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.label} ({m.tier})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Credits per request</Label>
                    <Input
                      type="number"
                      value={String(feature.credits)}
                      onChange={(e) => updateFeature(feature.feature_key, { credits: Number(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Max input tokens</Label>
                    <Input
                      type="number"
                      value={String(feature.max_input_tokens)}
                      onChange={(e) => updateFeature(feature.feature_key, { max_input_tokens: Number(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Max output tokens</Label>
                    <Input
                      type="number"
                      value={String(feature.max_output_tokens)}
                      onChange={(e) => updateFeature(feature.feature_key, { max_output_tokens: Number(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Daily limit (per user)</Label>
                    <Input
                      type="number"
                      value={feature.daily_limit ?? ""}
                      placeholder="Unlimited"
                      onChange={(e) => updateFeature(feature.feature_key, { daily_limit: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Monthly limit (per user)</Label>
                    <Input
                      type="number"
                      value={feature.monthly_limit ?? ""}
                      placeholder="Unlimited"
                      onChange={(e) => updateFeature(feature.feature_key, { monthly_limit: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <Button size="sm" onClick={() => saveFeature(feature)} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                    Save {FEATURE_LABELS[feature.feature_key] ?? feature.feature_key}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === "models" && (
        <div className="space-y-4">
          {models.length === 0 && (
            <p className="text-sm text-muted-foreground">No models configured yet.</p>
          )}
          {models.map((model) => {
            const price = pricing.find((p) => p.model === model.model_id);
            const isFree = (price?.input_price_per_1k ?? 0) === 0 && (price?.output_price_per_1k ?? 0) === 0;
            return (
              <Card key={model.id} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{model.label}</h3>
                    <p className="text-xs text-muted-foreground">
                      OpenRouter · {model.tier} · {model.model_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={model.active ? "default" : "secondary"}>
                      {model.active ? "Active" : "Inactive"}
                    </Badge>
                    {isFree && (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-600">FREE</Badge>
                    )}
                  </div>
                </div>
                {price && (
                  <p className="text-xs text-muted-foreground">
                    Pricing: ${price.input_price_per_1k}/1k input · ${price.output_price_per_1k}/1k output
                  </p>
                )}
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant={model.active ? "outline" : "default"}
                    onClick={async () => {
                      setSavingModel(model.id);
                      const { error } = await supabase
                        .from("ai_models")
                        .update({ active: !model.active })
                        .eq("id", model.id);
                      setSavingModel(null);
                      if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
                      toast({ title: `Model ${model.active ? "deactivated" : "activated"}` });
                      loadAll();
                    }}
                    disabled={savingModel === model.id}
                  >
                    {savingModel === model.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    {model.active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === "budgets" && (
        <div className="space-y-4">
          {budgets.length === 0 && (
            <p className="text-sm text-muted-foreground">No budgets configured yet.</p>
          )}
          {budgets.map((budget) => {
            const percentUsed = budget.monthly_budget > 0 ? (budget.current_spend / budget.monthly_budget) * 100 : 0;
            const isOver = percentUsed >= budget.hard_limit * 100;
            const isWarning = percentUsed >= budget.warning_threshold * 100;
            return (
              <Card key={budget.provider} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{budget.provider}</h3>
                  {isOver && <Badge variant="destructive">Over budget</Badge>}
                  {isWarning && !isOver && <Badge variant="secondary">Warning</Badge>}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Monthly budget</span>
                    <span>${budget.monthly_budget.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Current spend</span>
                    <span>${budget.current_spend.toFixed(2)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className={`h-2 rounded-full ${isOver ? "bg-destructive" : isWarning ? "bg-yellow-500" : "bg-primary"}`}
                      style={{ width: `${Math.min(percentUsed, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {percentUsed.toFixed(1)}% used · Hard limit: {budget.hard_limit * 100}% · Warning: {budget.warning_threshold * 100}%
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === "usage" && (
        <div className="space-y-4">
          {usage.length === 0 && (
            <p className="text-sm text-muted-foreground">No usage recorded yet.</p>
          )}
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Provider</th>
                  <th className="text-left p-3">Model</th>
                  <th className="text-right p-3">Requests</th>
                  <th className="text-right p-3">Input tokens</th>
                  <th className="text-right p-3">Output tokens</th>
                  <th className="text-right p-3">Cost</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((u, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-3">{u.date}</td>
                    <td className="p-3">{u.provider}</td>
                    <td className="p-3">{u.model}</td>
                    <td className="p-3 text-right">{u.requests}</td>
                    <td className="p-3 text-right">{u.input_tokens.toLocaleString()}</td>
                    <td className="p-3 text-right">{u.output_tokens.toLocaleString()}</td>
                    <td className="p-3 text-right">${u.estimated_cost.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAI;

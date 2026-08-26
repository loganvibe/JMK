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
import { Loader2, Save, Settings, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";

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

type Provider = {
  id: string;
  vendor: string;
  type: string;
  active: boolean;
  priority: number;
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

const AdminAI = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [features, setFeatures] = useState<FeatureSetting[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [pricing, setPricing] = useState<Pricing[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [activeTab, setActiveTab] = useState("features");

  const [error, setError] = useState<string | null>(null);
  const [providerApiKeys, setProviderApiKeys] = useState<Record<string, string>>({});
  const [providerConfigs, setProviderConfigs] = useState<Record<string, Record<string, unknown>>>({});
  const [savingProvider, setSavingProvider] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [featuresRes, providersRes, modelsRes, pricingRes, budgetsRes, usageRes] = await Promise.all([
        supabase.from("ai_feature_settings").select("*").order("feature_key"),
        supabase.from("ai_providers").select("*").order("priority"),
        supabase.from("ai_models").select("*").order("sort_order"),
        supabase.from("ai_provider_pricing").select("*"),
        supabase.from("ai_provider_budgets").select("*"),
        supabase.from("ai_provider_usage").select("*").order("date", { ascending: false }).limit(30),
      ]);

      setFeatures((featuresRes.data ?? []) as FeatureSetting[]);
      setProviders((providersRes.data ?? []) as Provider[]);
      setModels((modelsRes.data ?? []) as Model[]);
      setPricing((pricingRes.data ?? []) as Pricing[]);
      setBudgets((budgetsRes.data ?? []) as Budget[]);
      setUsage((usageRes.data ?? []) as Usage[]);

      const apiKeys: Record<string, string> = {};
      const configs: Record<string, Record<string, unknown>> = {};
      (providersRes.data ?? []).forEach((p: Record<string, unknown>) => {
        apiKeys[String(p.id)] = String(p.api_key ?? "");
        configs[String(p.id)] = (p.config as Record<string, unknown>) ?? {};
      });
      setProviderApiKeys(apiKeys);
      setProviderConfigs(configs);
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
        provider_id: feature.provider_id,
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

  const getModelsForProvider = (providerId: string | null) => {
    if (!providerId) return [];
    return models.filter((m) => m.provider_id === providerId);
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
            <Settings className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground">Active providers</span>
          </div>
          <p className="text-2xl font-bold">{providers.filter((p) => p.active).length}</p>
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
        <Button variant={activeTab === "providers" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("providers")}>
          Providers
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
          {features.map((feature) => {
            const providerModels = getModelsForProvider(feature.provider_id);
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
                    <Label>Provider</Label>
                    <Select
                      value={feature.provider_id ?? "none"}
                      onValueChange={(v) => updateFeature(feature.feature_key, { provider_id: v === "none" ? null : v, model_id: null })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {providers.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.vendor} ({p.type})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Select
                      value={feature.model_id ?? "none"}
                      onValueChange={(v) => updateFeature(feature.feature_key, { model_id: v === "none" ? null : v })}
                      disabled={!feature.provider_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {providerModels.map((m) => (
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

      {activeTab === "providers" && (
        <div className="space-y-4">
          {providers.length === 0 && (
            <p className="text-sm text-muted-foreground">No providers configured yet.</p>
          )}
          {providers.map((provider) => (
            <Card key={provider.id} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{provider.vendor}</h3>
                  <p className="text-xs text-muted-foreground">Type: {provider.type} · Priority: {provider.priority}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{provider.active ? "Active" : "Inactive"}</span>
                  <Switch
                    checked={provider.active}
                    onCheckedChange={async (v) => {
                      const { error } = await supabase
                        .from("ai_providers")
                        .update({ active: v })
                        .eq("id", provider.id);
                      if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
                      toast({ title: `${provider.vendor} ${v ? "activated" : "deactivated"}` });
                      loadAll();
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`api-key-${provider.id}`}>API Key</Label>
                  <Input
                    id={`api-key-${provider.id}`}
                    type="password"
                    placeholder={provider.type === "ollama" ? "Not required for local Ollama" : "sk-..."}
                    value={providerApiKeys[provider.id] ?? ""}
                    onChange={(e) => setProviderApiKeys((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                  />
                </div>

                {provider.type === "ollama" && (
                  <div className="space-y-2">
                    <Label htmlFor={`base-url-${provider.id}`}>Base URL</Label>
                    <Input
                      id={`base-url-${provider.id}`}
                      placeholder="http://localhost:11434"
                      value={String(providerConfigs[provider.id]?.base_url ?? "http://localhost:11434")}
                      onChange={(e) => setProviderConfigs((prev) => ({
                        ...prev,
                        [provider.id]: { ...(prev[provider.id] ?? {}), base_url: e.target.value },
                      }))}
                    />
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={async () => {
                    setSavingProvider(provider.id);
                    const { error } = await supabase
                      .from("ai_providers")
                      .update({
                        api_key: providerApiKeys[provider.id] ?? "",
                        config: providerConfigs[provider.id] ?? {},
                      })
                      .eq("id", provider.id);
                    setSavingProvider(null);
                    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
                    toast({ title: `${provider.vendor} saved` });
                  }}
                  disabled={savingProvider === provider.id}
                >
                  {savingProvider === provider.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <><Save className="w-4 h-4 mr-1" />Save {provider.vendor}</>}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {provider.type === "ollama"
                    ? "Ollama runs locally. Make sure your Ollama server is accessible and the model is pulled (e.g., ollama pull llama3.1)."
                    : "API keys are stored server-side only and never exposed to the browser."}
                </p>
              </div>
            </Card>
          ))}

          <Card className="p-5">
            <h3 className="font-semibold mb-4">Add New Provider</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Input
                  placeholder="e.g., my-custom-provider"
                  id="new-vendor"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select defaultValue="openai" id="new-type">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ollama">Ollama</SelectItem>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="groq">Groq</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>API Key (optional)</Label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  id="new-api-key"
                />
              </div>
            </div>
            <Button
              size="sm"
              className="mt-4"
              onClick={async () => {
                const vendor = (document.getElementById("new-vendor") as HTMLInputElement)?.value;
                const type = (document.getElementById("new-type") as HTMLSelectElement)?.value;
                const apiKey = (document.getElementById("new-api-key") as HTMLInputElement)?.value;

                if (!vendor) return toast({ title: "Vendor is required", variant: "destructive" });

                const { error } = await supabase
                  .from("ai_providers")
                  .insert({
                    vendor,
                    type,
                    api_key: apiKey || "",
                    active: false,
                    priority: 99,
                    config: type === "ollama" ? { base_url: "http://localhost:11434" } : {},
                  });

                if (error) return toast({ title: "Failed to add provider", description: error.message, variant: "destructive" });
                toast({ title: "Provider added" });
                loadAll();
              }}
            >
              Add Provider
            </Button>
          </Card>
        </div>
      )}

      {activeTab === "models" && (
        <div className="space-y-4">
          {models.length === 0 && (
            <p className="text-sm text-muted-foreground">No models configured yet.</p>
          )}
          {models.map((model) => {
            const provider = providers.find((p) => p.id === model.provider_id);
            const price = pricing.find((p) => p.provider === provider?.vendor && p.model === model.model_id);
            return (
              <Card key={model.id} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{model.label}</h3>
                    <p className="text-xs text-muted-foreground">
                      {provider?.vendor} · {model.tier} · {model.model_id}
                    </p>
                  </div>
                  <Badge variant={model.active ? "default" : "secondary"}>
                    {model.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {price && (
                  <p className="text-xs text-muted-foreground">
                    Pricing: ${price.input_price_per_1k}/1k input · ${price.output_price_per_1k}/1k output
                  </p>
                )}
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

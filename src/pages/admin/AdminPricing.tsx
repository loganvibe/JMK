import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/hooks/useEntitlements";
import { Gift, Loader2, Save, Wallet } from "lucide-react";

type PlanRow = {
  id: string;
  slug: string;
  name: string;
  price: number;
  description: string | null;
  active: boolean;
  sort_order: number;
};

/** Admin controls: global free/paid mode and per-plan pricing. */
const AdminPricing = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingPlan, setSavingPlan] = useState<string | null>(null);

  const [freeMode, setFreeMode] = useState(false);
  const [paymentsEnabled, setPaymentsEnabled] = useState(true);
  const [message, setMessage] = useState("");
  const [plans, setPlans] = useState<PlanRow[]>([]);

  const load = async () => {
    const [{ data: settings }, { data: rows }] = await Promise.all([
      supabase.from("app_settings").select("*").eq("id", "global").maybeSingle(),
      supabase.from("subscription_plans").select("*").order("sort_order"),
    ]);
    if (settings) {
      setFreeMode(settings.pricing_mode === "free");
      setPaymentsEnabled(!!settings.payments_enabled);
      setMessage(settings.free_mode_message ?? "");
    }
    setPlans((rows as PlanRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveSettings = async (next?: Partial<{ freeMode: boolean; paymentsEnabled: boolean }>) => {
    const mode = (next?.freeMode ?? freeMode) ? "free" : "paid";
    const pay = next?.paymentsEnabled ?? paymentsEnabled;
    setSavingSettings(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ pricing_mode: mode, payments_enabled: pay, free_mode_message: message })
      .eq("id", "global");
    setSavingSettings(false);
    if (error) return toast({ title: "Could not save", description: error.message, variant: "destructive" });
    toast({
      title: mode === "free" ? "Platform is now free for everyone" : "Paid plans are active",
      description: mode === "free"
        ? "All premium features are unlocked for every student."
        : "Students now need a paid plan for premium features.",
    });
  };

  const updatePlan = async (plan: PlanRow) => {
    setSavingPlan(plan.id);
    const { error } = await supabase
      .from("subscription_plans")
      .update({
        name: plan.name,
        price: Number(plan.price) || 0,
        description: plan.description,
        active: plan.active,
      })
      .eq("id", plan.id);
    setSavingPlan(null);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    toast({ title: `${plan.name} updated` });
  };

  const patch = (id: string, values: Partial<PlanRow>) =>
    setPlans((list) => list.map((p) => (p.id === id ? { ...p, ...values } : p)));

  if (loading) return <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      <div className="border border-border rounded-xl p-5 bg-card space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading font-bold text-foreground flex items-center gap-2">
              <Gift className="w-4 h-4 text-accent" /> Free for everyone
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Turn this on to unlock every premium feature for all students, ignoring plans and AI credit limits.
              Turn it off to go back to paid subscriptions.
            </p>
          </div>
          <Switch
            checked={freeMode}
            onCheckedChange={(v) => { setFreeMode(v); saveSettings({ freeMode: v }); }}
            disabled={savingSettings}
          />
        </div>

        <div className="flex items-start justify-between gap-4 pt-4 border-t border-border">
          <div>
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4 text-accent" /> Payments enabled
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Disable to hide checkout buttons while you make pricing changes.
            </p>
          </div>
          <Switch
            checked={paymentsEnabled}
            onCheckedChange={(v) => { setPaymentsEnabled(v); saveSettings({ paymentsEnabled: v }); }}
            disabled={savingSettings}
          />
        </div>

        <div className="space-y-2 pt-4 border-t border-border">
          <Label htmlFor="free-msg">Banner message shown while free mode is on</Label>
          <Textarea id="free-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={2} />
          <Button size="sm" onClick={() => saveSettings()} disabled={savingSettings}>
            {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" />Save message</>}
          </Button>
        </div>

        <Badge variant={freeMode ? "default" : "secondary"}>
          Current mode: {freeMode ? "Everything free" : "Paid plans"}
        </Badge>
      </div>

      <div className="space-y-3">
        <h2 className="font-heading font-bold text-foreground">Plan pricing</h2>
        {plans.map((p) => (
          <div key={p.id} className="border border-border rounded-xl p-4 bg-card space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{p.name} <span className="text-xs text-muted-foreground">({p.slug})</span></p>
                <p className="text-xs text-muted-foreground">
                  {freeMode ? "Free while free mode is on" : formatNaira(Number(p.price) || 0)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Active</span>
                <Switch checked={p.active} onCheckedChange={(v) => patch(p.id, { active: v })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Input value={p.name} onChange={(e) => patch(p.id, { name: e.target.value })} placeholder="Plan name" />
              <Input
                type="number" min={0} value={String(p.price ?? 0)}
                onChange={(e) => patch(p.id, { price: Number(e.target.value) })}
                placeholder="Price (₦)"
              />
              <Input
                value={p.description ?? ""}
                onChange={(e) => patch(p.id, { description: e.target.value })}
                placeholder="Short description"
              />
              <Button onClick={() => updatePlan(p)} disabled={savingPlan === p.id}>
                {savingPlan === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" />Save</>}
              </Button>
            </div>
          </div>
        ))}
        {plans.length === 0 && <p className="text-sm text-muted-foreground">No plans configured yet.</p>}
      </div>
    </div>
  );
};

export default AdminPricing;

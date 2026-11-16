import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/hooks/useEntitlements";
import { HeartHandshake, Loader2, Save, Wallet } from "lucide-react";

type PlanRow = { id: string; slug: string; name: string; price: number; description: string | null; active: boolean; ai_limits: any };

/** Admin controls: weekly contribution configuration and payment availability. */
const AdminPricing = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [paymentsEnabled, setPaymentsEnabled] = useState(true);
  const [plan, setPlan] = useState<PlanRow | null>(null);
  const [credits, setCredits] = useState(50);
  const [days, setDays] = useState(7);
  const [amount, setAmount] = useState(1500);

  const load = async () => {
    const [{ data: settings }, { data: row }] = await Promise.all([
      supabase.from("app_settings").select("*").eq("id", "global").maybeSingle(),
      supabase.from("subscription_plans").select("*").eq("slug", "weekly_support").maybeSingle(),
    ]);
    if (settings) setPaymentsEnabled(!!settings.payments_enabled);
    if (row) {
      const p = row as any as PlanRow;
      setPlan(p);
      setAmount(Number(p.price ?? 1500));
      setCredits(Number(p.ai_limits?.credits ?? 50));
      setDays(Number(p.ai_limits?.duration_days ?? 7));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveSettings = async (nextPayments?: boolean) => {
    const pay = nextPayments ?? paymentsEnabled;
    setSavingSettings(true);
    const { error } = await supabase.from("app_settings").update({ payments_enabled: pay, pricing_mode: "paid" }).eq("id", "global");
    setSavingSettings(false);
    if (error) return toast({ title: "Could not save", description: error.message, variant: "destructive" });
    toast({ title: "Settings saved", description: pay ? "Contributions are enabled." : "Contribution checkout is disabled." });
  };

  const savePlan = async () => {
    if (!plan) return;
    setSavingPlan(true);
    const ai_limits = { ...(plan.ai_limits ?? {}), credits: Number(credits) || 50, duration_days: Number(days) || 7, all_ai_features: true };
    const { error } = await supabase.from("subscription_plans").update({ name: "Support JMK", price: Number(amount) || 1500, description: `${credits} AI credits • ${days} days access`, active: true, ai_limits }).eq("id", plan.id);
    setSavingPlan(false);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    toast({ title: "Weekly contribution updated" });
    await load();
  };

  if (loading) return <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      <div className="border border-border rounded-xl p-5 bg-card space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading font-bold text-foreground flex items-center gap-2"><Wallet className="w-4 h-4 text-accent" /> Contributions enabled</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">Disable to temporarily prevent new contribution checkouts while keeping existing access/history intact.</p>
          </div>
          <Switch checked={paymentsEnabled} onCheckedChange={(v) => { setPaymentsEnabled(v); saveSettings(v); }} disabled={savingSettings} />
        </div>
        <Badge variant={paymentsEnabled ? "default" : "secondary"}>Checkout: {paymentsEnabled ? "enabled" : "disabled"}</Badge>
      </div>

      <div className="border border-border rounded-xl p-5 bg-card space-y-4">
        <div>
          <h2 className="font-heading font-bold text-foreground flex items-center gap-2"><HeartHandshake className="w-4 h-4 text-accent" /> Weekly contribution configuration</h2>
          <p className="text-sm text-muted-foreground mt-1">Configure the single contribution amount, AI credits granted, and access duration. Changes apply to new successful contributions.</p>
        </div>
        {plan ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label>Amount (₦)</Label><Input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
              <div><Label>AI credits granted</Label><Input type="number" min={1} value={credits} onChange={(e) => setCredits(Number(e.target.value))} /></div>
              <div><Label>Access duration (days)</Label><Input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} /></div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">Preview: <b className="text-foreground">Support JMK — {formatNaira(amount)} / {days} Days</b> grants <b className="text-foreground">{credits}</b> AI credits and access to all JMK AI features.</div>
            <Button onClick={savePlan} disabled={savingPlan}>{savingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" />Save configuration</>}</Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Weekly contribution plan not found. Run the weekly contribution migration.</p>
        )}
      </div>

      <div className="border border-border rounded-xl p-4 bg-card text-sm text-muted-foreground">
        Legacy subscription plans remain stored in the database for history but are deactivated from student-facing access. Contribution/payment records are never deleted.
      </div>
    </div>
  );
};

export default AdminPricing;

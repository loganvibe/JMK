import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, HeartHandshake, Loader2, Receipt, Gauge, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEntitlements, formatNaira } from "@/hooks/useEntitlements";
import NotificationBell from "@/components/notifications/NotificationBell";

const Billing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const ent = useEntitlements();
  const [plan, setPlan] = useState<any>(null);
  const [txns, setTxns] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const loadHistory = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }
    const [p, t] = await Promise.all([
      supabase.from("subscription_plans").select("*").eq("slug", "weekly_support").maybeSingle(),
      supabase.from("payment_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    ]);
    setPlan(p.data);
    setTxns(t.data ?? []);
  }, [navigate]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    const reference = params.get("reference") || params.get("trxref");
    if (!reference) return;
    (async () => {
      setVerifying(true);
      const { data, error } = await supabase.functions.invoke("payments", { body: { action: "verify", reference } });
      setVerifying(false);
      params.delete("reference"); params.delete("trxref"); setParams(params, { replace: true });
      if (error || data?.error) {
        toast({ title: "Verification failed", description: String(data?.error ?? error?.message ?? "Could not verify payment"), variant: "destructive" });
        return;
      }
      if (data?.status === "success") {
        toast({ title: "Contribution received", description: `You now have ${data?.credits_remaining ?? data?.credits_granted ?? 50} AI credits.` });
        await ent.refresh();
        await loadHistory();
      } else {
        toast({ title: "Payment not completed", description: "The transaction was not successful.", variant: "destructive" });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contribute = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("payments", {
      body: { action: "initialize", planSlug: "weekly_support", callbackUrl: `${window.location.origin}/billing` },
    });
    setBusy(false);
    if (error || data?.error) {
      toast({ title: "Could not start contribution", description: String(data?.error ?? error?.message ?? "Please try again"), variant: "destructive" });
      return;
    }
    window.location.href = data.authorization_url;
  };

  const amount = Number(plan?.price ?? 1500);
  const total = ent.creditsTotal || 50;
  const used = Math.max(0, Math.min(total, ent.creditsUsed));
  const creditPct = Math.min(100, Math.round((used / Math.max(1, total)) * 100));
  const expired = !ent.hasActiveAccess || (ent.accessExpiresAt ? new Date(ent.accessExpiresAt).getTime() <= Date.now() : true);
  const needsContribution = expired || ent.creditsRemaining <= 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container-main flex items-center justify-between py-4">
          <Button variant="ghost" size="sm" asChild><Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" /> Dashboard</Link></Button>
          <NotificationBell />
        </div>
      </header>

      <main className="container-main py-10 space-y-10">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground mb-2">Weekly Contribution</h1>
          <p className="text-muted-foreground">Manage your JMK access, AI credits and contribution history.</p>
        </div>

        {verifying && (
          <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
            <Loader2 className="w-5 h-5 animate-spin text-accent" /><p className="text-sm">Verifying your contribution…</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center"><HeartHandshake className="w-6 h-6 text-accent" /></div>
              <div><p className="text-sm text-muted-foreground">Current access</p><p className="font-heading font-bold text-foreground">{expired ? "Expired / inactive" : "Active (7 days)"}</p></div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              {ent.accessExpiresAt ? `Access ${expired ? "expired" : "expires"} on ${new Date(ent.accessExpiresAt).toLocaleString()}` : "No active weekly access"}
            </p>
            <p className="text-sm text-muted-foreground">Contributions support JMK’s continued development.</p>
            {needsContribution && (
              <Button variant="accent" size="sm" className="w-full mt-4" disabled={busy} onClick={contribute}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `Contribute ${formatNaira(amount)} & Get Access`}
              </Button>
            )}
          </div>

          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4"><Gauge className="w-5 h-5 text-accent" /><h3 className="font-heading font-semibold text-foreground">AI credits</h3></div>
            <div className="flex items-end justify-between mb-2">
              <p className="text-3xl font-heading font-bold text-foreground">{ent.creditsRemaining}<span className="text-base text-muted-foreground"> / {total} remaining</span></p>
              <Badge variant={ent.creditsRemaining <= 5 ? "destructive" : "secondary"}>{used} used</Badge>
            </div>
            <Progress value={creditPct} className="h-2" />
            <p className="text-xs text-muted-foreground mt-3">Each successful contribution grants {total} credits for 7 days. Credits expire after 7 days; unused credits do not carry over. A new contribution starts a fresh 7-day period with {total} credits.</p>
          </div>
        </div>

        <section>
          <h2 className="text-xl font-heading font-bold text-foreground mb-4">Contribution option</h2>
          <div className="max-w-xl rounded-2xl border border-accent bg-card p-6">
            <div className="flex items-center gap-3 mb-3"><HeartHandshake className="w-6 h-6 text-accent" /><h3 className="font-heading font-bold text-foreground">Support JMK — {formatNaira(amount)} / 7 Days</h3></div>
            <p className="text-sm text-muted-foreground mb-4">Contribution amount: {formatNaira(amount)} • AI credits granted: {total} • Access duration: 7 days • Access: All JMK AI features</p>
            <ul className="space-y-2 mb-6">
              {["All JMK AI features while access is active", "Credits are deducted per AI action", "Saved projects and previous work remain accessible after expiration", "Contributions support JMK’s continued development"].map((f) => (
                <li key={f} className="flex gap-2 text-sm text-muted-foreground"><Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" /> {f}</li>
              ))}
            </ul>
            <Button variant="accent" className="w-full" disabled={busy} onClick={contribute}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `Contribute ${formatNaira(amount)} & Get Access`}
            </Button>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4"><Receipt className="w-5 h-5 text-accent" /><h2 className="text-xl font-heading font-bold text-foreground">Contribution & payment history</h2></div>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {txns.length === 0 ? (
              <p className="p-8 text-center text-muted-foreground text-sm">No contributions yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {txns.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{(t.metadata?.plan_slug ?? t.transaction_type ?? "Contribution").toString().replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground truncate">{new Date(t.created_at).toLocaleString()} • {t.reference}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-foreground">{formatNaira(Number(t.amount))}</p>
                      <Badge variant={t.status === "success" ? "default" : t.status === "pending" ? "secondary" : "destructive"}>{t.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Billing;

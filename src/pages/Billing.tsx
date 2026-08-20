import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, CreditCard, Crown, Loader2, Receipt, Sparkles, Zap, Check, Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEntitlements, formatNaira, type Plan } from "@/hooks/useEntitlements";
import NotificationBell from "@/components/notifications/NotificationBell";

const planIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  free: Zap,
  student: Sparkles,
  premium_plus: Crown,
  custom: CreditCard,
};

const Billing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const ent = useEntitlements();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [txns, setTxns] = useState<unknown[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const loadHistory = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }
    const [p, t] = await Promise.all([
      supabase.from("subscription_plans").select("*").eq("active", true).order("sort_order"),
      supabase.from("payment_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setPlans((p.data as Plan[]) ?? []);
    setTxns(t.data ?? []);
  }, [navigate]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Handle Paystack callback ?reference=...
  useEffect(() => {
    const reference = params.get("reference") || params.get("trxref");
    if (!reference) return;
    (async () => {
      setVerifying(true);
      const { data, error } = await supabase.functions.invoke("payments", {
        body: { action: "verify", reference },
      });
      setVerifying(false);
      params.delete("reference");
      params.delete("trxref");
      setParams(params, { replace: true });
      if (error || data?.error) {
        toast({ title: "Verification failed", description: data?.error ?? error?.message, variant: "destructive" });
        return;
      }
      if (data?.status === "success") {
        toast({ title: "Payment successful 🎉", description: "Your subscription is now active." });
        ent.refresh();
        loadHistory();
      } else {
        toast({ title: "Payment not completed", description: "The transaction was not successful.", variant: "destructive" });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCheckout = async (slug: string) => {
    setBusy(slug);
    const { data, error } = await supabase.functions.invoke("payments", {
      body: { action: "initialize", planSlug: slug, callbackUrl: `${window.location.origin}/billing` },
    });
    setBusy(null);
    if (error || data?.error) {
      toast({ title: "Could not start payment", description: data?.error ?? error?.message, variant: "destructive" });
      return;
    }
    window.location.href = data.authorization_url;
  };

  const creditPct = Math.min(100, Math.round((ent.creditsUsed / Math.max(1, ent.creditsLimit)) * 100));
  const CurrentIcon = planIcon[ent.slug] ?? Zap;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container-main flex items-center justify-between py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" /> Dashboard</Link>
          </Button>
          <NotificationBell />
        </div>
      </header>

      <main className="container-main py-10 space-y-10">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground mb-2">Billing & Subscription</h1>
          <p className="text-muted-foreground">Manage your plan, AI credits and payment history.</p>
        </div>

        {verifying && (
          <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
            <p className="text-sm">Verifying your payment…</p>
          </div>
        )}

        {/* Current plan + credits */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <CurrentIcon className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current plan</p>
                <p className="font-heading font-bold text-foreground">{ent.plan?.name ?? "Free Trial"}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {ent.subscription?.expiry_date
                ? `Renews on ${new Date(ent.subscription.expiry_date).toLocaleDateString()}`
                : "No active paid subscription"}
            </p>
            {ent.slug !== "premium_plus" && (
              <Button variant="accent" size="sm" className="w-full mt-4" asChild>
                <Link to="/pricing">Upgrade plan</Link>
              </Button>
            )}
          </div>

          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Gauge className="w-5 h-5 text-accent" />
              <h3 className="font-heading font-semibold text-foreground">AI credit usage this month</h3>
            </div>
            <div className="flex items-end justify-between mb-2">
              <p className="text-3xl font-heading font-bold text-foreground">
                {ent.creditsUsed}<span className="text-base text-muted-foreground"> / {ent.creditsLimit}</span>
              </p>
              <Badge variant={creditPct >= 90 ? "destructive" : "secondary"}>
                {ent.creditsRemaining} credits left
              </Badge>
            </div>
            <Progress value={creditPct} className="h-2" />
            <p className="text-xs text-muted-foreground mt-3">
              Credits reset on the 1st of every month. Chapter generation costs 2 credits, refinement 3, most other AI actions 1.
            </p>
          </div>
        </div>

        {/* Plans */}
        <section>
          <h2 className="text-xl font-heading font-bold text-foreground mb-4">Available plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {plans.map((p) => {
              const Icon = planIcon[p.slug] ?? Zap;
              const isCurrent = p.slug === ent.slug;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border p-6 flex flex-col ${isCurrent ? "border-accent bg-accent/5" : "border-border bg-card"}`}
                >
                  <Icon className="w-6 h-6 text-accent mb-3" />
                  <h3 className="font-heading font-bold text-foreground">{p.name}</h3>
                  <p className="text-2xl font-heading font-bold text-foreground mt-1 mb-3">
                    {p.price > 0 ? formatNaira(p.price) : p.slug === "custom" ? "Quote" : "₦0"}
                    {p.price > 0 && <span className="text-sm font-normal text-muted-foreground">/month</span>}
                  </p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {(p.features ?? []).slice(0, 5).map((f, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" /> {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>Current plan</Button>
                  ) : p.slug === "custom" ? (
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/services">Request a quote</Link>
                    </Button>
                  ) : p.price > 0 ? (
                    <Button variant="accent" className="w-full" disabled={busy === p.slug} onClick={() => startCheckout(p.slug)}>
                      {busy === p.slug ? <Loader2 className="w-4 h-4 animate-spin" /> : `Subscribe`}
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>Default plan</Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* History */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-heading font-bold text-foreground">Payment history</h2>
          </div>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {txns.length === 0 ? (
              <p className="p-8 text-center text-muted-foreground text-sm">No payments yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {txns.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {(t.metadata?.plan_slug ?? t.transaction_type ?? "Payment").toString().replace("_", " ")}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {new Date(t.created_at).toLocaleString()} • {t.reference}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-foreground">{formatNaira(Number(t.amount))}</p>
                      <Badge variant={t.status === "success" ? "default" : t.status === "pending" ? "secondary" : "destructive"}>
                        {t.status}
                      </Badge>
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

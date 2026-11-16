import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, HeartHandshake, Loader2, LogOut, User, Crown as CrownIcon } from "lucide-react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEntitlements, formatNaira, type Plan } from "@/hooks/useEntitlements";

const AuthenticatedHeader = () => {
  const { userId, hasActiveAccess } = useEntitlements();
  const navigate = useNavigate();
  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };
  if (!userId) return null;
  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container-main">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow"><CrownIcon className="w-6 h-6 text-accent-foreground" /></div>
            <span className="text-2xl font-heading font-bold text-primary">jmk</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm"><User className="w-4 h-4 text-accent" /><span className="font-medium">{hasActiveAccess ? "Active access" : "No active access"}</span></div>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="w-4 h-4 mr-1" /> Log Out</Button>
          </div>
        </div>
      </div>
    </header>
  );
};

const Pricing = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const ent = useEntitlements();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("subscription_plans").select("*").eq("slug", "weekly_support").maybeSingle()
      .then(({ data }) => setPlan((data as Plan) ?? null));
  }, []);

  const amount = Number(plan?.price ?? 1500);
  const credits = Number((plan?.ai_limits as any)?.credits ?? 50);

  const contribute = async () => {
    if (!ent.userId) { navigate("/login"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("payments", {
        body: { action: "initialize", planSlug: "weekly_support", callbackUrl: `${window.location.origin}/billing` },
      });
      if (error || data?.error) throw new Error(String(data?.error?.message ?? data?.error ?? error?.message ?? "Could not start payment"));
      if (!data?.authorization_url) throw new Error("The payment provider did not return a checkout link.");
      window.location.href = data.authorization_url;
    } catch (e) {
      toast({ title: "Could not start contribution", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {ent.userId ? <AuthenticatedHeader /> : <Header />}
      <main>
        <section className="bg-gradient-hero section-padding text-center">
          <div className="container-main">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
              <span className="inline-block px-4 py-1.5 rounded-full bg-accent/20 text-accent text-sm font-medium mb-4">Weekly Contribution</span>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold text-primary-foreground mb-6">Support JMK</h1>
              <p className="text-lg sm:text-xl text-primary-foreground/80">Make a single weekly contribution to access all JMK AI features.</p>
            </motion.div>
          </div>
        </section>

        <section className="section-padding -mt-16">
          <div className="container-main max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-accent bg-card shadow-glow p-8 sm:p-10">
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-5"><HeartHandshake className="w-7 h-7 text-accent" /></div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-2">Support JMK — {formatNaira(amount)} / 7 Days</h2>
              <p className="text-muted-foreground mb-6">Contribution amount: {formatNaira(amount)} • AI credits granted: {credits} • Access duration: 7 days • Access: All JMK AI features</p>
              <ul className="space-y-3 mb-8">
                {[
                  "Project topic generation, chapter assistance, and project refinement",
                  "Academic research, citation, and methodology assistance",
                  "Project quality checks and supervisor feedback assistance",
                  "Project defence preparation, mock defence, and other AI tools",
                  `${credits} AI credits for 7 days (unused credits expire after access ends)`,
                  "Saved projects and previous work remain available after expiration",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3"><Check className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" /><span className="text-foreground">{f}</span></li>
                ))}
              </ul>
              <Button variant="accent" size="lg" className="w-full" disabled={busy} onClick={contribute}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `Contribute ${formatNaira(amount)} & Get Access`}
              </Button>
              <p className="text-sm text-muted-foreground mt-4">Contributions support JMK’s continued development. When access expires, contribute again to use AI features.</p>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;

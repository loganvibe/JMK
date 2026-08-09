import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, Crown, Sparkles, Zap, Loader2, Briefcase, X } from "lucide-react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEntitlements, formatNaira, type Plan } from "@/hooks/useEntitlements";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const planMeta: Record<string, { icon: any; blurb: string; popular?: boolean; notIncluded?: string[] }> = {
  free: {
    icon: Zap,
    blurb: "Try the platform and generate your first chapter.",
    notIncluded: ["Chapters 2–5", "AI refinement", "Defense preparation", "Exports"],
  },
  student: {
    icon: Sparkles,
    popular: true,
    blurb: "Everything a final-year student needs to finish the project.",
    notIncluded: ["Mock defense simulation", "Priority processing"],
  },
  premium_plus: {
    icon: Crown,
    blurb: "Maximum AI power, full defense prep and priority support.",
    notIncluded: [],
  },
  custom: {
    icon: Briefcase,
    blurb: "Human specialists for work that goes beyond AI.",
    notIncluded: [],
  },
};

const faqs = [
  {
    question: "What payment methods do you accept?",
    answer:
      "Payments are processed securely through Paystack — cards, bank transfer and USSD are all supported for Nigerian students.",
  },
  {
    question: "How do AI credits work?",
    answer:
      "Each AI action costs credits: chapter generation 2, project refinement 3, and most other actions 1. Credits reset on the 1st of every month and your remaining balance is always visible on your billing page.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Subscriptions are monthly and do not auto-renew silently — your access simply runs until the expiry date shown on your billing page.",
  },
  {
    question: "Is the generated content plagiarism-free?",
    answer:
      "Our AI produces original drafts based on your inputs, but everything is a reference and learning aid. Always review, verify and rewrite in your own words before submitting.",
  },
  {
    question: "What is a Custom Service request?",
    answer:
      "For work beyond AI — data analysis, app development, formatting — you submit a request, our team reviews it and sends a quote. You only pay after accepting the price.",
  },
];

const Pricing = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const ent = useEntitlements();
  const { settings, freeMode } = useSiteSettings();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("subscription_plans")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => setPlans((data as Plan[]) ?? []));
  }, []);

  const choosePlan = async (plan: Plan) => {
    if (plan.slug === "custom") { navigate("/services"); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/signup"); return; }
    if (freeMode || !settings.payments_enabled) { navigate("/dashboard"); return; }
    if (plan.price <= 0) { navigate("/dashboard"); return; }
    if (plan.slug === ent.slug) { navigate("/billing"); return; }

    setBusy(plan.slug);
    const { data, error } = await supabase.functions.invoke("payments", {
      body: { action: "initialize", planSlug: plan.slug, callbackUrl: `${window.location.origin}/billing` },
    });
    setBusy(null);
    if (error || data?.error) {
      toast({ title: "Could not start payment", description: data?.error ?? error?.message, variant: "destructive" });
      return;
    }
    window.location.href = data.authorization_url;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        <section className="bg-gradient-hero section-padding text-center">
          <div className="container-main">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
              <span className="inline-block px-4 py-1.5 rounded-full bg-accent/20 text-accent text-sm font-medium mb-4">
                Simple Pricing
              </span>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold text-primary-foreground mb-6">
                Choose Your Plan
              </h1>
              <p className="text-lg sm:text-xl text-primary-foreground/80">
                Start free, upgrade as you need more AI power. Built and priced for Nigerian students.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="section-padding -mt-16">
          <div className="container-main">
            {freeMode && (
              <div className="mb-8 rounded-xl border border-accent bg-accent/10 p-4 text-center">
                <p className="font-medium text-foreground">
                  {settings.free_mode_message || "All premium features are currently free for every student."}
                </p>
              </div>
            )}
            {plans.length === 0 ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {plans.map((plan, index) => {
                  const meta = planMeta[plan.slug] ?? { icon: Zap, blurb: "", notIncluded: [] };
                  const Icon = meta.icon;
                  const isCurrent = ent.slug === plan.slug;
                  return (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      className={`relative p-7 rounded-2xl border flex flex-col ${
                        meta.popular ? "bg-card border-accent shadow-glow" : "bg-card border-border shadow-card"
                      }`}
                    >
                      {meta.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold whitespace-nowrap">
                          Most Popular
                        </div>
                      )}

                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${meta.popular ? "bg-accent/10" : "bg-muted"}`}>
                        <Icon className={`w-6 h-6 ${meta.popular ? "text-accent" : "text-primary"}`} />
                      </div>

                      <h3 className="text-xl font-heading font-bold text-foreground mb-1">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-3xl font-heading font-bold text-foreground">
                          {plan.slug === "custom" ? "Quote" : freeMode ? "Free" : plan.price > 0 ? formatNaira(plan.price) : "₦0"}
                        </span>
                        {!freeMode && plan.price > 0 && <span className="text-muted-foreground text-sm">/month</span>}
                      </div>
                      <p className="text-sm text-muted-foreground mb-5">{plan.description || meta.blurb}</p>

                      <Button
                        variant={meta.popular ? "accent" : plan.slug === "premium_plus" ? "default" : "outline"}
                        className="w-full mb-6"
                        disabled={busy === plan.slug || (!freeMode && isCurrent)}
                        onClick={() => choosePlan(plan)}
                      >
                        {busy === plan.slug ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : freeMode ? (
                          "Start free"
                        ) : isCurrent ? (
                          "Current plan"
                        ) : plan.slug === "custom" ? (
                          "Request a quote"
                        ) : plan.price > 0 ? (
                          `Subscribe — ${formatNaira(plan.price)}`
                        ) : (
                          "Get started free"
                        )}
                      </Button>

                      <div className="space-y-4 flex-1">
                        <ul className="space-y-2.5">
                          {(plan.features ?? []).map((f, i) => (
                            <li key={i} className="flex items-start gap-2.5">
                              <Check className="w-4 h-4 flex-shrink-0 text-accent mt-0.5" />
                              <span className="text-sm text-foreground">{f}</span>
                            </li>
                          ))}
                        </ul>
                        {(meta.notIncluded ?? []).length > 0 && (
                          <ul className="space-y-2 pt-3 border-t border-border">
                            {meta.notIncluded!.map((f, i) => (
                              <li key={i} className="flex items-start gap-2.5 text-muted-foreground">
                                <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span className="text-sm">{f}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {plan.ai_limits?.credits && (
                          <p className="text-xs text-muted-foreground pt-2">
                            {plan.ai_limits.credits} AI credits / month · up to {plan.ai_limits.max_projects} project(s)
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <p className="text-center text-sm text-muted-foreground mt-8">
              Already subscribed?{" "}
              <Link to="/billing" className="text-accent underline underline-offset-4">Manage your billing</Link>
            </p>
          </div>
        </section>

        <section className="section-padding bg-muted/50">
          <div className="container-main max-w-4xl text-center">
            <Crown className="w-14 h-14 text-accent mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-4">
              Premium Plus: Full Defense Preparation
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Mock defense simulations, AI-scored answers, presentation slides and unlimited refinement —
              everything you need to walk into your defense confident.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {[
                { t: "1. Build", d: "Draft all five chapters with AI assistance and academic intelligence." },
                { t: "2. Refine", d: "Upload and improve existing work, fix supervisor feedback instantly." },
                { t: "3. Defend", d: "Run mock defenses, get scored, and export polished documents." },
              ].map((s) => (
                <div key={s.t} className="bg-card p-6 rounded-xl border border-border">
                  <h3 className="font-semibold text-foreground mb-2">{s.t}</h3>
                  <p className="text-sm text-muted-foreground">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-padding">
          <div className="container-main max-w-3xl">
            <h2 className="text-3xl font-heading font-bold text-foreground text-center mb-12">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card p-6 rounded-xl border border-border"
                >
                  <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;

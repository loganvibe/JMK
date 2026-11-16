import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, HeartHandshake } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/hooks/useEntitlements";

export function PricingPreview() {
  const [plan, setPlan] = useState<{ name: string; price: number; features: string[]; ai_limits: any } | null>(null);

  useEffect(() => {
    supabase.from("subscription_plans").select("name, price, features, ai_limits").eq("slug", "weekly_support").maybeSingle()
      .then(({ data }) => setPlan(data as any));
  }, []);

  const amount = Number(plan?.price ?? 1500);
  const credits = Number(plan?.ai_limits?.credits ?? 50);

  return (
    <section className="section-padding bg-background">
      <div className="container-main">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.span initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Weekly Contribution
          </motion.span>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-foreground mb-4">
            Support JMK
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-lg text-muted-foreground">
            One simple contribution gives you access to all JMK AI features for 7 days.
          </motion.p>
        </div>

        <div className="max-w-xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative p-8 rounded-2xl border bg-card border-accent shadow-glow">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-accent/10">
              <HeartHandshake className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-2xl font-heading font-bold mb-2 text-foreground">Support JMK — {formatNaira(amount)} / 7 Days</h3>
            <p className="text-muted-foreground mb-6">{credits} AI credits • 7 days access • All JMK AI features</p>
            <ul className="space-y-3 mb-8">
              {["All JMK AI features unlocked while active", `${credits} AI credits for 7 days`, "Credits expire after 7 days", "Your saved projects remain available after access expires", "Contributions support JMK’s continued development"].map((f) => (
                <li key={f} className="flex items-center gap-3"><Check className="w-5 h-5 flex-shrink-0 text-accent" /><span className="text-foreground">{f}</span></li>
              ))}
            </ul>
            <Button variant="accent" size="lg" className="w-full" asChild>
              <Link to="/billing">Contribute {formatNaira(amount)} &amp; Get Access</Link>
            </Button>
          </motion.div>
          <p className="text-center text-sm text-muted-foreground mt-6">When access expires, you can contribute again to use AI features. Your saved projects and previous work remain available.</p>
        </div>
      </div>
    </section>
  );
}

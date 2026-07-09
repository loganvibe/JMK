import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, Crown, Sparkles, Zap } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "₦0",
    period: "forever",
    description: "Perfect for exploring topics",
    icon: Zap,
    features: [
      "Browse all departments",
      "View 20+ topics per department",
      "Save up to 3 projects",
      "Basic progress tracker",
    ],
    cta: "Get Started",
    variant: "outline" as const,
  },
  {
    name: "Beta",
    price: "₦8,000",
    period: "/month",
    description: "Advanced research tools",
    icon: Sparkles,
    popular: true,
    features: [
      "Everything in Free",
      "Unlimited saved projects",
      "Detailed outlines",
      "Citation generator",
      "Viva prep questions",
      "Limited AI refinements",
    ],
    cta: "Start Beta",
    variant: "accent" as const,
  },
  {
    name: "Premium+",
    price: "₦20,000",
    period: "/month",
    description: "Full generation power",
    icon: Crown,
    features: [
      "Everything in Beta",
      "Unlimited AI generations",
      "Full chapter drafts",
      "Modify old projects",
      "PDF/Word exports",
      "Priority support",
    ],
    cta: "Go Premium+",
    variant: "default" as const,
  },
];

export function PricingPreview() {
  return (
    <section className="section-padding bg-background">
      <div className="container-main">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4"
          >
            Pricing
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-foreground mb-6"
          >
            Plans That Fit Your Budget
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground"
          >
            Start free, upgrade when you need more power. All plans include our core 
            topic selection and tracking features.
          </motion.p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-8 rounded-2xl border ${
                plan.popular
                  ? "bg-gradient-hero border-accent/30 shadow-glow"
                  : "bg-card border-border shadow-card"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-accent text-accent-foreground text-sm font-semibold">
                  Most Popular
                </div>
              )}

              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${
                plan.popular ? "bg-accent/20" : "bg-muted"
              }`}>
                <plan.icon className={`w-6 h-6 ${plan.popular ? "text-accent" : "text-primary"}`} />
              </div>

              {/* Name & Price */}
              <h3 className={`text-xl font-heading font-bold mb-2 ${
                plan.popular ? "text-primary-foreground" : "text-foreground"
              }`}>
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className={`text-4xl font-heading font-bold ${
                  plan.popular ? "text-primary-foreground" : "text-foreground"
                }`}>
                  {plan.price}
                </span>
                <span className={plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"}>
                  {plan.period}
                </span>
              </div>
              <p className={`mb-6 ${plan.popular ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {plan.description}
              </p>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className={`w-5 h-5 flex-shrink-0 ${
                      plan.popular ? "text-accent" : "text-accent"
                    }`} />
                    <span className={plan.popular ? "text-primary-foreground/90" : "text-foreground"}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                variant={plan.variant}
                size="lg"
                className="w-full"
                asChild
              >
                <Link to="/signup">{plan.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Link to full pricing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link 
            to="/pricing" 
            className="text-accent hover:text-accent/80 font-medium underline underline-offset-4"
          >
            View full pricing comparison →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

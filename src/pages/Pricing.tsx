import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, Crown, Sparkles, Zap, ArrowLeft, GraduationCap } from "lucide-react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

const plans = [
  {
    name: "Free",
    price: "₦0",
    period: "forever",
    description: "Perfect for exploring topics and getting started",
    icon: Zap,
    features: [
      "Browse all 50+ departments",
      "View 20+ topics per department",
      "Save up to 3 projects",
      "Basic progress tracker",
      "Keyword search & filters",
      "Email support",
    ],
    notIncluded: [
      "AI research assistant",
      "Citation generator",
      "Viva prep questions",
      "Chapter generation",
      "Modify old projects",
      "PDF/Word exports",
    ],
    cta: "Get Started Free",
    variant: "outline" as const,
  },
  {
    name: "Beta",
    price: "₦10,000",
    period: "/month",
    description: "Advanced research tools for serious students",
    icon: Sparkles,
    popular: true,
    features: [
      "Everything in Free",
      "Unlimited saved projects",
      "Detailed project outlines",
      "Source finder & suggestions",
      "Citation generator (APA, MLA, Harvard)",
      "Viva preparation questions",
      "Editing suggestions",
      "Limited AI refinements (20/month)",
      "Priority email support",
    ],
    notIncluded: [
      "Full chapter generation",
      "Modify old projects",
      "PDF/Word exports",
    ],
    cta: "Start Beta Plan",
    variant: "accent" as const,
  },
  {
    name: "Premium+",
    price: "₦50,000",
    period: "/month",
    description: "Full generation power for maximum results",
    icon: Crown,
    features: [
      "Everything in Beta",
      "Unlimited AI generations",
      "Full chapter drafts",
      "Abstract & introduction writing",
      "Methodology suggestions",
      "Literature review assistance",
      "Code snippets & diagrams",
      "Modify old projects (upload & refresh)",
      "Professional PDF/Word exports",
      "Priority WhatsApp support",
    ],
    notIncluded: [],
    cta: "Go Premium+",
    variant: "default" as const,
    highlight: "Best Value",
  },
];

const faqs = [
  {
    question: "What payment methods do you accept?",
    answer: "We accept payments via Paystack (cards, bank transfer, USSD) for Nigerian users, and Stripe for international payments. All transactions are secure and encrypted.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer: "Yes! You can cancel your subscription at any time from your dashboard. Your access will continue until the end of your billing period.",
  },
  {
    question: "Is the generated content plagiarism-free?",
    answer: "Our AI generates original content based on your specific requirements. However, we strongly recommend using our outputs as a starting point and reference. Always add your original ideas and rewrite in your own words.",
  },
  {
    question: "What is the 'Modify Old Projects' feature?",
    answer: "Premium+ users can upload their existing project (PDF, DOCX, etc.) and our AI will analyze it, apply your requested changes, update sections, add recent references, and generate a refreshed, improved version.",
  },
  {
    question: "Do you offer student discounts?",
    answer: "Our pricing is already designed with Nigerian students in mind. Contact us if you need special arrangements for your institution.",
  },
];

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-hero section-padding text-center">
          <div className="container-main">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto"
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-accent/20 text-accent text-sm font-medium mb-4">
                Simple Pricing
              </span>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold text-primary-foreground mb-6">
                Choose Your Plan
              </h1>
              <p className="text-lg sm:text-xl text-primary-foreground/80">
                Start free, upgrade as you need more power. All plans help you achieve 
                excellent academic results.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="section-padding -mt-16">
          <div className="container-main">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {plans.map((plan, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative p-8 rounded-2xl border ${
                    plan.popular
                      ? "bg-card border-accent shadow-glow scale-105"
                      : "bg-card border-border shadow-card"
                  }`}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-accent text-accent-foreground text-sm font-semibold">
                      Most Popular
                    </div>
                  )}

                  {plan.highlight && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                      {plan.highlight}
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${
                    plan.popular ? "bg-accent/10" : "bg-muted"
                  }`}>
                    <plan.icon className={`w-7 h-7 ${plan.popular ? "text-accent" : "text-primary"}`} />
                  </div>

                  {/* Name & Price */}
                  <h3 className="text-2xl font-heading font-bold text-foreground mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-heading font-bold text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground">
                      {plan.period}
                    </span>
                  </div>
                  <p className="text-muted-foreground mb-8">
                    {plan.description}
                  </p>

                  {/* CTA */}
                  <Button
                    variant={plan.variant}
                    size="lg"
                    className="w-full mb-8"
                    asChild
                  >
                    <Link to="/signup">{plan.cta}</Link>
                  </Button>

                  {/* Features */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">Includes:</h4>
                      <ul className="space-y-3">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <Check className="w-5 h-5 flex-shrink-0 text-accent mt-0.5" />
                            <span className="text-sm text-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {plan.notIncluded.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-3">Not included:</h4>
                        <ul className="space-y-2">
                          {plan.notIncluded.map((feature, i) => (
                            <li key={i} className="flex items-start gap-3 text-muted-foreground">
                              <span className="w-5 h-5 flex-shrink-0 text-center">—</span>
                              <span className="text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Premium+ Highlight */}
        <section className="section-padding bg-muted/50">
          <div className="container-main">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <Crown className="w-16 h-16 text-accent mx-auto mb-6" />
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-4">
                  Premium+ Exclusive: Modify Old Projects
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Upload your existing project and get a completely refreshed, modified version. 
                  Perfect for updates, rework, or adapting old research to new requirements.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                  <div className="bg-card p-6 rounded-xl border border-border">
                    <h3 className="font-semibold text-foreground mb-2">1. Upload</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload your old project (PDF, DOCX, DOC, TXT) up to 10MB
                    </p>
                  </div>
                  <div className="bg-card p-6 rounded-xl border border-border">
                    <h3 className="font-semibold text-foreground mb-2">2. Describe Changes</h3>
                    <p className="text-sm text-muted-foreground">
                      Tell us what you want: update lit review, change topic focus, improve structure
                    </p>
                  </div>
                  <div className="bg-card p-6 rounded-xl border border-border">
                    <h3 className="font-semibold text-foreground mb-2">3. Get New Version</h3>
                    <p className="text-sm text-muted-foreground">
                      Receive a polished, refreshed project ready for review and export
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="section-padding">
          <div className="container-main">
            <div className="max-w-3xl mx-auto">
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
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;

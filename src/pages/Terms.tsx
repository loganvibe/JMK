import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowLeft } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to home
          </Button>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-accent grid place-items-center">
            <GraduationCap className="w-5 h-5 text-accent-foreground" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Terms of Service</h1>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-foreground/90">
          <p className="text-sm text-muted-foreground">Last updated: August 2025</p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing or using jmk, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our services.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Use of Service</h2>
            <p>jmk provides AI-assisted research support, project topic suggestions, and academic tools for Nigerian university students. You agree to use this platform responsibly and for lawful purposes only.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You must notify us immediately of any unauthorized use of your account.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Subscriptions & Payments</h2>
            <p>We offer tiered subscriptions including Free, Student, and Premium Plus. Payments are processed securely through Paystack and/or Stripe. Subscription fees are non-refundable except as required by law or our Refund Policy.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Intellectual Property</h2>
            <p>All content, features, and functionality of jmk are owned by jmk and protected by intellectual property laws. You may not copy, modify, or distribute any part of the platform without our consent.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">6. Termination</h2>
            <p>We reserve the right to suspend or terminate your access to jmk at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">7. Contact</h2>
            <p>For questions about these Terms, contact us at <a href="mailto:support@jmk.ng" className="text-accent hover:underline">support@jmk.ng</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;

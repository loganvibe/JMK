import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowLeft } from "lucide-react";

const RefundPolicy = () => {
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
          <h1 className="text-3xl font-heading font-bold text-foreground">Refund Policy</h1>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-foreground/90">
          <p className="text-sm text-muted-foreground">Last updated: August 2025</p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Subscription Refunds</h2>
            <p>Subscriptions to jmk are billed in advance. Refunds for subscription payments may be considered on a case-by-case basis within 7 days of the initial purchase, provided the service has not been substantially used.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Custom Service Orders</h2>
            <p>For custom academic services (data analysis, project writing, etc.), refunds are handled according to the specific agreement made at the time of order. Please contact support for custom order refund inquiries.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. How to Request a Refund</h2>
            <p>To request a refund, email us at <a href="mailto:support@jmk.ng" className="text-accent hover:underline">support@jmk.ng</a> with your account email, transaction reference, and reason for the refund request. We aim to respond within 5 business days.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. No-Show Policy</h2>
            <p>If a scheduled service is missed without prior cancellation notice, the payment may not be refundable. Please reschedule or cancel at least 24 hours in advance when possible.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Changes to This Policy</h2>
            <p>We may update this Refund Policy from time to time. Continued use of jmk after changes constitutes acceptance of the updated policy.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;

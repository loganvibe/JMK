import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowLeft } from "lucide-react";

const Privacy = () => {
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
          <h1 className="text-3xl font-heading font-bold text-foreground">Privacy Policy</h1>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-foreground/90">
          <p className="text-sm text-muted-foreground">Last updated: August 2025</p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
            <p>We collect information you provide directly, such as your name, email, university details, and any project content you upload. We also collect usage data to improve our services.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
            <p>Your data is used to provide and improve jmk's services, process payments, send important updates, and personalize your experience. We do not sell your personal data to third parties.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. Data Storage & Security</h2>
            <p>We use Supabase for secure data storage with row-level security. Your data is encrypted in transit and at rest. Only you and authorized administrators can access your account data.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. File Uploads</h2>
            <p>Uploaded project files are stored securely in Supabase Storage. We do not share your files with other users. You retain full ownership of your uploaded content.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Cookies</h2>
            <p>We use essential cookies for authentication and session management. We do not use tracking or advertising cookies.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">6. Your Rights</h2>
            <p>You can access, update, or delete your account data at any time through your profile settings or by contacting support.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">7. Contact</h2>
            <p>For privacy inquiries, contact us at <a href="mailto:support@jmk.ng" className="text-accent hover:underline">support@jmk.ng</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;

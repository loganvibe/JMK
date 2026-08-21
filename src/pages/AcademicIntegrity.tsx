import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowLeft } from "lucide-react";

const AcademicIntegrity = () => {
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
          <h1 className="text-3xl font-heading font-bold text-foreground">Academic Integrity</h1>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-foreground/90">
          <p className="text-sm text-muted-foreground">Last updated: August 2025</p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Our Commitment</h2>
            <p>jmk is designed as a <strong>reference and learning tool</strong>. We do not support or condone academic dishonesty, plagiarism, or the submission of AI-generated content as your own original work.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Acceptable Use</h2>
            <p>You may use jmk to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Generate ideas and outlines for research topics</li>
              <li>Get suggestions for literature sources and methodologies</li>
              <li>Improve your understanding of project structure</li>
              <li>Prepare for defenses with practice questions</li>
              <li>Learn proper citation and referencing techniques</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Unacceptable Use</h2>
            <p>You must not:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Submit AI-generated content as your own original work</li>
              <li>Use jmk to complete assignments without proper attribution</li>
              <li>Share your account with others to bypass usage limits</li>
              <li>Attempt to deceive academic authorities using our tools</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Responsibility</h2>
            <p><strong>You are solely responsible</strong> for ensuring that any work you submit is your own original creation. jmk provides assistance and guidance, but the final responsibility for academic integrity lies with you, the student.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Institutional Policies</h2>
            <p>We encourage all users to review and comply with their university's academic integrity policies. jmk is not responsible for any academic penalties resulting from misuse of our platform.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Contact</h2>
            <p>Questions about academic integrity? Contact us at <a href="mailto:support@jmk.ng" className="text-accent hover:underline">support@jmk.ng</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AcademicIntegrity;

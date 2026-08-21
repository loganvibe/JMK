import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowLeft, Sparkles, BookOpen, FileText, ShieldCheck, Zap } from "lucide-react";

const Features = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to home
          </Button>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-accent grid place-items-center">
            <GraduationCap className="w-5 h-5 text-accent-foreground" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Features</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl border border-border p-6">
            <Sparkles className="w-8 h-8 text-accent mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">AI Topic Suggestions</h3>
            <p className="text-muted-foreground">Get department-specific project topics powered by AI. Find the perfect topic for your field of study.</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <BookOpen className="w-8 h-8 text-accent mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Project Workspace</h3>
            <p className="text-muted-foreground">Organize your project with chapters, notes, and progress tracking. Keep everything in one place.</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <FileText className="w-8 h-8 text-accent mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">AI Writing Assistance</h3>
            <p className="text-muted-foreground">Generate chapters, abstracts, and citations with AI. Get suggestions for improvement and refinement.</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <ShieldCheck className="w-8 h-8 text-accent mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Plagiarism Checker</h3>
            <p className="text-muted-foreground">Check your work for originality and get suggestions to improve uniqueness before submission.</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <Zap className="w-8 h-8 text-accent mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Defense Preparation</h3>
            <p className="text-muted-foreground">Practice with AI-generated defense questions and get feedback to prepare for your viva voce.</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <Sparkles className="w-8 h-8 text-accent mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Premium+ Modify</h3>
            <p className="text-muted-foreground">Upload existing projects and get AI-powered modifications, improvements, and restructuring.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Features;

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GraduationCap,
  LogOut,
  LayoutDashboard,
  FileText,
  CreditCard,
  Sparkles,
  Upload,
  Crown,
  Loader2,
  Download,
  Menu,
  X,
  FileCheck2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { signOutAndRedirect } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { invokeFunction } from "@/lib/errors";

const ModifyProject = () => {
  const [user, setUser] = useState<unknown>(null);
  const [file, setFile] = useState<File | null>(null);
  const [projectText, setProjectText] = useState("");
  const [changes, setChanges] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUser(user);
    };
    getUser();
  }, [navigate]);

  const handleLogout = async () => {
    await signOutAndRedirect("/");
  };

  const handleFile = async (f: File | null) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 10MB.", variant: "destructive" });
      return;
    }
    setFile(f);
    // Read as text (works for .txt, .md; PDF/DOCX users can also paste content below)
    if (f.type.startsWith("text/") || f.name.endsWith(".txt") || f.name.endsWith(".md")) {
      const text = await f.text();
      setProjectText(text);
      toast({ title: "File loaded", description: `${f.name} is ready.` });
    } else {
      toast({
        title: "File attached",
        description: "For PDF/DOCX, please also paste the text content below so the AI can read it.",
      });
    }
  };

  const handleGenerate = async () => {
    if (!projectText.trim()) {
      toast({ title: "Missing content", description: "Please upload a text file or paste your project content.", variant: "destructive" });
      return;
    }
    if (!changes.trim()) {
      toast({ title: "Missing instructions", description: "Describe the changes you want.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setOutput("");
    try {
       const data = await invokeFunction<unknown>("modify-project", { projectText, changes, newTopic });
      setOutput(data?.content ?? "");
      toast({
        title: "Your refreshed project is ready!",
        description: "Polished, well-structured, and designed to help you achieve excellent results.",
      });
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({
        title: "Generation failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `refreshed-project-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student";

  return (
    <div className="min-h-screen bg-background flex">
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-lg border border-border shadow-soft"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <AnimatePresence>
        {(isSidebarOpen || typeof window !== "undefined" && window.innerWidth >= 1024) && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="fixed lg:static inset-y-0 left-0 z-40 w-64 bg-card border-r border-border flex flex-col"
          >
            <div className="p-6 border-b border-border">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow">
                  <GraduationCap className="w-6 h-6 text-accent-foreground" />
                </div>
                <span className="text-xl font-heading font-bold text-primary">jmk</span>
              </Link>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </Link>
              <Link to="/my-projects" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <FileText className="w-5 h-5" />
                My Projects
              </Link>
              <Link to="/modify-project" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 text-accent font-medium">
                <Crown className="w-5 h-5" />
                Modify Project
              </Link>
              <Link to="/profile" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <GraduationCap className="w-5 h-5" />
                Profile
              </Link>
              <Link to="/pricing" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <CreditCard className="w-5 h-5" />
                Subscription
              </Link>
            </nav>

            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-6 h-6 text-accent" />
            <span className="text-xs font-semibold text-accent uppercase tracking-wide">Premium+ Feature</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-2">
            Modify Old Project
          </h1>
          <p className="text-muted-foreground mb-8">
            Upload your existing project, tell us what to change, and get a polished, refreshed new version.
          </p>

          <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
            <div>
              <Label className="text-sm font-medium mb-2 block">1. Upload your project</Label>
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  PDF, DOCX, DOC, TXT, ZIP up to 10MB
                </p>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md,.zip"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
                <Button variant="outline" size="sm" asChild>
                  <label htmlFor="file-input" className="cursor-pointer">
                    Choose File
                  </label>
                </Button>
                {file && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-sm text-foreground">
                    <FileCheck2 className="w-4 h-4 text-accent" />
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="project-text" className="text-sm font-medium mb-2 block">
                Project content (paste here if the file is PDF/DOCX)
              </Label>
              <Textarea
                id="project-text"
                placeholder="Paste your existing project text here..."
                value={projectText}
                onChange={(e) => setProjectText(e.target.value)}
                rows={8}
              />
            </div>

            <div>
              <Label htmlFor="changes" className="text-sm font-medium mb-2 block">
                2. Describe the changes you want
              </Label>
              <Textarea
                id="changes"
                placeholder="e.g., Update the literature review with recent sources, rephrase all sections, fix the structure, expand the methodology chapter..."
                value={changes}
                onChange={(e) => setChanges(e.target.value)}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="new-topic" className="text-sm font-medium mb-2 block">
                New / updated topic focus <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="new-topic"
                placeholder="e.g., AI in Nigerian Healthcare"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
              />
            </div>

            <Button
              variant="accent"
              size="lg"
              className="w-full"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Generating your refreshed project...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Modified New Version
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              This AI-assisted output is for reference, ideas, and learning only. Rewrite in your own words,
              add your original contributions, understand fully, and prepare to defend.
            </p>
          </div>

          {output && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 bg-card rounded-2xl border border-border p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-heading font-semibold text-foreground">
                  ✨ Your Refreshed Project
                </h2>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download .md
                </Button>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-sans text-foreground bg-muted/40 rounded-lg p-4 max-h-[600px] overflow-auto">
                {output}
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ModifyProject;

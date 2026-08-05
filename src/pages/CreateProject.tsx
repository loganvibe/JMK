import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  CheckCircle2,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { invokeFunction } from "@/lib/errors";

type Topic = {
  title: string;
  introduction?: string;
  problem_statement?: string;
  objectives?: string[];
  research_questions?: string[];
  scope?: string;
  expected_outcome?: string;
  methodology?: string;
};

const projectTypes = [
  "Research / Analytical",
  "Software / Web Application",
  "Mobile Application",
  "Hardware / IoT",
  "Design / Case Study",
  "Survey-based",
];

const difficulties = ["Easy", "Medium", "Hard"];

const CreateProject = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const [form, setForm] = useState({
    department: "",
    course: "",
    project_area: "",
    project_type: "",
    research_field: "",
    difficulty_level: "Medium",
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUser(user);
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(p);
      setForm((f) => ({
        ...f,
        department: p?.department ?? "",
        course: p?.course ?? "",
      }));
    })();
  }, [navigate]);

  const handleGenerate = async () => {
    if (!form.department || !form.project_area) {
      toast({
        title: "Missing info",
        description: "Please fill in department and project area.",
        variant: "destructive",
      });
      return;
    }
    setGenerating(true);
    setTopics([]);
    setSelectedIdx(null);
    try {
      const data = await invokeFunction<any>("project-ai", { action: "generate_topics", profile, inputs: form });
      const list: Topic[] = data?.topics ?? [];
      if (!list.length) throw new Error("No topics returned. Try again.");
      setTopics(list);
      setStep(2);
    } catch (e: any) {
      toast({
        title: "Could not generate topics",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAndOpen = async () => {
    if (selectedIdx === null || !user) return;
    const t = topics[selectedIdx];
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          title: t.title,
          topic: t.title,
          department: form.department,
          course: form.course,
          project_area: form.project_area,
          project_type: form.project_type,
          research_field: form.research_field,
          difficulty_level: form.difficulty_level,
          problem_statement: t.problem_statement ?? null,
          objectives: Array.isArray(t.objectives) ? t.objectives.join("\n") : null,
          research_questions: Array.isArray(t.research_questions)
            ? t.research_questions.join("\n")
            : null,
          scope: t.scope ?? null,
          expected_outcome: t.expected_outcome ?? null,
          methodology: t.methodology ?? null,
          description: t.introduction ?? null,
          status: "planning",
          progress_percent: 5,
        })
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("activity_log").insert({
        user_id: user.id,
        action: "project_created",
        description: `Started new project: ${t.title}`,
        entity_type: "project",
        entity_id: data.id,
      });

      toast({ title: "Project created", description: "Opening your workspace…" });
      navigate(`/projects/${data.id}`);
    } catch (e: any) {
      toast({
        title: "Could not save project",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/my-projects" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to projects
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-accent flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-heading font-bold text-primary">jmk</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
            Create a New Project
          </h1>
          <p className="text-muted-foreground">
            Tell us what you want to work on. We'll generate tailored topic ideas based on your
            profile and interests.
          </p>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <StepDot active={step >= 1} done={step > 1} label="Preferences" />
          <div className="h-px flex-1 bg-border" />
          <StepDot active={step >= 2} done={false} label="Select a topic" />
        </div>

        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-6 space-y-5"
          >
            {profile && (
              <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                Using your profile: <span className="text-foreground font-medium">{profile.university ?? "—"}</span>
                {" · "}
                <span className="text-foreground font-medium">{profile.faculty ?? "—"}</span>
                {" · "}
                <span className="text-foreground font-medium">{profile.academic_level ?? "—"}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Department *">
                <Input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="e.g. Computer Science"
                />
              </Field>
              <Field label="Course">
                <Input
                  value={form.course}
                  onChange={(e) => setForm({ ...form, course: e.target.value })}
                  placeholder="e.g. Software Engineering"
                />
              </Field>
              <Field label="Preferred project type">
                <Select
                  value={form.project_type}
                  onValueChange={(v) => setForm({ ...form, project_type: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Choose type" /></SelectTrigger>
                  <SelectContent>
                    {projectTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Difficulty level">
                <Select
                  value={form.difficulty_level}
                  onValueChange={(v) => setForm({ ...form, difficulty_level: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {difficulties.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Research field">
                <Input
                  value={form.research_field}
                  onChange={(e) => setForm({ ...form, research_field: e.target.value })}
                  placeholder="e.g. Artificial Intelligence, Public Health"
                />
              </Field>
              <Field label="Project area / interest *">
                <Input
                  value={form.project_area}
                  onChange={(e) => setForm({ ...form, project_area: e.target.value })}
                  placeholder="e.g. FinTech fraud detection"
                />
              </Field>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleGenerate}
                disabled={generating}
                variant="accent"
                className="gap-2"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? "Generating topics…" : "Generate Topic Ideas"}
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {topics.length} AI-generated topics — pick one to open a workspace.
              </p>
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                Adjust inputs
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {topics.map((t, i) => {
                const active = selectedIdx === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedIdx(i)}
                    className={`text-left rounded-2xl border p-5 transition-all ${
                      active
                        ? "border-accent bg-accent/5 shadow-soft"
                        : "border-border bg-card hover:border-accent/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-accent" />
                        <h3 className="font-heading font-semibold text-lg text-foreground">
                          {t.title}
                        </h3>
                      </div>
                      {active && <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />}
                    </div>
                    {t.problem_statement && (
                      <p className="text-sm text-muted-foreground mb-3">
                        <span className="font-medium text-foreground">Problem:</span>{" "}
                        {t.problem_statement}
                      </p>
                    )}
                    {!!t.objectives?.length && (
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-foreground mb-1">Objectives</p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-0.5">
                          {t.objectives.slice(0, 3).map((o, idx) => <li key={idx}>{o}</li>)}
                        </ul>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {t.methodology && <Badge variant="secondary">Method: {t.methodology.slice(0, 40)}{t.methodology.length > 40 ? "…" : ""}</Badge>}
                      {t.scope && <Badge variant="outline">Scope defined</Badge>}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Regenerate
              </Button>
              <Button
                variant="accent"
                disabled={selectedIdx === null || saving}
                onClick={handleSaveAndOpen}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Workspace
              </Button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium">{label}</Label>
    {children}
  </div>
);

const StepDot = ({ active, done, label }: { active: boolean; done: boolean; label: string }) => (
  <div className="flex items-center gap-2">
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
        done
          ? "bg-accent text-accent-foreground"
          : active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {done ? <CheckCircle2 className="w-4 h-4" /> : label[0]}
    </div>
    <span className={`text-sm ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
      {label}
    </span>
  </div>
);

export default CreateProject;

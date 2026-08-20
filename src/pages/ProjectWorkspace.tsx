import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Save,
  Wand2,
  Expand,
  Feather,
  RefreshCcw,
  GraduationCap,
  CheckCircle2,
  Circle,
  BookOpen,
} from "lucide-react";
import AcademicAssistant from "@/components/project/AcademicAssistant";
import DefensePreparation from "@/components/project/DefensePreparation";
import ProModules from "@/components/project/ProModules";
import Collaboration from "@/components/project/Collaboration";
import ModelPicker from "@/components/ai/ModelPicker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { invokeFunction } from "@/lib/errors";

type SectionRow = {
  id?: string;
  chapter: string;
  section_type: string;
  content: string | null;
  status: string;
};

const CHAPTERS: { key: string; label: string; sections: string[] }[] = [
  { key: "overview", label: "Overview", sections: [] },
  { key: "assistant", label: "Academic Assistant", sections: [] },
  { key: "topic", label: "Topic", sections: ["Topic", "Abstract"] },
  {
    key: "chapter1",
    label: "Chapter 1: Introduction",
    sections: [
      "Background of Study",
      "Problem Statement",
      "Aim and Objectives",
      "Research Questions",
      "Significance of Study",
      "Scope of Study",
      "Definition of Terms",
    ],
  },
  {
    key: "chapter2",
    label: "Chapter 2: Literature Review",
    sections: ["Literature Review", "Related Works", "Theoretical Framework", "Research Gap"],
  },
  {
    key: "chapter3",
    label: "Chapter 3: Methodology",
    sections: ["Research Methodology", "Research Design", "Data Collection Method", "Tools and Materials"],
  },
  {
    key: "chapter4",
    label: "Chapter 4: Results",
    sections: ["Data Presentation", "Analysis", "Discussion of Findings"],
  },
  {
    key: "chapter5",
    label: "Chapter 5: Conclusion",
    sections: ["Summary", "Conclusion", "Recommendations"],
  },
  { key: "references", label: "References", sections: ["References"] },
  { key: "pro", label: "Pro Modules", sections: [] },
  { key: "collaborate", label: "Collaboration", sections: [] },
  { key: "defense", label: "Defense Preparation", sections: [] },
];

const totalSectionsCount = CHAPTERS.reduce((n, c) => n + c.sections.length, 0);

const ProjectWorkspace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<unknown>(null);
  const [profile, setProfile] = useState<unknown>(null);
  const [project, setProject] = useState<unknown>(null);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [activeChapter, setActiveChapter] = useState("overview");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUser(user);

      const [{ data: p }, { data: proj }, { data: secs }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("projects").select("*").eq("id", id).maybeSingle(),
        supabase.from("project_sections").select("*").eq("project_id", id),
      ]);

      if (!proj) {
        toast({ title: "Project not found", variant: "destructive" });
        navigate("/my-projects");
        return;
      }
      setProfile(p);
      setProject(proj);
      setSections(secs ?? []);
      setLoading(false);
    })();
  }, [id, navigate, toast]);

  const currentChapter = CHAPTERS.find((c) => c.key === activeChapter)!;

  useEffect(() => {
    if (!activeSection) {
      setDraft("");
      return;
    }
    const existing = sections.find(
      (s) => s.chapter === activeChapter && s.section_type === activeSection,
    );
    setDraft(existing?.content ?? "");
  }, [activeSection, activeChapter, sections]);

  const completedCount = useMemo(
    () => sections.filter((s) => s.status === "completed").length,
    [sections],
  );
  const completionPercent = Math.round((completedCount / totalSectionsCount) * 100);

  const upsertSection = async (
    content: string,
    status: "draft" | "completed" = "draft",
  ) => {
    if (!activeSection || !user || !project) return;
    const existing = sections.find(
      (s) => s.chapter === activeChapter && s.section_type === activeSection,
    );
    const payload = {
      project_id: project.id,
      user_id: user.id,
      chapter: activeChapter,
      section_type: activeSection,
      content,
      status,
    };
    const { data, error } = await supabase
      .from("project_sections")
      .upsert(payload, { onConflict: "project_id,chapter,section_type" })
      .select()
      .single();
    if (error) throw error;

    setSections((prev) => {
      const others = prev.filter(
        (s) => !(s.chapter === activeChapter && s.section_type === activeSection),
      );
      return [...others, data as SectionRow];
    });

    // Update project progress
    const newCompleted = status === "completed"
      ? (existing?.status === "completed" ? completedCount : completedCount + 1)
      : (existing?.status === "completed" ? completedCount - 1 : completedCount);
    const percent = Math.round((newCompleted / totalSectionsCount) * 100);
    await supabase
      .from("projects")
      .update({ progress_percent: percent, chapters_completed: newCompleted })
      .eq("id", project.id);
    setProject({ ...project, progress_percent: percent, chapters_completed: newCompleted });
  };

  const handleSave = async (markComplete = false) => {
    setSaving(true);
    try {
      await upsertSection(draft, markComplete ? "completed" : "draft");
      toast({
        title: markComplete ? "Section marked complete" : "Saved",
      });
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const runAI = async (
    action: "generate_section" | "improve" | "expand" | "simplify" | "regenerate",
  ) => {
    if (!activeSection) return;
    setBusyAction(action);
    try {
      // Context: prior sections in same/earlier chapters
      const chapterOrder = CHAPTERS.map((c) => c.key);
      const currentIdx = chapterOrder.indexOf(activeChapter);
      const contextSections = sections
        .filter((s) => chapterOrder.indexOf(s.chapter) <= currentIdx && s.content)
        .map((s) => ({ chapter: s.chapter, section: s.section_type, content: s.content ?? "" }));

      const data = await invokeFunction<unknown>("project-ai", {
        action,
        profile,
        project,
        chapter: currentChapter.label,
        section: activeSection,
        currentContent: draft,
        instruction,
        contextSections,
      });
      const content: string = data?.content ?? "";
      if (!content) throw new Error("Empty AI response");
      setDraft(content);
      await supabase.from("project_ai_history").insert({
        project_id: project.id,
        user_id: user.id,
        chapter: activeChapter,
        section_type: activeSection,
        action,
        user_request: instruction || action,
        ai_response: content.slice(0, 10000),
      });
      toast({ title: "AI updated the draft", description: "Review, edit, then save." });
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({ title: "AI request failed", description: err.message, variant: "destructive" });
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/my-projects" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {project.department ?? "Project"} · {project.status}
              </p>
              <h1 className="text-base sm:text-lg font-heading font-semibold text-foreground truncate">
                {project.title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs text-muted-foreground">{completionPercent}% complete</span>
              <Progress value={completionPercent} className="h-1.5 w-32" />
            </div>
            <ModelPicker compact />
            <Link to="/" className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-accent-foreground" />
              </div>
              <span className="font-heading font-bold text-primary">jmk</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 px-4 sm:px-6 py-6">
        {/* Chapter nav */}
        <aside className="space-y-1">
          {CHAPTERS.map((c) => {
            const done = c.sections.length
              ? c.sections.every((sec) =>
                  sections.some(
                    (s) => s.chapter === c.key && s.section_type === sec && s.status === "completed",
                  ),
                )
              : false;
            return (
              <button
                key={c.key}
                onClick={() => {
                  setActiveChapter(c.key);
                  setActiveSection(c.sections[0] ?? null);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition ${
                  activeChapter === c.key
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : (
                  <BookOpen className="w-4 h-4" />
                )}
                <span className="flex-1 truncate">{c.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Content */}
        <main className="min-w-0">
          {activeChapter === "overview" ? (
            <OverviewPanel
              project={project}
              sections={sections}
              completionPercent={completionPercent}
              totalSectionsCount={totalSectionsCount}
              completedCount={completedCount}
            />
          ) : activeChapter === "assistant" ? (
            <AcademicAssistant user={user} profile={profile} project={project} sections={sections as Section[]} />
          ) : activeChapter === "pro" ? (
            <ProModules user={user} profile={profile} project={project} sections={sections as Section[]} />
          ) : activeChapter === "collaborate" ? (
            <Collaboration user={user} project={project} />
          ) : activeChapter === "defense" ? (
            <DefensePreparation user={user} profile={profile} project={project} sections={sections as Section[]} />
          ) : (
            <motion.div
              key={activeChapter}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-heading font-bold text-foreground">
                    {currentChapter.label}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Select a section, then draft or ask the AI for help.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {currentChapter.sections.map((sec) => {
                  const rec = sections.find(
                    (s) => s.chapter === activeChapter && s.section_type === sec,
                  );
                  const active = activeSection === sec;
                  return (
                    <button
                      key={sec}
                      onClick={() => setActiveSection(sec)}
                      className={`px-3 py-1.5 rounded-full text-sm border flex items-center gap-1.5 transition ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:border-accent/50"
                      }`}
                    >
                      {rec?.status === "completed" ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : rec?.content ? (
                        <Circle className="w-3.5 h-3.5" />
                      ) : null}
                      {sec}
                    </button>
                  );
                })}
              </div>

              {activeSection ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-foreground">{activeSection}</h3>
                      <Badge variant="outline">
                        {sections.find(
                          (s) => s.chapter === activeChapter && s.section_type === activeSection,
                        )?.status === "completed"
                          ? "Completed"
                          : draft
                          ? "Draft"
                          : "Empty"}
                      </Badge>
                    </div>
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Start writing, or click 'Generate' to let the AI draft this section…"
                      className="min-h-[320px] font-mono text-sm leading-relaxed"
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Sparkles className="w-4 h-4 text-accent" />
                      AI Assistant
                    </div>
                    <Input
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      placeholder="Optional: give the AI a specific instruction (e.g. 'focus on Nigerian context')"
                    />
                    <div className="flex flex-wrap gap-2">
                      <AIBtn onClick={() => runAI("generate_section")} busy={busyAction === "generate_section"} icon={Wand2}>
                        Generate
                      </AIBtn>
                      <AIBtn onClick={() => runAI("improve")} busy={busyAction === "improve"} icon={Feather} disabled={!draft}>
                        Improve
                      </AIBtn>
                      <AIBtn onClick={() => runAI("expand")} busy={busyAction === "expand"} icon={Expand} disabled={!draft}>
                        Expand
                      </AIBtn>
                      <AIBtn onClick={() => runAI("simplify")} busy={busyAction === "simplify"} icon={Feather} disabled={!draft}>
                        Simplify
                      </AIBtn>
                      <AIBtn onClick={() => runAI("regenerate")} busy={busyAction === "regenerate"} icon={RefreshCcw}>
                        Regenerate
                      </AIBtn>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      AI outputs are learning aids — always review, edit, and cite properly.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Save draft
                    </Button>
                    <Button variant="accent" onClick={() => handleSave(true)} disabled={saving || !draft}>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Save & mark complete
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Pick a section above to start writing.
                </p>
              )}
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
};

const AIBtn = ({
  onClick,
  busy,
  icon: Icon,
  disabled,
  children,
}: {
  onClick: () => void;
  busy: boolean;
  icon: React.ReactNode;
  disabled?: boolean;
  children: React.ReactNode;
}) => (
  <Button variant="secondary" size="sm" onClick={onClick} disabled={busy || disabled}>
    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Icon className="w-3.5 h-3.5 mr-1.5" />}
    {children}
  </Button>
);

const OverviewPanel = ({
  project,
  sections,
  completionPercent,
  totalSectionsCount,
  completedCount,
}: {
  project: { id: string; title?: string; department?: string; status?: string; created_at?: string; updated_at?: string; problem_statement?: string | null; objectives?: string | null; research_questions?: string | null; methodology?: string | null; scope?: string | null; expected_outcome?: string | null; difficulty_level?: string };
  sections: SectionRow[];
  completionPercent: number;
  totalSectionsCount: number;
  completedCount: number;
}) => {
  const remaining = totalSectionsCount - completedCount;
  const created = new Date(project.created_at).toLocaleDateString();
  const updated = new Date(project.updated_at).toLocaleDateString();

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-1">
              {project.title}
            </h2>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {project.department && <Badge variant="secondary">{project.department}</Badge>}
              {project.course && <Badge variant="outline">{project.course}</Badge>}
              {project.difficulty_level && (
                <Badge variant="outline">Difficulty: {project.difficulty_level}</Badge>
              )}
            </div>
          </div>
          <Badge>{project.status}</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Completion" value={`${completionPercent}%`} />
          <Stat label="Sections done" value={`${completedCount}/${totalSectionsCount}`} />
          <Stat label="Created" value={created} />
          <Stat label="Last updated" value={updated} />
        </div>
        <div className="mt-4">
          <Progress value={completionPercent} className="h-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Info title="Problem statement" text={project.problem_statement} />
        <Info title="Objectives" text={project.objectives} />
        <Info title="Research questions" text={project.research_questions} />
        <Info title="Methodology" text={project.methodology} />
        <Info title="Scope" text={project.scope} />
        <Info title="Expected outcome" text={project.expected_outcome} />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-heading font-semibold mb-3">AI Recommendations</h3>
        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
          {remaining > 0 ? (
            <li>{remaining} sections remain — start with Chapter 1 sections you haven't drafted.</li>
          ) : (
            <li>All sections completed. Review each chapter before defense preparation.</li>
          )}
          <li>Ask the AI to <span className="text-foreground">Improve</span> any draft that feels rough.</li>
          <li>Move to Defense Preparation once Chapters 1–5 are marked complete.</li>
        </ul>
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="p-3 rounded-lg bg-muted/40">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-semibold text-foreground">{value}</p>
  </div>
);

const Info = ({ title, text }: { title: string; text?: string | null }) =>
  text ? (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">{title}</p>
      <p className="text-sm text-foreground whitespace-pre-line">{text}</p>
    </div>
  ) : null;

export default ProjectWorkspace;

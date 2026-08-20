import { useEffect, useMemo, useState } from "react";
import {
  Loader2, Sparkles, Presentation, Bot, ClipboardCheck, MessageSquare,
  Save, RefreshCcw, Play, CheckCircle2, Circle, Trophy, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { invokeFunction } from "@/lib/errors";

type Section = { chapter: string; section_type: string; content: string | null };
type Props = { user: unknown; profile: unknown; project: { id: string; title?: string }; sections: Section[] };

const DEFAULT_CHECKLIST = [
  "Title approved by supervisor",
  "Chapter 1 completed",
  "Chapter 2 completed",
  "Chapter 3 completed",
  "Chapter 4 completed",
  "Chapter 5 completed",
  "References checked & formatted",
  "Formatting completed",
  "Presentation slides prepared",
  "Mock defense completed",
];

const DefensePreparation = ({ user, profile, project, sections }: Props) => {
  const { toast } = useToast();
  const [tab, setTab] = useState("summary");
  const [busy, setBusy] = useState<string | null>(null);

  const [summary5, setSummary5] = useState<unknown>(null);
  const [summary10, setSummary10] = useState<unknown>(null);
  const [slides, setSlides] = useState<unknown>(null);
  const [readiness, setReadiness] = useState<unknown>(null);

  const [questions, setQuestions] = useState<unknown[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [evalResult, setEvalResult] = useState<unknown>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [checklist, setChecklist] = useState<unknown[]>([]);
  const [coachQ, setCoachQ] = useState("");
  const [coachA, setCoachA] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: sums }, { data: cl }] = await Promise.all([
        supabase.from("defense_summaries").select("*").eq("project_id", project.id),
        supabase.from("project_checklists").select("*").eq("project_id", project.id).order("sort_order"),
      ]);
      (sums ?? []).forEach((s: { summary_type?: string; content?: unknown }) => {
        if (s.summary_type === "5min") setSummary5(s.content);
        if (s.summary_type === "10min") setSummary10(s.content);
        if (s.summary_type === "slides") setSlides(s.content);
      });
      if (!cl || cl.length === 0) {
        const rows = DEFAULT_CHECKLIST.map((item, i) => ({
          project_id: project.id, user_id: user.id, checklist_item: item, sort_order: i,
        }));
        const { data: inserted } = await supabase.from("project_checklists").insert(rows).select();
        setChecklist(inserted ?? []);
      } else setChecklist(cl);
    })();
  }, [project.id, user.id]);

  const callAI = async (action: string, payload?: Record<string, unknown>) => {
    const data = await invokeFunction<unknown>("defense-ai", { action, project, profile, sections, payload });
    return data?.content;
  };

  const saveSummary = async (summary_type: string, content: unknown) => {
    await supabase.from("defense_summaries").upsert(
      { project_id: project.id, user_id: user.id, summary_type, content },
      { onConflict: "project_id,summary_type" }
    );
  };

  const genSummary = async (type: "5min" | "10min") => {
    setBusy(`sum_${type}`);
    try {
      const content = await callAI("summary", { type });
      if (type === "5min") setSummary5(content); else setSummary10(content);
      await saveSummary(type, content);
      toast({ title: "Summary generated" });
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const genSlides = async () => {
    setBusy("slides");
    try {
      const content = await callAI("slides");
      setSlides(content);
      await saveSummary("slides", content);
      toast({ title: "Slides generated" });
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const genReadiness = async () => {
    setBusy("readiness");
    try {
      const content = await callAI("readiness");
      setReadiness(content);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const startMock = async () => {
    setBusy("mock");
    setEvalResult(null);
    try {
      const { data: bank } = await supabase
        .from("defense_question_bank")
        .select("*")
        .or(`department.is.null,department.eq.${profile?.department ?? ""}`)
        .limit(20);
      const content = await callAI("generate_questions", { bank: bank ?? [] });
      const qs = (content as { questions?: unknown[] } | undefined)?.questions ?? [];
      setQuestions(qs);
      setAnswers(qs.map(() => ""));
      const { data: sess } = await supabase.from("defense_sessions").insert({
        project_id: project.id, user_id: user.id, questions: qs, answers: [], status: "in_progress",
      }).select().single();
      setSessionId(sess?.id ?? null);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const submitMock = async () => {
    setBusy("submit");
    try {
      const qa = questions.map((q, i) => ({ ...q, answer: answers[i] || "" }));
      const content = await callAI("evaluate_answers", { qa });
      setEvalResult(content);
      if (sessionId) {
        await supabase.from("defense_sessions").update({
          answers: qa, feedback: content, score: (content as { overall_score?: number | null } | undefined)?.overall_score ?? null, status: "completed",
        }).eq("id", sessionId);
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const askCoach = async () => {
    if (!coachQ.trim()) return;
    setBusy("coach");
    setCoachA("");
    try {
      const content = await callAI("coach", { question: coachQ });
      setCoachA(content);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const toggleCheck = async (id: string, completed: boolean) => {
    setChecklist((prev) => prev.map((c) => c.id === id ? { ...c, completed } : c));
    await supabase.from("project_checklists").update({ completed }).eq("id", id);
  };

  const checklistDone = checklist.filter((c) => c.completed).length;
  const checklistPercent = checklist.length ? Math.round((checklistDone / checklist.length) * 100) : 0;

  const exportSlides = () => {
    if (!slides?.slides) return;
    const text = (slides as { slides: { title?: string; bullets?: string[]; speaker_notes?: string }[] }).slides.map((s, i: number) =>
      `SLIDE ${i + 1}: ${s.title}\n${(s.bullets || []).map((b: string) => `• ${b}`).join("\n")}\n\nNotes: ${s.speaker_notes || ""}\n\n---\n`
    ).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${project.title}-slides.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const readinessScore = readiness?.score ?? (Math.round((checklistPercent + (evalResult?.overall_score ?? 0)) / (evalResult ? 2 : 1)) || checklistPercent);

  return (
    <div className="space-y-6">
      {/* Readiness header */}
      <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-border rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Trophy className="w-4 h-4 text-accent" /> Defense Readiness
            </div>
            <div className="text-4xl font-heading font-bold text-foreground">{readinessScore}%</div>
            <p className="text-sm text-muted-foreground mt-1">
              Based on checklist{evalResult ? " + mock defense score" : ""}.
            </p>
          </div>
          <Button variant="outline" onClick={genReadiness} disabled={busy === "readiness"}>
            {busy === "readiness" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            AI Readiness Check
          </Button>
        </div>
        <Progress value={readinessScore} className="h-2 mt-4" />
        {readiness && (
          <div className="grid md:grid-cols-2 gap-3 mt-4 text-sm">
            <div>
              <p className="font-medium text-foreground mb-1">Strong areas</p>
              <ul className="list-disc list-inside text-muted-foreground">
                {(readiness.strong_areas ?? []).map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Improve</p>
              <ul className="list-disc list-inside text-muted-foreground">
                {(readiness.improve_areas ?? []).map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            {readiness.advice && <p className="md:col-span-2 text-muted-foreground italic">{readiness.advice}</p>}
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="summary"><Sparkles className="w-4 h-4 mr-1.5" />Summary</TabsTrigger>
          <TabsTrigger value="slides"><Presentation className="w-4 h-4 mr-1.5" />Slides</TabsTrigger>
          <TabsTrigger value="mock"><Bot className="w-4 h-4 mr-1.5" />Mock Defense</TabsTrigger>
          <TabsTrigger value="coach"><MessageSquare className="w-4 h-4 mr-1.5" />Coach</TabsTrigger>
          <TabsTrigger value="checklist"><ClipboardCheck className="w-4 h-4 mr-1.5" />Checklist</TabsTrigger>
        </TabsList>

        {/* Summary */}
        <TabsContent value="summary" className="space-y-4 mt-4">
          {[
            { key: "5min", label: "5-minute Defense Summary", val: summary5, setVal: setSummary5 },
            { key: "10min", label: "10-minute Defense Summary", val: summary10, setVal: setSummary10 },
          ].map(({ key, label, val, setVal }) => (
            <div key={key} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-semibold text-foreground">{label}</h3>
                <Button size="sm" variant="secondary" onClick={() => genSummary(key as "5min" | "10min")} disabled={busy === `sum_${key}`}>
                  {busy === `sum_${key}` ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <RefreshCcw className="w-4 h-4 mr-1.5" />}
                  {val ? "Regenerate" : "Generate"}
                </Button>
              </div>
              {val ? (
                <div className="space-y-3">
                  {(val.sections ?? []).map((s: { heading?: string; content?: string; speaking_notes?: string }, i: number) => (
                    <div key={i} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-sm">{s.heading}</p>
                      </div>
                      <Textarea
                        value={s.content}
                        onChange={(e) => {
                          const copy = { ...val, sections: [...val.sections] };
                          copy.sections[i] = { ...s, content: e.target.value };
                          setVal(copy);
                        }}
                        className="min-h-[80px] text-sm"
                      />
                      {s.speaking_notes && (
                        <p className="text-xs text-muted-foreground italic mt-2">🎤 {s.speaking_notes}</p>
                      )}
                    </div>
                  ))}
                  {val.key_points?.length > 0 && (
                    <div className="text-sm">
                      <p className="font-medium mb-1">Key points</p>
                      <ul className="list-disc list-inside text-muted-foreground">
                        {val.key_points.map((k: string, i: number) => <li key={i}>{k}</li>)}
                      </ul>
                    </div>
                  )}
                  <Button size="sm" onClick={() => saveSummary(key, val).then(() => toast({ title: "Saved" }))}>
                    <Save className="w-4 h-4 mr-1.5" /> Save changes
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Click Generate to create your {key} defense summary from project data.</p>
              )}
            </div>
          ))}
        </TabsContent>

        {/* Slides */}
        <TabsContent value="slides" className="space-y-4 mt-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="font-heading font-semibold text-foreground">Presentation Slides (10)</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={genSlides} disabled={busy === "slides"}>
                  {busy === "slides" ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <RefreshCcw className="w-4 h-4 mr-1.5" />}
                  {slides ? "Regenerate" : "Generate"}
                </Button>
                {slides && (
                  <Button size="sm" variant="outline" onClick={exportSlides}>
                    <Download className="w-4 h-4 mr-1.5" /> Export
                  </Button>
                )}
              </div>
            </div>
            {slides?.slides ? (
              <div className="grid md:grid-cols-2 gap-3">
                 {(slides as { slides: { title?: string; bullets?: string[]; speaker_notes?: string }[] }).slides.map((s, i: number) => (
                  <div key={i} className="rounded-lg border border-border p-3 bg-muted/20">
                    <p className="text-xs text-muted-foreground">Slide {i + 1}</p>
                    <Input
                      value={s.title}
                      className="font-semibold mb-2"
                      onChange={(e) => {
                        const copy = { ...slides, slides: [...slides.slides] };
                        copy.slides[i] = { ...s, title: e.target.value };
                        setSlides(copy);
                      }}
                    />
                    <Textarea
                      value={(s.bullets ?? []).join("\n")}
                      onChange={(e) => {
                        const copy = { ...slides, slides: [...slides.slides] };
                        copy.slides[i] = { ...s, bullets: e.target.value.split("\n") };
                        setSlides(copy);
                      }}
                      className="min-h-[80px] text-xs"
                    />
                    <Textarea
                      value={s.speaker_notes ?? ""}
                      placeholder="Speaker notes"
                      onChange={(e) => {
                        const copy = { ...slides, slides: [...slides.slides] };
                        copy.slides[i] = { ...s, speaker_notes: e.target.value };
                        setSlides(copy);
                      }}
                      className="min-h-[50px] text-xs mt-2 italic"
                    />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <Button size="sm" onClick={() => saveSummary("slides", slides).then(() => toast({ title: "Saved" }))}>
                    <Save className="w-4 h-4 mr-1.5" /> Save changes
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Generate a professional 10-slide defense presentation.</p>
            )}
          </div>
        </TabsContent>

        {/* Mock defense */}
        <TabsContent value="mock" className="space-y-4 mt-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-semibold">Mock Defense Simulator</h3>
                <p className="text-sm text-muted-foreground">AI examiner asks project-specific questions and scores your answers.</p>
              </div>
              <Button size="sm" onClick={startMock} disabled={busy === "mock"}>
                {busy === "mock" ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Play className="w-4 h-4 mr-1.5" />}
                {questions.length ? "New session" : "Start"}
              </Button>
            </div>

            {questions.length > 0 && (
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{q.category}</Badge>
                      <Badge variant="secondary">{q.difficulty}</Badge>
                    </div>
                    <p className="font-medium text-sm mb-2">Q{i + 1}. {q.question}</p>
                    <Textarea
                      value={answers[i] ?? ""}
                      onChange={(e) => {
                        const copy = [...answers]; copy[i] = e.target.value; setAnswers(copy);
                      }}
                      placeholder="Type your answer as if you're defending in front of examiners…"
                      className="min-h-[100px] text-sm"
                    />
                    {evalResult?.per_question?.[i] && (
                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        <p>Accuracy: {evalResult.per_question[i].accuracy}/10 · Confidence: {evalResult.per_question[i].confidence}/10 · Completeness: {evalResult.per_question[i].completeness}/10</p>
                        {evalResult.per_question[i].feedback && <p className="italic">{evalResult.per_question[i].feedback}</p>}
                        {evalResult.per_question[i].missing && <p>Missing: {evalResult.per_question[i].missing}</p>}
                      </div>
                    )}
                  </div>
                ))}
                <Button onClick={submitMock} disabled={busy === "submit"} variant="accent">
                  {busy === "submit" ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                  Submit for evaluation
                </Button>

                {evalResult && (
                  <div className="rounded-lg bg-muted/30 border border-border p-4 mt-3">
                    <div className="flex items-center gap-3 mb-2">
                      <Trophy className="w-5 h-5 text-accent" />
                      <p className="font-heading font-bold text-xl">{evalResult.overall_score}/100</p>
                    </div>
                    {evalResult.strengths?.length > 0 && (
                      <div className="text-sm mb-2">
                        <p className="font-medium">Strengths</p>
                        <ul className="list-disc list-inside text-muted-foreground">
                          {evalResult.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {evalResult.improvements?.length > 0 && (
                      <div className="text-sm">
                        <p className="font-medium">Improvements</p>
                        <ul className="list-disc list-inside text-muted-foreground">
                          {evalResult.improvements.map((s: string, i: number) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Coach */}
        <TabsContent value="coach" className="space-y-4 mt-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-heading font-semibold mb-2">Defense Coach</h3>
            <p className="text-sm text-muted-foreground mb-3">Ask anything about defending your project.</p>
            <div className="flex gap-2 mb-3">
              <Input
                value={coachQ}
                onChange={(e) => setCoachQ(e.target.value)}
                placeholder="How do I explain my methodology?"
                onKeyDown={(e) => e.key === "Enter" && askCoach()}
              />
              <Button onClick={askCoach} disabled={busy === "coach"}>
                {busy === "coach" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ask"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                "How do I explain my methodology?",
                "How do I defend my findings?",
                "What should I focus on during presentation?",
                "How do I handle tough questions?",
              ].map((q) => (
                <Button key={q} size="sm" variant="outline" onClick={() => setCoachQ(q)}>{q}</Button>
              ))}
            </div>
            {coachA && (
              <div className="prose prose-sm max-w-none dark:prose-invert bg-muted/30 rounded-lg p-4 border border-border">
                <ReactMarkdown>{coachA}</ReactMarkdown>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Checklist */}
        <TabsContent value="checklist" className="space-y-4 mt-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-semibold">Final Submission Checklist</h3>
                <p className="text-sm text-muted-foreground">{checklistDone} of {checklist.length} complete</p>
              </div>
              <div className="text-2xl font-heading font-bold">{checklistPercent}%</div>
            </div>
            <Progress value={checklistPercent} className="h-2 mb-4" />
            <div className="space-y-2">
              {checklist.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleCheck(c.id, !c.completed)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 text-left"
                >
                  {c.completed ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                  <span className={c.completed ? "line-through text-muted-foreground" : "text-foreground"}>
                    {c.checklist_item}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground text-center">
        Defense preparation is a learning aid. Practice with real supervisors when possible.
      </p>
    </div>
  );
};

export default DefensePreparation;

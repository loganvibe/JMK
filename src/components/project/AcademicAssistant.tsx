import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, Loader2, BookMarked, ClipboardCheck, MessageSquare,
  Brain, Copy, Wand2, ArrowRightLeft, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { invokeFunction } from "@/lib/errors";

type Section = { chapter: string; section_type: string; content: string | null };
type Props = {
  user: unknown;
  profile: unknown;
  project: unknown;
  sections: Section[];
};

const CITATION_STYLES = ["APA7", "MLA", "Harvard", "IEEE"];

const AcademicAssistant = ({ user, profile, project, sections }: Props) => {
  const { toast } = useToast();
  const [department, setDepartment] = useState<unknown>(null);
  const [memory, setMemory] = useState<Record<string, unknown>>({
    citation_style: "APA7",
    formatting_preference: "Standard academic",
    notes: "",
  });
  const [tab, setTab] = useState("research");

  // Research Assistant
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  // Citations
  const [citations, setCitations] = useState<unknown[]>([]);
  const [srcType, setSrcType] = useState("journal");
  const [src, setSrc] = useState({
    authors: "", year: "", title: "", journal: "", volume: "", issue: "", pages: "", publisher: "", url: "",
  });
  const [convertFrom, setConvertFrom] = useState("APA7");
  const [convertTo, setConvertTo] = useState("MLA");
  const [convertText, setConvertText] = useState("");
  const [converted, setConverted] = useState("");

  // Quality
  const [quality, setQuality] = useState<unknown>(null);

  // Supervisor feedback
  const [feedback, setFeedback] = useState("");
  const [analysis, setAnalysis] = useState<unknown>(null);
  const [history, setHistory] = useState<unknown[]>([]);

  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (profile?.department) {
        const { data } = await supabase
          .from("departments")
          .select("*")
          .ilike("name", profile.department)
          .maybeSingle();
        setDepartment(data);
      }
      if (project?.id) {
        const [{ data: mem }, { data: cits }, { data: hist }] = await Promise.all([
          supabase.from("project_memory").select("*").eq("project_id", project.id).maybeSingle(),
          supabase.from("project_citations").select("*").eq("project_id", project.id).order("created_at", { ascending: false }),
          supabase.from("supervisor_feedback").select("*").eq("project_id", project.id).order("created_at", { ascending: false }),
        ]);
        if (mem) setMemory(mem);
        setCitations(cits ?? []);
        setHistory(hist ?? []);
      }
    })();
  }, [profile, project]);

  const baseCtx = useMemo(() => ({
    profile, project, department, memory, sections,
    citation_style: memory?.citation_style ?? "APA7",
  }), [profile, project, department, memory, sections]);

  const persistMemory = async (patch: Record<string, unknown>) => {
    const next = { ...memory, ...patch };
    setMemory(next);
    await supabase.from("project_memory").upsert({
      user_id: user.id,
      project_id: project.id,
      citation_style: next.citation_style,
      formatting_preference: next.formatting_preference,
      notes: next.notes,
    }, { onConflict: "project_id" });
  };

  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(action);
    try {
      const data = await invokeFunction<unknown>("academic-ai", { action, ...baseCtx, ...extra });
      return data;
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({ title: "AI request failed", description: err.message, variant: "destructive" });
      throw e;
    } finally {
      setBusy(null);
    }
  };

  const askResearch = async () => {
    if (!question.trim()) return;
    const d = await call("research_assistant", { question });
    setAnswer(d?.content ?? "");
  };

  const generateCitation = async () => {
    const d = await call("citation_generate", { source: { ...src, type: srcType } });
    if (!d?.formatted) return;
    const { data: inserted } = await supabase.from("project_citations").insert({
      user_id: user.id, project_id: project.id,
      style: memory.citation_style, source_type: srcType,
      formatted: d.formatted, metadata: { in_text: d.in_text, ...src },
    }).select().single();
    if (inserted) setCitations((c) => [inserted, ...c]);
    toast({ title: "Citation generated" });
  };

  const deleteCitation = async (id: string) => {
    await supabase.from("project_citations").delete().eq("id", id);
    setCitations((c) => c.filter((x) => x.id !== id));
  };

  const convert = async () => {
    const d = await call("citation_convert", { from: convertFrom, to: convertTo, text: convertText });
    setConverted(d?.converted ?? "");
  };

  const runQuality = async () => {
    const d = await call("quality_check");
    setQuality(d);
  };

  const analyzeFeedback = async () => {
    if (!feedback.trim()) return;
    const d = await call("feedback_analyze", { feedback });
    setAnalysis(d);
    const { data: inserted } = await supabase.from("supervisor_feedback").insert({
      user_id: user.id, project_id: project.id,
      source: "paste", raw_feedback: feedback, analysis: d,
    }).select().single();
    if (inserted) setHistory((h) => [inserted, ...h]);
  };

  const copyText = (t: string) => {
    navigator.clipboard.writeText(t);
    toast({ title: "Copied" });
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
            <Brain className="w-5 h-5 text-accent" />
            Academic Intelligence
          </h2>
          <p className="text-sm text-muted-foreground">
            Department-aware research help, citations, quality reports, and supervisor feedback.
          </p>
        </div>
        {department && (
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {department.name}
          </Badge>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="research"><MessageSquare className="w-4 h-4 mr-1.5" />Research</TabsTrigger>
          <TabsTrigger value="citations"><BookMarked className="w-4 h-4 mr-1.5" />Citations</TabsTrigger>
          <TabsTrigger value="quality"><ClipboardCheck className="w-4 h-4 mr-1.5" />Quality Check</TabsTrigger>
          <TabsTrigger value="feedback"><Wand2 className="w-4 h-4 mr-1.5" />Supervisor</TabsTrigger>
          <TabsTrigger value="memory"><Brain className="w-4 h-4 mr-1.5" />Memory</TabsTrigger>
        </TabsList>

        {/* RESEARCH ASSISTANT */}
        <TabsContent value="research" className="space-y-3 mt-4">
          <p className="text-xs text-muted-foreground">
            Ask anything about your topic — theories, methodology, gaps. The AI uses your project context.
          </p>
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What theories relate to my topic? What methodology should I use?"
            onKeyDown={(e) => e.key === "Enter" && askResearch()}
          />
          <div className="flex flex-wrap gap-2">
            {[
              "What theories relate to my topic?",
              "What methodology should I use?",
              "What research gap exists?",
              "Suggest 5 references I should read.",
            ].map((q) => (
              <button key={q} onClick={() => setQuestion(q)}
                className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-accent/50 text-muted-foreground">
                {q}
              </button>
            ))}
          </div>
          <Button onClick={askResearch} disabled={busy === "research_assistant" || !question.trim()}>
            {busy === "research_assistant" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Ask AI
          </Button>
          {answer && (
            <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/30 border border-border rounded-xl p-4">
              <ReactMarkdown>{answer}</ReactMarkdown>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">Reference/learning tool only — verify all facts and cite properly.</p>
        </TabsContent>

        {/* CITATIONS */}
        <TabsContent value="citations" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Citation style:</span>
            <Select value={memory.citation_style} onValueChange={(v) => persistMemory({ citation_style: v })}>
              <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CITATION_STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-border rounded-xl p-4 bg-muted/20">
            <Select value={srcType} onValueChange={setSrcType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="journal">Journal article</SelectItem>
                <SelectItem value="book">Book</SelectItem>
                <SelectItem value="chapter">Book chapter</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="thesis">Thesis / Project</SelectItem>
                <SelectItem value="conference">Conference paper</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Authors (Last, F. M.; ...)" value={src.authors}
              onChange={(e) => setSrc({ ...src, authors: e.target.value })} />
            <Input placeholder="Year" value={src.year} onChange={(e) => setSrc({ ...src, year: e.target.value })} />
            <Input placeholder="Title" value={src.title} onChange={(e) => setSrc({ ...src, title: e.target.value })} />
            <Input placeholder="Journal / Publisher" value={src.journal || src.publisher}
              onChange={(e) => setSrc({ ...src, journal: e.target.value, publisher: e.target.value })} />
            <Input placeholder="Vol / Issue / Pages" value={`${src.volume}${src.issue ? "("+src.issue+")" : ""}${src.pages ? ", "+src.pages : ""}`}
              onChange={(e) => setSrc({ ...src, volume: e.target.value })} />
            <Input className="md:col-span-2" placeholder="URL / DOI (optional)"
              value={src.url} onChange={(e) => setSrc({ ...src, url: e.target.value })} />
            <div className="md:col-span-2">
              <Button onClick={generateCitation} disabled={busy === "citation_generate"}>
                {busy === "citation_generate" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Generate {memory.citation_style} citation
              </Button>
            </div>
          </div>

          {citations.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Your references ({citations.length})</p>
              {citations.map((c) => (
                <div key={c.id} className="flex items-start gap-2 border border-border rounded-lg p-3 bg-background">
                  <div className="flex-1 text-sm">
                    <Badge variant="outline" className="mb-1">{c.style}</Badge>
                    <p className="text-foreground whitespace-pre-wrap">{c.formatted}</p>
                    {c.metadata?.in_text && (
                      <p className="text-xs text-muted-foreground mt-1">In-text: {c.metadata.in_text}</p>
                    )}
                  </div>
                  <button onClick={() => copyText(c.formatted)} className="text-muted-foreground hover:text-foreground p-1"><Copy className="w-4 h-4" /></button>
                  <button onClick={() => deleteCitation(c.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}

          <div className="border border-border rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ArrowRightLeft className="w-4 h-4 text-accent" /> Convert citation style
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={convertFrom} onValueChange={setConvertFrom}>
                <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{CITATION_STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <span className="text-muted-foreground">→</span>
              <Select value={convertTo} onValueChange={setConvertTo}>
                <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{CITATION_STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Textarea rows={4} placeholder="Paste references in the source style…"
              value={convertText} onChange={(e) => setConvertText(e.target.value)} />
            <Button variant="secondary" onClick={convert} disabled={busy === "citation_convert" || !convertText.trim()}>
              {busy === "citation_convert" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Convert
            </Button>
            {converted && (
              <div className="text-sm bg-muted/40 border border-border rounded-lg p-3 whitespace-pre-wrap">{converted}</div>
            )}
          </div>
        </TabsContent>

        {/* QUALITY CHECK */}
        <TabsContent value="quality" className="space-y-4 mt-4">
          <Button onClick={runQuality} disabled={busy === "quality_check"}>
            {busy === "quality_check" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardCheck className="w-4 h-4 mr-2" />}
            Run academic quality report
          </Button>
          {quality?.scores && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(quality.scores as Record<string, number>).map(([k, v]) => (
                  <div key={k} className="p-3 rounded-lg border border-border bg-muted/20">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k.replace(/_/g, " ")}</p>
                    <p className="text-2xl font-bold text-foreground">{v}</p>
                    <Progress value={Number(v)} className="h-1.5 mt-1" />
                  </div>
                ))}
              </div>
              {quality.summary && (
                <div className="bg-muted/30 border border-border rounded-xl p-3 text-sm">{quality.summary}</div>
              )}
              <ReportList title="Strengths" items={quality.strengths} />
              <ReportList title="Weaknesses" items={quality.weaknesses} />
              <ReportList title="Originality suggestions" items={quality.originality_suggestions} />
              {quality.recommendations?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Recommendations</p>
                  <div className="space-y-2">
                     {quality.recommendations.map((r: { title: string; detail: string; priority?: string }, i: number) => (
                      <div key={i} className="border border-border rounded-lg p-3 bg-background">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{r.title}</p>
                          <Badge variant={r.priority === "high" ? "destructive" : "outline"}>{r.priority}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{r.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* SUPERVISOR FEEDBACK */}
        <TabsContent value="feedback" className="space-y-3 mt-4">
          <Textarea rows={6} placeholder="Paste supervisor comments, corrections, or marked notes…"
            value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          <Button onClick={analyzeFeedback} disabled={busy === "feedback_analyze" || !feedback.trim()}>
            {busy === "feedback_analyze" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Analyze feedback
          </Button>
          {analysis?.corrections && (
            <div className="space-y-2">
              {analysis.summary && (
                <div className="bg-muted/30 border border-border rounded-xl p-3 text-sm">{analysis.summary}</div>
              )}
               {analysis.corrections.map((c: { quote: string; explanation: string; priority?: string; target_chapter?: string; target_section?: string; suggested_fix?: string }, i: number) => (
                <div key={i} className="border border-border rounded-lg p-3 bg-background text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">"{c.quote}"</p>
                    <Badge variant={c.priority === "high" ? "destructive" : "outline"}>{c.priority}</Badge>
                  </div>
                  <p className="text-muted-foreground">{c.explanation}</p>
                  {c.target_chapter && (
                    <p className="text-xs text-accent">→ {c.target_chapter} / {c.target_section}</p>
                  )}
                  {c.suggested_fix && (
                    <p className="text-foreground"><span className="font-medium">Suggested fix:</span> {c.suggested_fix}</p>
                  )}
                </div>
              ))}
              {analysis.action_plan?.length > 0 && (
                <ReportList title="Action plan" items={analysis.action_plan} />
              )}
            </div>
          )}
          {history.length > 0 && (
            <div className="pt-3 border-t border-border">
              <p className="text-sm font-medium mb-2">Supervisor history</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                {history.slice(0, 5).map((h) => (
                  <div key={h.id} className="truncate">
                    · {new Date(h.created_at).toLocaleDateString()} — {h.raw_feedback.slice(0, 100)}…
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* MEMORY & FORMATTING */}
        <TabsContent value="memory" className="space-y-3 mt-4">
          <p className="text-sm text-muted-foreground">
            These preferences are remembered for every AI action on this project.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Preferred citation style</label>
              <Select value={memory.citation_style} onValueChange={(v) => persistMemory({ citation_style: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CITATION_STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Formatting preference</label>
              <Select
                value={memory.formatting_preference ?? "Standard academic"}
                onValueChange={(v) => persistMemory({ formatting_preference: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard academic">Standard academic (Times New Roman 12, 1.5 spacing)</SelectItem>
                  <SelectItem value="UNILAG">UNILAG guideline</SelectItem>
                  <SelectItem value="UI">University of Ibadan guideline</SelectItem>
                  <SelectItem value="ABU">Ahmadu Bello University guideline</SelectItem>
                  <SelectItem value="Covenant">Covenant University guideline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Notes AI should remember</label>
            <Textarea rows={4} value={memory.notes ?? ""}
              onChange={(e) => setMemory({ ...memory, notes: e.target.value })}
              onBlur={(e) => persistMemory({ notes: e.target.value })}
              placeholder="e.g. Use British English. Focus on Nigerian SMEs. Supervisor prefers quantitative methodology." />
          </div>
          <div className="text-xs text-muted-foreground bg-muted/30 border border-border rounded-lg p-3">
            The AI already knows: <b>{profile?.university ?? "your university"}</b> ·{" "}
            <b>{profile?.department ?? "your department"}</b> · <b>{profile?.course ?? "your course"}</b> ·{" "}
            <b>{profile?.academic_level ?? "your level"}</b>. It won't ask again.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ReportList = ({ title, items }: { title: string; items?: string[] }) =>
  items && items.length > 0 ? (
    <div>
      <p className="text-sm font-medium mb-1">{title}</p>
      <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
        {items.map((i, idx) => <li key={idx}>{i}</li>)}
      </ul>
    </div>
  ) : null;

export default AcademicAssistant;

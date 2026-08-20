import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Library,
  BarChart3,
  Loader2,
  Sparkles,
  BookmarkPlus,
  AlertTriangle,
  FileText,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { invokeFunction } from "@/lib/errors";
import { getPreferredModel, modelLabel } from "@/lib/aiModels";
import { extractTextFromFile } from "@/lib/extractText";

type Props = { user: unknown; profile: unknown; project: unknown; sections: Section[] };

const scoreTone = (n: number) =>
  n >= 80 ? "text-success" : n >= 55 ? "text-warning" : "text-destructive";

const ProModules = ({ user, profile, project, sections }: Props) => {
  const { toast } = useToast();
  const [model, setModel] = useState(getPreferredModel());

  useEffect(() => {
    const onChange = (e: Event) => setModel((e as CustomEvent).detail as string);
    window.addEventListener("jmk:model-changed", onChange);
    return () => window.removeEventListener("jmk:model-changed", onChange);
  }, []);

  // ---------- Originality ----------
  const [origSection, setOrigSection] = useState<string>("");
  const [origBusy, setOrigBusy] = useState(false);
  const [report, setReport] = useState<unknown>(null);

  const written = sections.filter((s) => (s.content ?? "").trim().length > 200);

  const runOriginality = async () => {
    const target = written.find((s) => `${s.chapter}::${s.section_type}` === origSection) ?? written[0];
    if (!target) {
      toast({ title: "Nothing to check", description: "Write or generate a section first.", variant: "destructive" });
      return;
    }
    setOrigBusy(true);
    try {
      const data = await invokeFunction<unknown>("pro-modules", {
        action: "originality",
        project,
        profile,
        text: target.content,
      });
      setReport(data);
      await supabase.from("originality_reports").insert({
        project_id: project.id,
        user_id: user.id,
        chapter: target.chapter,
        section_type: target.section_type,
        originality_score: Number(data?.originality_score ?? 0),
        ai_likelihood: Number(data?.ai_likelihood ?? 0),
        verdict: data?.verdict ?? null,
        flagged: data?.flagged ?? [],
        suggestions: data?.suggestions ?? [],
        model: data?.model ?? model,
      });
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({ title: "Originality check failed", description: err.message, variant: "destructive" });
    } finally {
      setOrigBusy(false);
    }
  };

  // ---------- Literature ----------
  const [query, setQuery] = useState("");
  const [litBusy, setLitBusy] = useState(false);
  const [lit, setLit] = useState<unknown>(null);
  const [saved, setSaved] = useState<unknown[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("literature_sources")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false });
      setSaved((data as unknown) ?? []);
    })();
  }, [project.id]);

  const runLiterature = async () => {
    setLitBusy(true);
    try {
      const data = await invokeFunction<unknown>("pro-modules", {
        action: "literature",
        project,
        profile,
        query: query || project.topic || project.title,
      });
      setLit(data);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({ title: "Literature search failed", description: err.message, variant: "destructive" });
    } finally {
      setLitBusy(false);
    }
  };

  const saveSource = async (s: Record<string, unknown>) => {
    const { data, error } = await supabase
      .from("literature_sources")
      .insert({
        project_id: project.id,
        user_id: user.id,
        title: s.title,
        authors: s.authors ?? null,
        year: String(s.year ?? ""),
        venue: s.venue ?? null,
        summary: s.summary ?? null,
        relevance: s.relevance ?? null,
        citation: s.citation ?? null,
      })
      .select()
      .single();
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    setSaved((prev) => [data, ...prev]);
    toast({ title: "Saved to your reference list" });
  };

  // ---------- Data analysis ----------
  const [dataset, setDataset] = useState("");
  const [question, setQuestion] = useState("");
  const [dataBusy, setDataBusy] = useState(false);
  const [analysis, setAnalysis] = useState<unknown>(null);

  const onFile = async (file?: File | null) => {
    if (!file) return;
    try {
      if (/\.(csv|txt|md)$/i.test(file.name)) setDataset(await file.text());
      else setDataset(await extractTextFromFile(file));
      toast({ title: "Data loaded", description: file.name });
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({ title: "Could not read file", description: err.message, variant: "destructive" });
    }
  };

  const runAnalysis = async () => {
    setDataBusy(true);
    try {
      const data = await invokeFunction<unknown>("pro-modules", {
        action: "data_analysis",
        project,
        profile,
        dataset,
        question,
      });
      setAnalysis(data);
      await supabase.from("data_analyses").insert({
        project_id: project.id,
        user_id: user.id,
        title: question.slice(0, 120) || "Chapter 4 analysis",
        method: data?.method ?? null,
        raw_input: dataset.slice(0, 20000),
        findings: data?.findings ?? [],
        tables: data?.tables ?? [],
        narrative: data?.narrative ?? null,
        model: data?.model ?? model,
      });
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setDataBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">Pro Modules</h2>
          <p className="text-sm text-muted-foreground">
            Advanced research tooling — originality, literature and data analysis.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          {modelLabel(model)}
        </Badge>
      </div>

      <Tabs defaultValue="originality">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="originality" className="gap-1.5">
            <ShieldCheck className="w-4 h-4" /> <span className="hidden sm:inline">Originality</span>
          </TabsTrigger>
          <TabsTrigger value="literature" className="gap-1.5">
            <Library className="w-4 h-4" /> <span className="hidden sm:inline">Literature</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-1.5">
            <BarChart3 className="w-4 h-4" /> <span className="hidden sm:inline">Data analysis</span>
          </TabsTrigger>
        </TabsList>

        {/* Originality */}
        <TabsContent value="originality" className="mt-4 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Scans a section for unoriginal phrasing, uncited borrowing and generic AI-sounding writing.
              This is a coaching tool, not a plagiarism database — always run your school's official check too.
            </p>
            <div className="flex flex-wrap gap-2">
              <select
                value={origSection}
                onChange={(e) => setOrigSection(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[220px]"
              >
                <option value="">Select a section…</option>
                {written.map((s) => (
                  <option key={`${s.chapter}::${s.section_type}`} value={`${s.chapter}::${s.section_type}`}>
                    {s.chapter} — {s.section_type}
                  </option>
                ))}
              </select>
              <Button variant="accent" onClick={runOriginality} disabled={origBusy || !written.length}>
                {origBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                Run check
              </Button>
            </div>
            {!written.length && (
              <p className="text-sm text-muted-foreground">Write at least one section before running a check.</p>
            )}

            {report && (
              <div className="space-y-4 pt-2">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Metric label="Originality score" value={report.originality_score ?? 0} good />
                  <Metric label="AI-sounding likelihood" value={report.ai_likelihood ?? 0} />
                </div>
                {report.verdict && <p className="text-sm text-foreground">{report.verdict}</p>}
                <div className="space-y-2">
                   {(report.flagged ?? []).map((f: { excerpt?: string; issue?: string; severity?: string; fix?: string }, i: number) => (
                    <div key={i} className="rounded-xl border border-border p-3 bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                        <Badge variant="outline" className="capitalize">{f.severity ?? "low"}</Badge>
                      </div>
                      <p className="text-sm italic text-muted-foreground">“{f.excerpt}”</p>
                      <p className="text-sm text-foreground mt-1">{f.issue}</p>
                      {f.fix && <p className="text-sm text-accent mt-1">Fix: {f.fix}</p>}
                    </div>
                  ))}
                </div>
                {!!(report.suggestions ?? []).length && (
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    {report.suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Literature */}
        <TabsContent value="literature" className="mt-4 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`What literature do you need? (default: ${project.topic ?? project.title})`}
                className="flex-1 min-w-[220px]"
              />
              <Button variant="accent" onClick={runLiterature} disabled={litBusy}>
                {litBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Library className="w-4 h-4 mr-2" />}
                Find sources
              </Button>
            </div>

            {lit?.sources?.map((s: { title?: string; authors?: string; year?: string; venue?: string; summary?: string; relevance?: string; citation?: string; verified?: boolean }, i: number) => (
              <div key={i} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.authors} · {s.year} · {s.venue}
                      {s.verified === false && " · unverified"}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => saveSource(s)}>
                    <BookmarkPlus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{s.summary}</p>
                <p className="text-sm text-accent mt-1">{s.relevance}</p>
                {s.citation && <p className="text-xs font-mono mt-2 text-muted-foreground">{s.citation}</p>}
              </div>
            ))}

            {!!lit?.search_tips?.length && (
              <div className="rounded-xl bg-muted/30 border border-border p-3">
                <p className="text-sm font-medium text-foreground mb-1">Where to verify these</p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  {lit.search_tips.map((t: string, i: number) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            )}

            {!!saved.length && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Saved references ({saved.length})</h3>
                <div className="space-y-1">
                  {saved.map((s) => (
                    <p key={s.id} className="text-xs font-mono text-muted-foreground">{s.citation ?? s.title}</p>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              AI-suggested sources must be verified on Google Scholar or AJOL before you cite them.
            </p>
          </div>
        </TabsContent>

        {/* Data analysis */}
        <TabsContent value="data" className="mt-4 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex">
                <input
                  type="file"
                  accept=".csv,.txt,.md,.pdf,.docx"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
                <span className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-input text-sm cursor-pointer hover:bg-muted">
                  <Upload className="w-4 h-4" /> Upload results file
                </span>
              </label>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Research question to answer with this data"
                className="flex-1 min-w-[220px]"
              />
            </div>
            <Textarea
              value={dataset}
              onChange={(e) => setDataset(e.target.value)}
              placeholder="Paste your CSV, survey counts or tabular results here…"
              className="min-h-[180px] font-mono text-xs"
            />
            <div className="flex justify-end">
              <Button variant="accent" onClick={runAnalysis} disabled={dataBusy || !dataset.trim()}>
                {dataBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-2" />}
                Analyse data
              </Button>
            </div>

            {analysis && (
              <div className="space-y-4 pt-2">
                {analysis.method && (
                  <div className="rounded-xl bg-muted/30 border border-border p-3">
                    <p className="text-sm font-medium text-foreground mb-1">Method</p>
                    <p className="text-sm text-muted-foreground">{analysis.method}</p>
                  </div>
                )}
                {(analysis.tables ?? []).map((t: { caption?: string; markdown?: string }, i: number) => (
                  <div key={i} className="rounded-xl border border-border p-3 overflow-x-auto">
                    <p className="text-sm font-medium text-foreground mb-2">{t.caption}</p>
                    <pre className="text-xs font-mono whitespace-pre text-muted-foreground">{t.markdown}</pre>
                  </div>
                ))}
                {!!(analysis.findings ?? []).length && (
                  <div className="space-y-2">
                    {analysis.findings.map((f: { finding?: string; evidence?: string }, i: number) => (
                      <div key={i} className="text-sm">
                        <p className="text-foreground font-medium">{f.finding}</p>
                        <p className="text-muted-foreground">{f.evidence}</p>
                      </div>
                    ))}
                  </div>
                )}
                {analysis.narrative && (
                  <div className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-accent" />
                      <p className="text-sm font-medium text-foreground">Chapter 4 draft</p>
                    </div>
                    <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground">{analysis.narrative}</pre>
                  </div>
                )}
                {!!(analysis.limitations ?? []).length && (
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    {analysis.limitations.map((l: string, i: number) => <li key={i}>{l}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Metric = ({ label, value, good }: { label: string; value: number; good?: boolean }) => (
  <div className="rounded-xl border border-border p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`text-2xl font-heading font-bold ${good ? scoreTone(value) : scoreTone(100 - value)}`}>{value}%</p>
    <Progress value={value} className="h-1.5 mt-2" />
  </div>
);

export default ProModules;

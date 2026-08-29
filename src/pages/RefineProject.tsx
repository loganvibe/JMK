import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Upload, FileCheck2, Loader2, Sparkles, ArrowLeft, ArrowRight, Download,
  CheckCircle2, AlertTriangle, TrendingUp, Wand2, GraduationCap, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { extractTextFromFile } from "@/lib/extractText";
import { invokeFunction } from "@/lib/errors";

type Analysis = {
  title?: string;
  abstract?: string;
  detected_chapters?: string[];
  scores?: { structure?: number; research_quality?: number; writing_quality?: number; completeness?: number; overall?: number };
  missing_sections?: string[];
  weak_arguments?: string[];
  formatting_issues?: string[];
  outdated_information?: string[];
  repeated_content?: string[];
  improvement_areas?: string[];
  recommendations?: { title: string; detail: string; target_section?: string }[];
  summary?: string;
};

type Section = { chapter: string; section: string; content: string; refined?: string; changeSummary?: string; changes?: string[] };

const STEPS = ["Upload", "Analysis", "Interview", "Refine", "Review", "Export"] as const;

const RefineProject = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<unknown>(null);
  const [profile, setProfile] = useState<unknown>({});
  const [tier, setTier] = useState<string>("free");
  const [step, setStep] = useState(0);

  // Upload
  const [file, setFile] = useState<File | null>(null);
  const [extracted, setExtracted] = useState("");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Analysis
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Interview
  const [answers, setAnswers] = useState({
    university: "",
    department: "",
    supervisor_feedback: "",
    focus_areas: "",
    keep_topic: "yes",
    deadline: "",
  });

  // Refinement
  const [sections, setSections] = useState<Section[]>([]);
  const [splitting, setSplitting] = useState(false);
  const [refiningIdx, setRefiningIdx] = useState<number | null>(null);
  const [refinementId, setRefinementId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/login");
      setUser(user);
      const [{ data: prof }, { data: sub }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("subscriptions").select("tier").eq("user_id", user.id).maybeSingle(),
      ]);
      if (prof) {
        setProfile(prof);
        setAnswers((a) => ({ ...a, university: prof.university ?? "", department: prof.department ?? "" }));
      }
      if (sub) setTier(sub.tier ?? "free");
    })();
  }, [navigate]);

  const isPremium = tier === "premium" || tier === "premium_plus";

  const handleFile = async (f: File | null) => {
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum 15MB.", variant: "destructive" });
      return;
    }
    setFile(f);
    setUploading(true);
    try {
      const text = await extractTextFromFile(f);
      if (!text.trim()) throw new Error("Could not read text from this file. Try a different format.");
      setExtracted(text);

      // Upload to storage
      const path = `${user.id}/${Date.now()}-${f.name.replace(/[^\w.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("project-uploads").upload(path, f, {
        contentType: f.type || "application/octet-stream",
      });
      if (upErr) throw upErr;

      const { data: doc, error: dbErr } = await supabase.from("project_documents").insert({
        user_id: user.id,
        file_name: f.name,
        file_url: path,
        file_type: f.type || f.name.split(".").pop(),
        file_size: f.size,
        extracted_content: text.slice(0, 200000),
        upload_status: "extracted",
      }).select("id").single();
      if (dbErr) throw dbErr;
      setDocumentId(doc.id);

      await supabase.from("activity_log").insert({
        user_id: user.id,
        action: "document_upload",
        description: `Uploaded ${f.name} for refinement`,
        entity_type: "project_document",
        entity_id: doc.id,
      });

      toast({ title: "File ready", description: `Extracted ${text.length.toLocaleString()} characters.` });
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({ title: "Upload failed", description: err.message ?? "Try again.", variant: "destructive" });
      setFile(null);
      setExtracted("");
    } finally {
      setUploading(false);
    }
  };

  const runAnalysis = async () => {
    if (!extracted) return;
    if (!isPremium && tier === "free") {
      toast({
        title: "Preview only",
        description: "Free plan shows analysis preview. Upgrade for full refinement.",
      });
    }
    setAnalyzing(true);
    try {
       const data = await invokeFunction<unknown>("refine-project", { action: "analyze", text: extracted, profile });
      setAnalysis(data as Analysis);
      if (documentId) {
        await supabase.from("project_documents").update({ analysis: data, upload_status: "analyzed" }).eq("id", documentId);
      }
      setStep(1);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const saveInterview = async () => {
    if (!isPremium) {
      toast({
        title: "Upgrade required",
        description: "Full AI refinement is available on Premium+. Free plan shows analysis only.",
        variant: "destructive",
      });
      return;
    }
    try {
      const { data, error: supabaseError } = await supabase.from("project_refinement_requests").insert({
        user_id: user.id,
        document_id: documentId,
        user_answers: answers,
        refinement_status: "in_progress",
      }).select("id").single();
      if (supabaseError) throw supabaseError;
      setRefinementId(data.id);
      setStep(3);
      await splitSections();
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({ title: "Could not save answers", description: err.message, variant: "destructive" });
    }
  };

  const splitSections = async () => {
    setSplitting(true);
    try {
       const data = await invokeFunction<unknown>("refine-project", { action: "split_sections", text: extracted });
       const list: Section[] = (data?.sections ?? []).filter((s: unknown) => (s as { content?: string } | undefined)?.content?.trim());
      setSections(list.length ? list : [{ chapter: "Full Document", section: "Content", content: extracted.slice(0, 8000) }]);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({ title: "Could not split content", description: err.message, variant: "destructive" });
      setSections([{ chapter: "Full Document", section: "Content", content: extracted.slice(0, 8000) }]);
    } finally {
      setSplitting(false);
    }
  };

  const refineSection = async (idx: number, instruction = "Improve, strengthen arguments, fix flow and grammar") => {
    setRefiningIdx(idx);
    try {
      const s = sections[idx];
       const data = await invokeFunction<unknown>("refine-project", {
        action: "refine_section",
        section: `${s.chapter} — ${s.section}`,
        original: s.content,
        instruction,
        profile,
        answers,
      });
      const updated = [...sections];
      updated[idx] = { ...s, refined: data.new_content, changeSummary: data.change_summary, changes: data.changes ?? [] };
      setSections(updated);

      await supabase.from("project_section_versions").insert({
        user_id: user.id,
        old_content: s.content,
        new_content: data.new_content,
        change_summary: data.change_summary,
        source: "refinement",
      });
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({ title: "Refinement failed", description: err.message, variant: "destructive" });
    } finally {
      setRefiningIdx(null);
    }
  };

  const refineAll = async () => {
    for (let i = 0; i < sections.length; i++) {
      if (!sections[i].refined) await refineSection(i);
    }
    if (refinementId) {
      await supabase.from("project_refinement_requests").update({ refinement_status: "completed" }).eq("id", refinementId);
    }
    setStep(4);
  };

  const exportMarkdown = () => {
    const md = sections.map((s) =>
      `# ${s.chapter}\n## ${s.section}\n\n${s.refined ?? s.content}\n`
    ).join("\n\n");
    downloadBlob(md, "refined-project.md", "text/markdown");
  };

  const exportReport = () => {
    if (!analysis) return;
    const md = `# AI Improvement Report\n\n${analysis.summary ?? ""}\n\n## Scores\n` +
      Object.entries(analysis.scores ?? {}).map(([k, v]) => `- **${k}**: ${v}/100`).join("\n") +
      `\n\n## Missing Sections\n${(analysis.missing_sections ?? []).map((x) => `- ${x}`).join("\n")}` +
      `\n\n## Improvement Areas\n${(analysis.improvement_areas ?? []).map((x) => `- ${x}`).join("\n")}` +
      `\n\n## Recommendations\n${(analysis.recommendations ?? []).map((r) => `- **${r.title}** — ${r.detail}`).join("\n")}`;
    downloadBlob(md, "improvement-report.md", "text/markdown");
  };

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const overallScore = analysis?.scores?.overall ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-heading font-bold text-primary">jmk</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          <span className="text-xs font-semibold text-accent uppercase tracking-wider">AI Project Refinement Engine</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-2">
          Refine an existing project with AI
        </h1>
        <p className="text-muted-foreground mb-6">
          Upload your draft, get a full quality analysis, answer a few questions, then let AI refine it chapter by chapter.
        </p>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 whitespace-nowrap">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>{i + 1}</div>
              <span className={`text-sm ${i <= step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
              {i < STEPS.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* STEP 0 – Upload */}
        {step === 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground mb-1">Upload Existing Project</p>
              <p className="text-sm text-muted-foreground mb-4">PDF, DOCX, or TXT up to 15MB</p>
              <input id="up" type="file" accept=".pdf,.docx,.txt,.md" className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
              <Button variant="outline" asChild disabled={uploading}>
                <label htmlFor="up" className="cursor-pointer">
                  {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</> : "Choose File"}
                </label>
              </Button>
              {file && !uploading && (
                <div className="mt-4 inline-flex items-center gap-2 text-sm">
                  <FileCheck2 className="w-4 h-4 text-accent" />
                  {file.name} • {extracted.length.toLocaleString()} chars extracted
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={runAnalysis} disabled={!extracted || analyzing}>
                {analyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing…</> : <>Analyze Project <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 1 – Analysis */}
        {step === 1 && analysis && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-heading font-semibold mb-1">AI Improvement Report</h2>
                  <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-heading font-bold text-primary">{overallScore}<span className="text-lg text-muted-foreground">/100</span></div>
                  <div className="text-xs text-muted-foreground">Overall Score</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {(["structure", "research_quality", "writing_quality", "completeness"] as const).map((k) => (
                  <div key={k} className="p-4 rounded-xl bg-muted/40 border border-border">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{k.replace("_", " ")}</div>
                    <div className="flex items-end justify-between mb-2">
                      <span className="text-2xl font-heading font-bold text-foreground">{analysis.scores?.[k] ?? 0}</span>
                      <span className="text-xs text-muted-foreground">/100</span>
                    </div>
                    <Progress value={analysis.scores?.[k] ?? 0} className="h-1.5" />
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <IssueList icon={<AlertTriangle className="w-4 h-4 text-destructive" />} title="Missing sections" items={analysis.missing_sections} />
                <IssueList icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} title="Weak arguments" items={analysis.weak_arguments} />
                <IssueList icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} title="Formatting issues" items={analysis.formatting_issues} />
                <IssueList icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} title="Outdated information" items={analysis.outdated_information} />
              </div>
            </div>

            {(analysis.recommendations ?? []).length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="font-heading font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-accent" />Next Steps & Recommendations</h3>
                <ul className="space-y-3">
                  {analysis.recommendations!.map((r, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                      <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{r.title}</div>
                        <div className="text-sm text-muted-foreground">{r.detail}</div>
                        {r.target_section && <Badge variant="outline" className="mt-1 text-xs">{r.target_section}</Badge>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap justify-between gap-3">
              <Button variant="outline" onClick={exportReport}><Download className="w-4 h-4 mr-2" />Download Report</Button>
              <Button onClick={() => setStep(2)} disabled={!isPremium} title={!isPremium ? "Upgrade to refine" : ""}>
                Continue to AI Interview <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            {!isPremium && (
              <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 text-sm">
                <b>Preview only.</b> Free plan shows the analysis report. <Link to="/pricing" className="text-accent underline">Upgrade to Premium+</Link> to unlock full AI refinement of every chapter.
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 2 – Interview */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-heading font-semibold mb-2">Refinement Interview</h2>
            <p className="text-sm text-muted-foreground mb-4">A few quick questions so the AI can refine your project the right way.</p>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="University"><Input value={answers.university} onChange={(e) => setAnswers({ ...answers, university: e.target.value })} /></Field>
              <Field label="Department"><Input value={answers.department} onChange={(e) => setAnswers({ ...answers, department: e.target.value })} /></Field>
              <Field label="Submission deadline"><Input type="date" value={answers.deadline} onChange={(e) => setAnswers({ ...answers, deadline: e.target.value })} /></Field>
              <Field label="Keep original topic?">
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={answers.keep_topic} onChange={(e) => setAnswers({ ...answers, keep_topic: e.target.value })}>
                  <option value="yes">Yes, keep the same topic</option>
                  <option value="refine">Refine the topic wording</option>
                  <option value="change">Suggest a new angle</option>
                </select>
              </Field>
            </div>
            <Field label="Supervisor feedback (paste anything they said)">
              <Textarea rows={3} value={answers.supervisor_feedback} onChange={(e) => setAnswers({ ...answers, supervisor_feedback: e.target.value })} />
            </Field>
            <Field label="Which areas do you most want improved?">
              <Textarea rows={3} placeholder="e.g., Literature review is thin; methodology unclear; grammar and flow"
                value={answers.focus_areas} onChange={(e) => setAnswers({ ...answers, focus_areas: e.target.value })} />
            </Field>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
              <Button onClick={saveInterview}>Save & Start Refinement <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </div>
          </motion.div>
        )}

        {/* STEP 3 – Refine */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-heading font-semibold">Refining sections</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={splitSections} disabled={splitting}>
                  {splitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Re-split"}
                </Button>
                <Button onClick={refineAll} disabled={refiningIdx !== null || splitting}>
                  <Wand2 className="w-4 h-4 mr-2" />Refine All
                </Button>
              </div>
            </div>

            {splitting && (
              <div className="p-6 bg-card border border-border rounded-xl flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Splitting your document into sections…
              </div>
            )}

            <div className="space-y-3">
              {sections.map((s, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                    <div>
                      <div className="text-xs text-muted-foreground">{s.chapter}</div>
                      <div className="font-medium text-foreground">{s.section}</div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {s.refined && <Badge className="bg-accent/15 text-accent border-accent/30">Refined</Badge>}
                      <Button size="sm" variant="outline" onClick={() => refineSection(i, "Improve chapter")}
                        disabled={refiningIdx !== null}>Improve</Button>
                      <Button size="sm" variant="outline" onClick={() => refineSection(i, "Expand chapter with more depth and examples")}
                        disabled={refiningIdx !== null}>Expand</Button>
                      <Button size="sm" variant="outline" onClick={() => refineSection(i, "Rewrite section fully")}
                        disabled={refiningIdx !== null}>Rewrite</Button>
                      <Button size="sm" variant="outline" onClick={() => refineSection(i, "Simplify explanation for undergraduate readers")}
                        disabled={refiningIdx !== null}>Simplify</Button>
                    </div>
                  </div>
                  {refiningIdx === i && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Refining…</div>
                  )}
                  {s.changeSummary && (
                    <div className="text-xs text-muted-foreground italic mt-2">{s.changeSummary}</div>
                  )}
                </div>
              ))}
            </div>

            {sections.some((s) => s.refined) && (
              <div className="flex justify-end">
                <Button onClick={() => setStep(4)}>Review Changes <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 4 – Review */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h2 className="text-xl font-heading font-semibold">Before & After</h2>
            {sections.filter((s) => s.refined).map((s, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <div className="mb-3">
                  <div className="text-xs text-muted-foreground">{s.chapter}</div>
                  <div className="font-medium">{s.section}</div>
                  {s.changeSummary && <div className="text-sm text-muted-foreground mt-1">{s.changeSummary}</div>}
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-1">Original</div>
                    <div className="text-sm p-3 rounded-lg bg-muted/40 max-h-64 overflow-auto whitespace-pre-wrap">{s.content}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-accent mb-1">Improved</div>
                    <div className="text-sm p-3 rounded-lg bg-accent/5 border border-accent/20 max-h-64 overflow-auto whitespace-pre-wrap">{s.refined}</div>
                  </div>
                </div>
                {s.changes && s.changes.length > 0 && (
                  <ul className="mt-3 text-xs text-muted-foreground list-disc pl-5 space-y-1">
                    {s.changes.map((c, j) => <li key={j}>{c}</li>)}
                  </ul>
                )}
              </div>
            ))}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}><ArrowLeft className="w-4 h-4 mr-2" />Back to Refine</Button>
              <Button onClick={() => setStep(5)}>Export <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </div>
          </motion.div>
        )}

        {/* STEP 5 – Export */}
        {step === 5 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-heading font-semibold">Download your refined project</h2>
            <p className="text-sm text-muted-foreground">Export the improved project or the analysis report. Open the .md file in Word or Google Docs to save as PDF/DOCX.</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={exportMarkdown}><Download className="w-4 h-4 mr-2" />Refined Project (.md)</Button>
              <Button variant="outline" onClick={exportReport}><FileText className="w-4 h-4 mr-2" />Improvement Report (.md)</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Reminder: This AI output is a reference. Read, understand, adapt in your own words, and be ready to defend your work.
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <Label className="text-sm font-medium mb-2 block">{label}</Label>
    {children}
  </div>
);

const IssueList = ({ icon, title, items }: { icon: React.ReactNode; title: string; items?: string[] }) => (
  <div className="p-3 rounded-lg bg-muted/30 border border-border">
    <div className="flex items-center gap-2 font-medium text-sm mb-2">{icon}{title}</div>
    {items && items.length > 0 ? (
      <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
        {items.map((x, i) => <li key={i}>{x}</li>)}
      </ul>
    ) : <div className="text-xs text-muted-foreground">None detected.</div>}
  </div>
);

export default RefineProject;

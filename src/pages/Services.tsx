import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Briefcase, Loader2, Send, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/hooks/useEntitlements";
import NotificationBell from "@/components/notifications/NotificationBell";

const categories = [
  "Full project writing support",
  "Data analysis (SPSS / Python / R)",
  "Website or app development",
  "Presentation design",
  "Document formatting & proofreading",
  "Literature review assistance",
  "Other",
];

const statusVariant: Record<string, string> = {
  pending: "secondary",
  reviewing: "secondary",
  quoted: "default",
  accepted: "default",
  in_progress: "default",
  completed: "default",
  rejected: "destructive",
};

const Services = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<unknown[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    category: "",
    department: "",
    description: "",
    requirements: "",
    deadline: "",
  });

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }
    const { data } = await supabase
      .from("service_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRequests(data ?? []);
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category || form.description.trim().length < 20) {
      toast({
        title: "Missing details",
        description: "Pick a category and describe your request in at least 20 characters.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }

    const { error } = await supabase.from("service_requests").insert({
      user_id: user.id,
      category: form.category,
      department: form.department || null,
      description: form.description.trim().slice(0, 4000),
      requirements: form.requirements.trim().slice(0, 4000) || null,
      deadline: form.deadline || null,
      status: "pending",
    });
    setSubmitting(false);

    if (error) {
      toast({ title: "Could not submit", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Request submitted", description: "Our team will review and send you a quote." });
    setForm({ category: "", department: "", description: "", requirements: "", deadline: "" });
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container-main flex items-center justify-between py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" /> Dashboard</Link>
          </Button>
          <NotificationBell />
        </div>
      </header>

      <main className="container-main py-10 space-y-10">
        <div className="max-w-2xl">
          <Badge variant="secondary" className="mb-3">Custom Services</Badge>
          <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
            Need hands-on help beyond AI?
          </h1>
          <p className="text-muted-foreground">
            Submit a custom request and our academic team will review it and send you a quote.
            You only pay after you accept the price.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={submit}
            className="lg:col-span-3 bg-card rounded-2xl border border-border p-6 space-y-5"
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-accent" />
              <h2 className="font-heading font-semibold text-foreground">New request</h2>
            </div>

            <div className="space-y-2">
              <Label>Service category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Input
                  value={form.department}
                  maxLength={100}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="e.g. Computer Science"
                />
              </div>
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>What do you need? *</Label>
              <Textarea
                rows={5}
                maxLength={4000}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe your project and the help you need…"
              />
              <p className="text-xs text-muted-foreground">{form.description.length}/4000</p>
            </div>

            <div className="space-y-2">
              <Label>Specific requirements</Label>
              <Textarea
                rows={3}
                maxLength={4000}
                value={form.requirements}
                onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                placeholder="Formatting style, software, word count, supervisor comments…"
              />
            </div>

            <Button type="submit" variant="accent" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Submit request
            </Button>
            <p className="text-xs text-muted-foreground">
              Custom services are delivered by human specialists. All work is provided as a reference
              and learning aid — you remain responsible for your final submission.
            </p>
          </motion.form>

          {/* My requests */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-accent" />
              <h2 className="font-heading font-semibold text-foreground">My requests</h2>
            </div>
            {requests.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                You have not submitted any requests yet.
              </div>
            )}
            {requests.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="font-medium text-foreground text-sm">{r.category}</p>
                  <Badge variant={statusVariant[r.status] ?? "secondary"}>{r.status.replace("_", " ")}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">{r.description}</p>
                {r.admin_price != null && (
                  <p className="text-sm font-semibold text-accent mt-2">
                    Quote: {formatNaira(Number(r.admin_price))}
                  </p>
                )}
                {r.admin_note && <p className="text-xs text-muted-foreground mt-1">{r.admin_note}</p>}
                <p className="text-[10px] text-muted-foreground mt-2">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Services;

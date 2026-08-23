import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2, Plus, Trash2, ShieldCheck,
  TrendingUp, Users, Wallet, Briefcase, Sparkles, Settings,
  FileText, CreditCard, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/hooks/useEntitlements";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminShell from "@/components/admin/AdminShell";
import AdminPricing from "@/pages/admin/AdminPricing";
import AdminAI from "@/components/admin/AdminAI";

const REQUEST_STATUSES = ["pending", "reviewing", "quoted", "accepted", "in_progress", "completed", "rejected"];

function isAdminAuthenticated(): boolean {
  try {
    return sessionStorage.getItem("jmk_admin_auth") === "1";
  } catch {
    return false;
  }
}

function clearAdminAuth() {
  try {
    sessionStorage.removeItem("jmk_admin_auth");
  } catch {
    // noop
  }
}

const Admin = () => {
  const nav = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ai");

  const [universities, setUniversities] = useState<Array<{ id: string; name: string; short_name?: string | null; city?: string | null; type?: string | null }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; specializations?: string[] | null }>>([]);
  const [fields, setFields] = useState<Array<{ id: string; name: string; department_hint?: string | null; description?: string | null }>>([]);

  const [txns, setTxns] = useState<Array<{ id: string; amount: number | null; status: string; reference?: string | null; metadata?: Record<string, unknown> | null; transaction_type?: string | null; created_at?: string }>>([]);
  const [subs, setSubs] = useState<Array<{ id: string; user_id: string; status: string; subscription_plans?: { name?: string | null; slug?: string | null; price?: number | null } | null; created_at?: string }>>([]);
  const [usage, setUsage] = useState<Array<{ feature?: string | null; credits_used?: number | null; created_at?: string }>>([]);
  const [requests, setRequests] = useState<Array<{ id: string; user_id: string; category: string; status: string; admin_price?: number | null; admin_note?: string | null; description?: string; department?: string | null; deadline?: string | null; created_at?: string }>>([]);
  const [quote, setQuote] = useState<Record<string, { price: string; note: string; status: string }>>({});

  const [newUni, setNewUni] = useState({ name: "", short_name: "", city: "", type: "Federal" });
  const [newDept, setNewDept] = useState({ name: "", description: "", specializations: "", common_methodologies: "", ai_guidance: "" });
  const [newField, setNewField] = useState({ name: "", department_hint: "", description: "" });

  const loadBusiness = async () => {
    const [{ data: t }, { data: s }, { data: au }, { data: r }] = await Promise.all([
      supabase.from("payment_transactions").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("user_subscriptions").select("*, subscription_plans(name, slug, price)").order("created_at", { ascending: false }).limit(200),
      supabase.from("ai_usage_logs").select("feature, credits_used, created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("service_requests").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setTxns((t as Array<{ id: string; amount: number | null; status: string; reference?: string | null; metadata?: Record<string, unknown> | null; transaction_type?: string | null; created_at?: string }>) ?? []);
    setSubs((s as Array<{ id: string; user_id: string; status: string; subscription_plans?: { name?: string | null; slug?: string | null; price?: number | null } | null; created_at?: string }>) ?? []);
    setUsage((au as Array<{ feature?: string | null; credits_used?: number | null; created_at?: string }>) ?? []);
    setRequests((r as Array<{ id: string; user_id: string; category: string; status: string; admin_price?: number | null; admin_note?: string | null; description?: string; department?: string | null; deadline?: string | null; created_at?: string }>) ?? []);
  };

  useEffect(() => {
    (async () => {
      if (!isAdminAuthenticated()) {
        nav("/admin/login", { replace: true });
        return;
      }
    const [{ data: u }, { data: d }, { data: f }] = await Promise.all([
      supabase.from("universities").select("*").order("name"),
      supabase.from("departments").select("*").order("name"),
      supabase.from("research_fields").select("*").order("name"),
    ]);
    setUniversities((u as Array<{ id: string; name: string; short_name?: string | null; city?: string | null; type?: string | null }>) ?? []);
    setDepartments((d as Array<{ id: string; name: string; specializations?: string[] | null }>) ?? []);
    setFields((f as Array<{ id: string; name: string; department_hint?: string | null; description?: string | null }>) ?? []);
      await loadBusiness();
      setLoading(false);
    })();
  }, [nav]);

  const saveQuote = async (r: { id: string; user_id: string; category: string; status: string; admin_price?: number | null; admin_note?: string | null; description?: string; department?: string | null; deadline?: string | null; created_at?: string }) => {
    const q = quote[r.id] ?? { price: r.admin_price != null ? String(r.admin_price) : "", note: r.admin_note ?? "", status: r.status };
    const payload: Record<string, unknown> = { status: q.status || (r as { status: string }).status };
    if (q.price !== "") payload.admin_price = Number(q.price);
    if (q.note !== "") payload.admin_note = q.note;

    const { error } = await supabase.from("service_requests").update(payload).eq("id", r.id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });

    await supabase.from("notifications").insert({
      user_id: r.user_id,
      title: payload.admin_price != null ? "Your custom service quote is ready" : "Service request updated",
      body: payload.admin_price != null
        ? `We quoted ${formatNaira(Number(payload.admin_price))} for "${r.category}".`
        : `Status changed to ${payload.status}.`,
      type: "info",
      link: "/services",
    });

    toast({ title: "Request updated" });
    loadBusiness();
  };

  const addUni = async () => {
    if (!newUni.name.trim()) return;
    const { data, error } = await supabase.from("universities").insert(newUni).select().single();
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setUniversities((x) => [...x, data]);
    setNewUni({ name: "", short_name: "", city: "", type: "Federal" });
  };
  const delUni = async (id: string) => {
    await supabase.from("universities").delete().eq("id", id);
    setUniversities((x) => x.filter((u) => u.id !== id));
  };

  const addDept = async () => {
    if (!newDept.name.trim()) return;
    const payload = {
      name: newDept.name,
      description: newDept.description,
      specializations: newDept.specializations.split(",").map((s) => s.trim()).filter(Boolean),
      common_methodologies: newDept.common_methodologies.split(",").map((s) => s.trim()).filter(Boolean),
      ai_guidance: newDept.ai_guidance,
    };
    const { data, error } = await supabase.from("departments").insert(payload).select().single();
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setDepartments((x) => [...x, data]);
    setNewDept({ name: "", description: "", specializations: "", common_methodologies: "", ai_guidance: "" });
  };
  const delDept = async (id: string) => {
    await supabase.from("departments").delete().eq("id", id);
    setDepartments((x) => x.filter((u) => u.id !== id));
  };

  const addField = async () => {
    if (!newField.name.trim()) return;
    const { data, error } = await supabase.from("research_fields").insert(newField).select().single();
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setFields((x) => [...x, data]);
    setNewField({ name: "", department_hint: "", description: "" });
  };
  const delField = async (id: string) => {
    await supabase.from("research_fields").delete().eq("id", id);
    setFields((x) => x.filter((u) => u.id !== id));
  };

  if (loading) {
     return (
       <AdminShell title="Loading">
         <div className="py-16 grid place-items-center"><Loader2 className="animate-spin w-6 h-6 text-accent" /></div>
       </AdminShell>
     );
   }

   return (
    <AdminShell title="Business & academic control">
      <div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="ai">AI Control</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="content">Site content</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="requests">Service requests</TabsTrigger>
            <TabsTrigger value="universities">Universities</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="fields">Research fields</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-4">
            <AdminAnalytics />
          </TabsContent>

          <TabsContent value="ai" className="mt-4">
            <AdminAI />
          </TabsContent>

          <TabsContent value="pricing" className="mt-4">
            <AdminPricing />
          </TabsContent>

          <TabsContent value="content" className="mt-4">
            <AdminContent />
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <AdminPayments />
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6 mt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Metric icon={<Wallet className="w-5 h-5 text-accent" />} label="Total revenue"
                value={formatNaira(txns.filter((t) => t.status === "success").reduce((s, t) => s + Number(t.amount || 0), 0))} />
              <Metric icon={<TrendingUp className="w-5 h-5 text-accent" />} label="Successful payments"
                value={String(txns.filter((t) => t.status === "success").length)} />
              <Metric icon={<Users className="w-5 h-5 text-accent" />} label="Active subscribers"
                value={String(subs.filter((s) => s.status === "active").length)} />
              <Metric icon={<Sparkles className="w-5 h-5 text-accent" />} label="AI credits used"
                value={String(usage.reduce((s, u) => s + (u.credits_used || 0), 0))} />
            </div>

            <div>
              <h3 className="font-heading font-semibold mb-2">Subscribers by plan</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(
                  subs.filter((s) => s.status === "active").reduce((acc: Record<string, number>, s) => {
                    const n = s.subscription_plans?.name ?? "Unknown";
                    acc[n] = (acc[n] ?? 0) + 1;
                    return acc;
                  }, {}),
                ).map(([name, count]) => (
                  <div key={name} className="border border-border rounded-lg p-3 bg-background">
                    <p className="text-sm text-muted-foreground">{name}</p>
                    <p className="text-xl font-heading font-bold">{count as number}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-heading font-semibold mb-2">Recent transactions</h3>
              <div className="space-y-1">
                {txns.slice(0, 20).map((t) => (
                  <div key={t.id} className="flex items-center justify-between border border-border rounded-lg p-3 bg-background">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.metadata?.plan_slug ?? t.transaction_type}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.created_at ? new Date(t.created_at).toLocaleString() : "no date"} · {t.reference}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatNaira(Number(t.amount))}</p>
                      <Badge variant={t.status === "success" ? "default" : t.status === "pending" ? "secondary" : "destructive"}>{t.status}</Badge>
                    </div>
                  </div>
                ))}
                {txns.length === 0 && <p className="text-sm text-muted-foreground">No transactions yet.</p>}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-3 mt-4">
            {requests.length === 0 && <p className="text-sm text-muted-foreground">No custom service requests yet.</p>}
            {requests.map((r) => {
              const q = quote[r.id] ?? { price: r.admin_price ?? "", note: r.admin_note ?? "", status: r.status };
              return (
                <div key={r.id} className="border border-border rounded-xl p-4 bg-background space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-accent" /> {r.category}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.department ?? "—"} · deadline {r.deadline ?? "none"} · {r.created_at ? new Date(r.created_at).toLocaleDateString() : "no date"}
                      </p>
                    </div>
                    <Badge variant="secondary">{r.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <Input type="number" placeholder="Quote (₦)" value={String(q.price)}
                      onChange={(e) => setQuote({ ...quote, [r.id]: { ...q, price: e.target.value } })} />
                    <Input placeholder="Note to student" value={q.note}
                      onChange={(e) => setQuote({ ...quote, [r.id]: { ...q, note: e.target.value } })} />
                    <Select value={q.status} onValueChange={(v) => setQuote({ ...quote, [r.id]: { ...q, status: v } })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {REQUEST_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => saveQuote(r)}>Save & notify</Button>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="universities" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 border border-border rounded-xl p-3 bg-muted/20">
              <Input placeholder="Name" value={newUni.name} onChange={(e) => setNewUni({ ...newUni, name: e.target.value })} />
              <Input placeholder="Short name" value={newUni.short_name} onChange={(e) => setNewUni({ ...newUni, short_name: e.target.value })} />
              <Input placeholder="City" value={newUni.city} onChange={(e) => setNewUni({ ...newUni, city: e.target.value })} />
              <Input placeholder="Type" value={newUni.type} onChange={(e) => setNewUni({ ...newUni, type: e.target.value })} />
              <Button onClick={addUni}><Plus className="w-4 h-4 mr-1" />Add</Button>
            </div>
            <div className="space-y-1">
              {universities.map((u) => (
                <Row key={u.id} title={`${u.name}${u.short_name ? " ("+u.short_name+")" : ""}`}
                  subtitle={`${u.city ?? ""} · ${u.type ?? ""}`} onDelete={() => delUni(u.id)} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="departments" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-2 border border-border rounded-xl p-3 bg-muted/20">
              <Input placeholder="Department name" value={newDept.name} onChange={(e) => setNewDept({ ...newDept, name: e.target.value })} />
              <Input placeholder="Description" value={newDept.description} onChange={(e) => setNewDept({ ...newDept, description: e.target.value })} />
              <Input placeholder="Specializations (comma-separated)" value={newDept.specializations} onChange={(e) => setNewDept({ ...newDept, specializations: e.target.value })} />
              <Input placeholder="Common methodologies (comma-separated)" value={newDept.common_methodologies} onChange={(e) => setNewDept({ ...newDept, common_methodologies: e.target.value })} />
              <Textarea placeholder="AI guidance for this department" value={newDept.ai_guidance} onChange={(e) => setNewDept({ ...newDept, ai_guidance: e.target.value })} />
              <Button onClick={addDept}><Plus className="w-4 h-4 mr-1" />Add department</Button>
            </div>
            <div className="space-y-1">
              {departments.map((d) => (
                <Row key={d.id} title={d.name} subtitle={(d.specializations ?? []).join(", ")} onDelete={() => delDept(d.id)} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="fields" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 border border-border rounded-xl p-3 bg-muted/20">
              <Input placeholder="Field name" value={newField.name} onChange={(e) => setNewField({ ...newField, name: e.target.value })} />
              <Input placeholder="Department hint" value={newField.department_hint} onChange={(e) => setNewField({ ...newField, department_hint: e.target.value })} />
              <Input placeholder="Description" value={newField.description} onChange={(e) => setNewField({ ...newField, description: e.target.value })} />
              <Button onClick={addField}><Plus className="w-4 h-4 mr-1" />Add</Button>
            </div>
            <div className="space-y-1">
              {fields.map((f) => (
                <Row key={f.id} title={f.name} subtitle={`${f.department_hint ?? ""} — ${f.description ?? ""}`} onDelete={() => delField(f.id)} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
};

const Metric = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="border border-border rounded-xl p-4 bg-background">
    <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
    <p className="text-xl font-heading font-bold text-foreground">{value}</p>
  </div>
);

const Row = ({ title, subtitle, onDelete }: { title: string; subtitle?: string; onDelete: () => void }) => (
  <div className="flex items-center justify-between border border-border rounded-lg p-3 bg-background">
    <div className="min-w-0">
      <p className="font-medium text-foreground truncate">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
    </div>
    <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-1">
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
);

const AdminContent = () => {
  const { toast } = useToast();
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings").select("free_mode_message").eq("id", "global").maybeSingle();
      if (data) {
        setHeroSubtitle(data.free_mode_message ?? "");
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("app_settings").update({ free_mode_message: heroSubtitle }).eq("id", "global");
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Site content updated" });
  };

  return (
    <div className="space-y-6">
      <div className="border border-border rounded-xl p-5 bg-card space-y-4">
        <h2 className="font-heading font-bold text-foreground flex items-center gap-2"><FileText className="w-4 h-4 text-accent" /> Homepage writeups</h2>
        <div className="space-y-2">
          <Label htmlFor="hero-subtitle">Hero subtitle / free mode banner</Label>
          <Textarea id="hero-subtitle" value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} rows={3} />
        </div>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" />Save writeup</>}
        </Button>
      </div>

      <div className="border border-border rounded-xl p-5 bg-card space-y-4">
        <h2 className="font-heading font-bold text-foreground flex items-center gap-2"><Image className="w-4 h-4 text-accent" /> Branding</h2>
        <p className="text-sm text-muted-foreground">Logo and site images are served from the <code className="bg-muted px-1 rounded">public/</code> folder. Replace the files there and redeploy to update branding across the app.</p>
      </div>
    </div>
  );
};

const AdminPayments = () => {
  const { toast } = useToast();
  const [providers, setProviders] = useState<Array<{ id: string; slug: string; name: string; public_key: string; secret_key: string; active: boolean }>>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: providersData } = await supabase.from("payment_providers").select("*").order("sort_order");
      setProviders((providersData ?? []).map((p: Record<string, unknown>) => ({
        id: String(p.id),
        slug: String(p.slug),
        name: String(p.name),
        public_key: String(p.public_key ?? ""),
        secret_key: String(p.secret_key ?? ""),
        active: !!p.active,
      })));
      setLoading(false);
    })();
  }, []);

  const saveProvider = async (provider: typeof providers[0]) => {
    setSaving(true);
    const { error } = await supabase
      .from("payment_providers")
      .update({
        public_key: provider.public_key,
        secret_key: provider.secret_key,
        active: provider.active,
      })
      .eq("id", provider.id);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: `${provider.name} settings saved` });
  };

  const toggleProvider = async (provider: typeof providers[0]) => {
    const next = { ...provider, active: !provider.active };
    setProviders((list) => list.map((p) => (p.id === provider.id ? next : p)));
    await saveProvider(next);
  };

  const updateProvider = (id: string, values: Partial<typeof providers[0]>) => {
    setProviders((list) => list.map((p) => (p.id === id ? { ...p, ...values } : p)));
  };

  if (loading) return <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      <div className="border border-border rounded-xl p-5 bg-card space-y-4">
        <h2 className="font-heading font-bold text-foreground flex items-center gap-2"><CreditCard className="w-4 h-4 text-accent" /> Payment providers</h2>
        <p className="text-sm text-muted-foreground">Turn providers on or off. Keys are stored in your Supabase database. For maximum security, sensitive secret keys should also be set in Edge Function secrets.</p>
        <div className="space-y-4">
          {providers.map((provider) => (
            <div key={provider.id} className="border border-border rounded-lg p-4 bg-background space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{provider.name}</p>
                  <p className="text-xs text-muted-foreground">Slug: {provider.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{provider.active ? "Active" : "Disabled"}</span>
                  <Switch checked={provider.active} onCheckedChange={() => toggleProvider(provider)} disabled={saving} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor={`pub-${provider.id}`}>Public key</Label>
                  <Input id={`pub-${provider.id}`} value={provider.public_key} onChange={(e) => updateProvider(provider.id, { public_key: e.target.value })} placeholder="pk_live_..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`sec-${provider.id}`}>Secret key</Label>
                  <Input id={`sec-${provider.id}`} type="password" value={provider.secret_key} onChange={(e) => updateProvider(provider.id, { secret_key: e.target.value })} placeholder="sk_live_..." />
                </div>
              </div>
              <Button size="sm" onClick={() => saveProvider(provider)} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" />Save {provider.name}</>}
              </Button>
            </div>
          ))}
          {providers.length === 0 && <p className="text-sm text-muted-foreground">No payment providers configured yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default Admin;

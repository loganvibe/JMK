import { useEffect, useState } from "react";
import { Users, UserCheck, FolderKanban, Sparkles, Percent, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/hooks/useEntitlements";
import { LoadingState, EmptyState } from "@/components/common/States";

type Stats = {
  students: number;
  activeUsers: number;
  projects: number;
  aiCredits: number;
  revenue: number;
  activeSubs: number;
  departments: [string, number][];
  features: [string, number][];
};

const AdminAnalytics = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [errors, setErrors] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since30 = new Date(Date.now() - 30 * 864e5).toISOString();

      const [profiles, projects, usage, txns, subs, errs] = await Promise.all([
        supabase.from("profiles").select("id, department, created_at"),
        supabase.from("projects").select("id, user_id, created_at"),
        supabase.from("ai_usage_logs").select("user_id, feature, credits_used, created_at").gte("created_at", since30),
        supabase.from("payment_transactions").select("amount, status"),
        supabase.from("user_subscriptions").select("user_id, status"),
        supabase.from("error_logs").select("*").order("created_at", { ascending: false }).limit(40),
      ]);

      const usageRows = usage.data ?? [];
      const byDept = new Map<string, number>();
      (profiles.data ?? []).forEach((p: { department?: string }) => {
        if (p.department) byDept.set(p.department, (byDept.get(p.department) ?? 0) + 1);
      });
      const byFeature = new Map<string, number>();
      usageRows.forEach((u: { feature?: string }) => byFeature.set(u.feature ?? "", (byFeature.get(u.feature ?? "") ?? 0) + 1));

      setStats({
        students: (profiles.data ?? []).length,
        activeUsers: new Set(usageRows.map((u: { user_id?: string }) => u.user_id ?? "")).size,
        projects: (projects.data ?? []).length,
        aiCredits: usageRows.reduce((s: number, u: { credits_used?: number }) => s + (u.credits_used || 0), 0),
        revenue: (txns.data ?? []).filter((t: { status?: string }) => t.status === "success").reduce((s: number, t: { amount?: number }) => s + Number(t.amount || 0), 0),
        activeSubs: (subs.data ?? []).filter((s: { status?: string }) => s.status === "active").length,
        departments: [...byDept.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
        features: [...byFeature.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
      });
      setErrors((errs.data as unknown[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading || !stats) return <LoadingState label="Crunching platform analytics…" />;

  const conversion = stats.students ? Math.round((stats.activeSubs / stats.students) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card icon={<Users className="w-5 h-5 text-primary" />} label="Total students" value={String(stats.students)} />
        <Card icon={<UserCheck className="w-5 h-5 text-primary" />} label="Active users (30d)" value={String(stats.activeUsers)} />
        <Card icon={<FolderKanban className="w-5 h-5 text-primary" />} label="Projects created" value={String(stats.projects)} />
        <Card icon={<Sparkles className="w-5 h-5 text-accent" />} label="AI credits (30d)" value={String(stats.aiCredits)} />
        <Card icon={<Percent className="w-5 h-5 text-accent" />} label="Conversion rate" value={`${conversion}%`} />
        <Card icon={<Users className="w-5 h-5 text-accent" />} label="Revenue" value={formatNaira(stats.revenue)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Popular departments" rows={stats.departments} empty="No student departments recorded yet." />
        <Panel title="Feature usage (30d)" rows={stats.features} empty="No AI feature usage in the last 30 days." />
      </div>

      <div>
        <h3 className="font-heading font-semibold mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" /> Recent errors
        </h3>
        {errors.length === 0 ? (
          <EmptyState title="No errors logged" description="Failed AI requests, payments and app errors will appear here." />
        ) : (
          <div className="space-y-1">
            {errors.map((e) => (
              <div key={e.id} className="flex items-start justify-between gap-3 border border-border rounded-lg p-3 bg-background">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{e.message}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {new Date(e.created_at).toLocaleString()} · {e.source ?? "unknown page"}
                  </p>
                </div>
                <Badge variant={e.severity === "critical" ? "destructive" : "secondary"}>{e.scope}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Card = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="border border-border rounded-xl p-4 bg-background">
    <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
    <p className="text-xl font-heading font-bold text-foreground">{value}</p>
  </div>
);

const Panel = ({ title, rows, empty }: { title: string; rows: [string, number][]; empty: string }) => (
  <div className="border border-border rounded-xl p-4 bg-background">
    <h3 className="font-heading font-semibold mb-3">{title}</h3>
    {rows.length === 0 ? (
      <p className="text-sm text-muted-foreground">{empty}</p>
    ) : (
      <div className="space-y-2">
        {rows.map(([name, count]) => {
          const max = rows[0][1] || 1;
          return (
            <div key={name}>
              <div className="flex justify-between text-sm">
                <span className="truncate pr-2">{name}</span>
                <span className="text-muted-foreground">{count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted mt-1">
                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export default AdminAnalytics;

import { useEffect, useState } from "react";
import { Users, UserCheck, FolderKanban, Sparkles, HeartHandshake, BadgeCheck, Clock, Coins, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/hooks/useEntitlements";
import { LoadingState, EmptyState } from "@/components/common/States";

type Stats = {
  students: number;
  projects: number;
  totalContributions: number;
  successfulPayments: number;
  activeWeeklyUsers: number;
  expiredWeeklyAccess: number;
  creditsGranted: number;
  creditsConsumed: number;
  aiUsageCost: number;
  departments: [string, number][];
  features: [string, number][];
};

const AdminAnalytics = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
      const [profiles, projects, usage, txns, balances, errs] = await Promise.all([
        supabase.from("profiles").select("id, department"),
        supabase.from("projects").select("id"),
        supabase.from("ai_credit_usage").select("user_id, feature_key, credits_used, created_at, input_tokens, output_tokens").gte("created_at", since30),
        supabase.from("payment_transactions").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("ai_credit_balances").select("user_id, access_expires_at, credits_total, daily_credits"),
        supabase.from("error_logs").select("*").order("created_at", { ascending: false }).limit(40),
      ]);

      const usageRows = usage.data ?? [];
      const txRows = txns.data ?? [];
      const balRows = balances.data ?? [];
      const now = Date.now();
      const everContributed = new Set(txRows.filter((t: any) => t.status === "success").map((t: any) => t.user_id));
      const activeWeeklyUsers = balRows.filter((b: any) => b.access_expires_at && new Date(b.access_expires_at).getTime() > now).length;
      const expiredWeeklyAccess = balRows.filter((b: any) => b.access_expires_at && new Date(b.access_expires_at).getTime() <= now && everContributed.has(b.user_id)).length;

      const byDept = new Map<string, number>();
      (profiles.data ?? []).forEach((p: any) => { if (p.department) byDept.set(p.department, (byDept.get(p.department) ?? 0) + 1); });
      const byFeature = new Map<string, number>();
      usageRows.forEach((u: any) => { const k = u.feature_key ?? "unknown"; byFeature.set(k, (byFeature.get(k) ?? 0) + (u.credits_used || 0)); });

      const creditsConsumed = usageRows.reduce((s: number, u: any) => s + (u.credits_used || 0), 0);
      // Simple cost proxy: 1 credit ~= 0.01 USD-equivalent units (configurable later); report token-derived estimate in NGN-equivalent not available, show credits*unit as usage cost proxy.
      const aiUsageCost = creditsConsumed; // credits consumed proxy; actual provider cost tracking can be added

      setStats({
        students: (profiles.data ?? []).length,
        projects: (projects.data ?? []).length,
        totalContributions: txRows.filter((t: any) => t.status === "success").reduce((s: number, t: any) => s + Number(t.amount || 0), 0),
        successfulPayments: txRows.filter((t: any) => t.status === "success").length,
        activeWeeklyUsers,
        expiredWeeklyAccess,
        creditsGranted: txRows.filter((t: any) => t.status === "success").reduce((s: number, t: any) => s + Number(t.metadata?.credits ?? 50), 0),
        creditsConsumed,
        aiUsageCost,
        departments: [...byDept.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
        features: [...byFeature.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
      });
      setHistory(txRows);
      setErrors(errs.data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading || !stats) return <LoadingState label="Crunching contribution & usage analytics…" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card icon={<Users className="w-5 h-5 text-primary" />} label="Total students" value={String(stats.students)} />
        <Card icon={<FolderKanban className="w-5 h-5 text-primary" />} label="Projects created" value={String(stats.projects)} />
        <Card icon={<HeartHandshake className="w-5 h-5 text-accent" />} label="Total contributions" value={formatNaira(stats.totalContributions)} />
        <Card icon={<BadgeCheck className="w-5 h-5 text-accent" />} label="Successful payments" value={String(stats.successfulPayments)} />
        <Card icon={<UserCheck className="w-5 h-5 text-accent" />} label="Active weekly users" value={String(stats.activeWeeklyUsers)} />
        <Card icon={<Clock className="w-5 h-5 text-muted-foreground" />} label="Expired weekly access" value={String(stats.expiredWeeklyAccess)} />
        <Card icon={<Sparkles className="w-5 h-5 text-accent" />} label="Credits granted" value={String(stats.creditsGranted)} />
        <Card icon={<Sparkles className="w-5 h-5 text-primary" />} label="Credits consumed (30d)" value={String(stats.creditsConsumed)} />
        <Card icon={<Coins className="w-5 h-5 text-primary" />} label="AI usage (credits, 30d)" value={String(stats.aiUsageCost)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Popular departments" rows={stats.departments} empty="No student departments recorded yet." />
        <Panel title="AI feature usage by credits (30d)" rows={stats.features} empty="No AI usage in the last 30 days." />
      </div>

      <div>
        <h3 className="font-heading font-semibold mb-2">Contribution & payment history</h3>
        {history.length === 0 ? <EmptyState title="No contributions yet" description="Successful and attempted contributions will appear here." /> : (
          <div className="space-y-1 max-h-80 overflow-auto pr-1">
            {history.map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-3 border border-border rounded-lg p-3 bg-background">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{formatNaira(Number(t.amount || 0))} • {t.reference}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.created_at ? new Date(t.created_at).toLocaleString() : ""} • {t.provider ?? "provider"} • {t.metadata?.credits ?? 50} credits</p>
                </div>
                <Badge variant={t.status === "success" ? "default" : t.status === "pending" ? "secondary" : "destructive"}>{t.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-heading font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" /> Recent errors</h3>
        {errors.length === 0 ? <EmptyState title="No errors logged" description="Failed AI requests, payments and app errors will appear here." /> : (
          <div className="space-y-1">
            {errors.map((e) => (
              <div key={e.id} className="flex items-start justify-between gap-3 border border-border rounded-lg p-3 bg-background">
                <div className="min-w-0"><p className="text-sm font-medium truncate">{e.message}</p><p className="text-xs text-muted-foreground truncate">{e.created_at ? new Date(e.created_at).toLocaleString() : "no date"} · {e.source ?? "unknown page"}</p></div>
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
  <div className="border border-border rounded-xl p-4 bg-background"><div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-muted-foreground">{label}</span></div><p className="text-xl font-heading font-bold text-foreground">{value}</p></div>
);
const Panel = ({ title, rows, empty }: { title: string; rows: [string, number][]; empty: string }) => (
  <div className="border border-border rounded-xl p-4 bg-background"><h3 className="font-heading font-semibold mb-3">{title}</h3>{rows.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : <div className="space-y-2">{rows.map(([name, count]) => { const max = rows[0][1] || 1; return (<div key={name}><div className="flex justify-between text-sm"><span className="truncate pr-2">{name}</span><span className="text-muted-foreground">{count}</span></div><div className="h-1.5 rounded-full bg-muted mt-1"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} /></div></div>); })}</div>}</div>
);

export default AdminAnalytics;

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";

/** Dedicated sign-in for the admin website. */
const AdminLogin = () => {
  const nav = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: role } = await supabase
          .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        if (role) { nav("/admin", { replace: true }); return; }
      }
      setChecking(false);
    })();
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      const { data: role } = await supabase
        .from("user_roles").select("role").eq("user_id", data.user!.id).eq("role", "admin").maybeSingle();
      if (!role) {
        await supabase.auth.signOut();
        throw new Error("This account does not have administrator access.");
      }
      nav("/admin", { replace: true });
    } catch (err: unknown) {
      const raw = String((err as Error)?.message ?? "");
      toast({
        title: "Admin sign-in failed",
        description: /invalid login credentials/i.test(raw)
          ? "That email and password combination is not correct."
          : raw || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-hero grid place-items-center p-4">
      <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to site
      </Link>

      <div className="w-full max-w-md bg-card rounded-2xl shadow-soft p-8 border border-border">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-accent grid place-items-center shadow-glow mb-4">
            <ShieldCheck className="w-7 h-7 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Admin console</h1>
          <p className="text-muted-foreground mt-1 text-sm">Restricted area — administrators only.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="admin-email" type="email" className="pl-10" value={email}
                onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="admin-password" type="password" className="pl-10" value={password}
                onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
          </div>
          <Button type="submit" variant="accent" size="lg" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : "Sign in to admin"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Forgot your password?{" "}
          <Link to="/forgot-password" className="text-accent hover:underline">Recover it here</Link>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Loader2, LogOut, ShieldCheck } from "lucide-react";

/**
 * Shell for the separate admin website. Handles the admin-only session guard,
 * a consistent console header and sign-out.
 */
const AdminShell = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const nav = useNavigate();
  const [state, setState] = useState<"loading" | "denied" | "ok">("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { nav("/admin/login", { replace: true }); return; }
      setEmail(user.email ?? null);
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!active) return;
      setState(role ? "ok" : "denied");
    };

    check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") nav("/admin/login", { replace: true });
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [nav]);

  const signOut = async () => {
    await supabase.auth.signOut();
    nav("/admin/login", { replace: true });
  };

  if (state === "loading") {
    return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>;
  }

  if (state === "denied") {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6">
        <div className="max-w-md text-center space-y-3">
          <ShieldCheck className="w-10 h-10 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-heading font-bold text-foreground">Admin access required</h1>
          <p className="text-sm text-muted-foreground">
            The account {email ?? "you signed in with"} is not an administrator on this platform.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={signOut}>Sign in as admin</Button>
            <Link to="/"><Button variant="ghost">Back to site</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link to="/admin" className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-accent grid place-items-center">
              <ShieldCheck className="w-4 h-4 text-accent-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-heading font-bold leading-tight truncate">jmk Admin</p>
              <p className="text-xs text-muted-foreground truncate">{title}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-[180px]">{email}</span>
            <Link to="/dashboard" className="hidden sm:block">
              <Button variant="ghost" size="sm"><LayoutDashboard className="w-4 h-4 mr-1" />Student app</Button>
            </Link>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-1" />Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
};

export default AdminShell;

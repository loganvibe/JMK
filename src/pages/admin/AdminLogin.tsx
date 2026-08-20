import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Lock, ShieldCheck } from "lucide-react";

const ADMIN_CREDENTIALS = {
  username: "boom",
  password: "12345654321",
};

function isAuthenticated(): boolean {
  try {
    return sessionStorage.getItem("jmk_admin_auth") === "1";
  } catch {
    return false;
  }
}

function setAuthenticated(value: boolean) {
  try {
    if (value) {
      sessionStorage.setItem("jmk_admin_auth", "1");
    } else {
      sessionStorage.removeItem("jmk_admin_auth");
    }
  } catch {
    // noop
  }
}

const AdminLogin = () => {
  const nav = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isAuthenticated()) {
      nav("/admin", { replace: true });
      return;
    }
    setChecking(false);
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const trimmedUsername = username.trim();
      const trimmedPassword = password.trim();

      if (
        trimmedUsername === ADMIN_CREDENTIALS.username &&
        trimmedPassword === ADMIN_CREDENTIALS.password
      ) {
        setAuthenticated(true);
        toast({ title: "Welcome back, admin" });
        nav("/admin", { replace: true });
        return;
      }

      toast({
        title: "Invalid credentials",
        description: "Please check your username and password.",
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
            <Label htmlFor="admin-username">Username</Label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="admin-username" type="text" className="pl-10" value={username}
                onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
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
      </div>
    </div>
  );
};

export default AdminLogin;

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (error) {
        console.error("Auth callback error", error);
        navigate("/login?error=auth");
        return;
      }
      navigate("/dashboard", { replace: true });
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-accent grid place-items-center mx-auto">
          <span className="text-accent-foreground font-bold text-sm">jmk</span>
        </div>
        <p className="text-sm text-muted-foreground">Completing sign-in…</p>
      </div>
    </div>
  );
};

export default AuthCallback;

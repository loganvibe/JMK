import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Lock, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/errors";

type RecoveryState = "checking" | "valid" | "expired" | "invalid" | "error";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryState, setRecoveryState] = useState<RecoveryState>("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" && session) {
        setRecoveryState("valid");
      } else if (event === "SIGNED_IN" && session) {
        setRecoveryState("valid");
      }
    });

    const checkRecoverySession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) {
          setRecoveryState("error");
          setErrorMessage(friendlyError(error, "auth"));
          return;
        }
        if (session) {
          setRecoveryState("valid");
        } else {
          setRecoveryState("invalid");
        }
      } catch (err) {
        if (!mounted) return;
        setRecoveryState("error");
        setErrorMessage(friendlyError(err, "auth"));
      }
    };

    checkRecoverySession();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return "Password must be at least 8 characters long.";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter.";
    if (!/[0-9]/.test(pwd)) return "Password must contain at least one number.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!password || !confirm) {
      setErrorMessage("Both password fields are required.");
      return;
    }

    if (password !== confirm) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    const validationError = validatePassword(password);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (recoveryState !== "valid") {
      setErrorMessage("This recovery link is invalid or has expired. Please request a new one.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({ title: "Password updated", description: "Your password has been changed. Please sign in with your new password." });
      navigate("/login", { replace: true });
    } catch (error: unknown) {
      const msg = friendlyError(error, "auth");
      if (/session.*expired|token.*expired|invalid.*token|already.*used/i.test(msg)) {
        setRecoveryState("expired");
        setErrorMessage("This recovery link has expired or was already used. Please request a new one.");
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-2xl shadow-soft p-8 border border-border">
          <div className="text-center mb-8">
            <div className="inline-flex w-12 h-12 rounded-xl bg-gradient-accent items-center justify-center shadow-glow mb-4">
              <GraduationCap className="w-7 h-7 text-accent-foreground" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Reset your password</h1>
            <p className="text-muted-foreground mt-1">Enter your new password below and confirm it to secure your account.</p>
          </div>

          {recoveryState === "checking" && (
            <div className="mb-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying recovery link…</span>
            </div>
          )}

          {(recoveryState === "expired" || recoveryState === "invalid" || recoveryState === "error") && (
            <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">
                  {recoveryState === "expired"
                    ? "Recovery link expired"
                    : recoveryState === "invalid"
                    ? "Invalid recovery link"
                    : "Unable to verify recovery link"}
                </p>
                <p className="mt-1">
                  {errorMessage || "This link is no longer valid. Please request a new password reset link."}
                </p>
                <Link to="/forgot-password" className="inline-block mt-2 text-accent hover:underline text-sm">
                  Request a new reset link
                </Link>
              </div>
            </div>
          )}

          {recoveryState === "valid" && (
            <>
              {errorMessage && (
                <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="pl-10 pr-10"
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                      required
                      autoComplete="new-password"
                      aria-describedby="password-requirements"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p id="password-requirements" className="text-xs text-muted-foreground">
                    At least 8 characters with uppercase, lowercase, and a number.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm new password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      className="pl-10 pr-10"
                      placeholder="Confirm new password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      minLength={8}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="accent"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Updating…
                    </>
                  ) : (
                    "Update password"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;

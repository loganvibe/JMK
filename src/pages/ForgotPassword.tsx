import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/errors";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (error: unknown) {
      toast({
        title: "Could not send reset link",
        description: friendlyError(error, "auth"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Link
        to="/login"
        className="absolute top-6 left-6 flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to sign in
      </Link>

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
            <p className="text-muted-foreground mt-1">
              We'll email you a secure link to choose a new password.
            </p>
          </div>

          {sent ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-accent" />
              <p className="text-sm text-foreground">
                If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way.
                Check your inbox and your spam folder.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                Use a different email
              </Button>
              <Link to="/login" className="block text-sm text-accent hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@university.edu.ng"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" variant="accent" size="lg" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending link…
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;

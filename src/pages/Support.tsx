import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  Send,
  MessageSquare,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  X,
  LayoutDashboard,
  FileText,
  Sparkles,
  User as UserIcon,
  CreditCard,
  BookOpen,
  Crown,
  Menu,
  X as XIcon,
  LogOut,
  Mail,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { signOutAndRedirect } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const CATEGORIES = [
  "Account/Login",
  "Payments",
  "AI Credits",
  "Project Workspace",
  "Technical Issue",
  "Other",
] as const;

type Category = (typeof CATEGORIES)[number];

type Conversation = {
  id: string;
  subject: string;
  category: string;
  status: "Open" | "In Progress" | "Awaiting User" | "Resolved";
  last_message_at: string;
  created_at: string;
  message_count?: number;
  last_message_preview?: string;
  is_admin_last?: boolean;
};

const Support = () => {
  const [user, setUser] = useState<unknown>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    category: "Technical Issue" as Category,
    message: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }
    setUser(user);

    const { data: convs, error } = await supabase
      .from("support_conversations")
      .select(`
        id,
        subject,
        category,
        status,
        last_message_at,
        created_at,
        support_messages(count)
      `)
      .eq("user_id", user.id)
      .order("last_message_at", { ascending: false });

    if (error) {
      toast({ title: "Failed to load conversations", description: error.message, variant: "destructive" });
    } else {
      setConversations((convs as Conversation[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [navigate]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.subject.trim()) errors.subject = "Subject is required";
    if (!formData.category) errors.category = "Category is required";
    if (!formData.message.trim()) errors.message = "Message is required";
    else if (formData.message.trim().length < 10) errors.message = "Message must be at least 10 characters";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !user || submitting) return;

    setSubmitting(true);
    try {
      const { data: conv, error: convError } = await supabase
        .from("support_conversations")
        .insert({
          user_id: user.id,
          subject: formData.subject.trim(),
          category: formData.category,
          status: "Open",
        })
        .select()
        .single();

      if (convError) throw convError;

      const { error: msgError } = await supabase
        .from("support_messages")
        .insert({
          conversation_id: conv.id,
          sender_id: user.id,
          message: formData.message.trim(),
          is_admin: false,
        });

      if (msgError) throw msgError;

      toast({ title: "Support request submitted", description: "Our team will get back to you soon." });
      setShowNewForm(false);
      setFormData({ subject: "", category: "Technical Issue", message: "" });
      await loadData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to submit request";
      toast({ title: "Submission failed", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOutAndRedirect("/");
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex">
        <main className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-lg border border-border shadow-soft"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <XIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <AnimatePresence>
        {(isSidebarOpen || (typeof window !== "undefined" && window.innerWidth >= 1024)) && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="fixed lg:static inset-y-0 left-0 z-40 w-64 bg-card border-r border-border flex flex-col"
          >
            <div className="p-6 border-b border-border">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow">
                  <LayoutDashboard className="w-6 h-6 text-accent-foreground" />
                </div>
                <span className="text-xl font-heading font-bold text-primary">jmk</span>
              </Link>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <LayoutDashboard className="w-5 h-5" /> Dashboard
              </Link>
              <Link to="/my-projects" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <FileText className="w-5 h-5" /> My Projects
              </Link>
              <Link to="/modify-project" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <Sparkles className="w-5 h-5" /> Modify Project
              </Link>
              <Link to="/profile" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <UserIcon className="w-5 h-5" /> Profile
              </Link>
              <Link to="/billing" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <CreditCard className="w-5 h-5" /> Billing
              </Link>
              <Link to="/services" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <BookOpen className="w-5 h-5" /> Custom Services
              </Link>
              <Link to="/pricing" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <Crown className="w-5 h-5" /> Plans
              </Link>
              <Link to="/support" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 text-accent font-medium">
                <MessageSquare className="w-5 h-5" /> Customer Support
              </Link>
            </nav>

            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" /> Log Out
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <main className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-2">
              Customer Support
            </h1>
             <p className="text-muted-foreground">
              Need help? Create a new support request or view your existing conversations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <a
              href="mailto:support@jmk.life"
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-accent/50 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Mail className="w-6 h-6 text-accent shrink-0" />
              <div>
                <p className="font-medium text-foreground">Email Support</p>
                <p className="text-sm text-muted-foreground">support@jmk.life</p>
              </div>
            </a>
            <a
              href="https://wa.me/2347017067943"
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-accent/50 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="w-6 h-6 text-accent shrink-0" />
              <div>
                <p className="font-medium text-foreground">WhatsApp Support</p>
                <p className="text-sm text-muted-foreground">+234(0)7017067943 / @JMK_SERVICE1</p>
              </div>
            </a>
          </div>

          {!showNewForm && conversations.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-heading font-semibold text-foreground mb-2">No support conversations yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Get help with your account, payments, AI credits, projects, or technical issues.
              </p>
              <Button variant="accent" size="lg" onClick={() => setShowNewForm(true)}>
                <MessageSquare className="w-4 h-4 mr-2" /> Create Support Request
              </Button>
            </div>
          ) : (
            <>
              {showNewForm && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-2xl border border-border p-6 space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="font-heading font-semibold text-foreground flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-accent" /> New Support Request
                    </h2>
                    <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="Brief summary of your issue"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className={formErrors.subject ? "border-destructive" : ""}
                        disabled={submitting}
                      />
                      {formErrors.subject && (
                        <p className="text-sm text-destructive">{formErrors.subject}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(v) => setFormData({ ...formData, category: v as Category })}
                        disabled={submitting}
                      >
                        <SelectTrigger className={formErrors.category ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.category && (
                        <p className="text-sm text-destructive">{formErrors.category}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Describe your issue in detail..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={6}
                        className={formErrors.message ? "border-destructive" : ""}
                        disabled={submitting}
                      />
                      {formErrors.message && (
                        <p className="text-sm text-destructive">{formErrors.message}</p>
                      )}
                    </div>
                    <Button type="submit" variant="accent" className="w-full" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Submit Request
                        </>
                      )}
                    </Button>
                  </form>
                </motion.div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-accent" /> Your Conversations
                  </h2>
                  {!showNewForm && (
                    <Button variant="accent" size="sm" onClick={() => setShowNewForm(true)}>
                      <MessageSquare className="w-4 h-4 mr-1" /> New Request
                    </Button>
                  )}
                </div>

                {conversations.length === 0 && !showNewForm ? (
                  <div className="text-center py-12 border border-border rounded-xl bg-card">
                    <p className="text-muted-foreground">No conversations yet. Click "New Request" to start one.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conversations.map((conv) => (
                      <Link
                        key={conv.id}
                        to={`/support/${conv.id}`}
                        className="block p-4 rounded-xl border border-border hover:border-accent/50 transition-colors bg-card"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground line-clamp-1">{conv.subject}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="secondary" className="text-xs">{conv.category}</Badge>
                              <Badge
                                variant={
                                  conv.status === "Resolved"
                                    ? "default"
                                    : conv.status === "In Progress"
                                    ? "secondary"
                                    : conv.status === "Awaiting User"
                                    ? "outline"
                                    : "default"
                                }
                                className="text-xs"
                              >
                                {conv.status}
                              </Badge>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {conv.message_count && conv.message_count > 1
                              ? `${conv.message_count} messages`
                              : "1 message"}
                          </span>
                          <span>{formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Support;
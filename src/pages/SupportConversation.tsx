import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { signOutAndRedirect } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
};

type Conversation = {
  id: string;
  subject: string;
  category: string;
  status: "Open" | "In Progress" | "Awaiting User" | "Resolved";
  last_message_at: string;
  created_at: string;
  user_id: string;
};

const SupportConversation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<unknown>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }
    setUser(user);

    // Load conversation
    const { data: conv, error: convError } = await supabase
      .from("support_conversations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (convError || !conv) {
      toast({ title: "Conversation not found", variant: "destructive" });
      navigate("/support");
      return;
    }

    // Check ownership
    if (conv.user_id !== user.id) {
      toast({ title: "Access denied", variant: "destructive" });
      navigate("/support");
      return;
    }

    setConversation(conv);

    // Load messages
    const { data: msgs, error: msgError } = await supabase
      .from("support_messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (msgError) {
      toast({ title: "Failed to load messages", description: msgError.message, variant: "destructive" });
    } else {
      setMessages(msgs || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id, navigate]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`support-messages-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !user || !conversation || sending) return;

    setSending(true);
    try {
      const { error: msgError } = await supabase
        .from("support_messages")
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          message: replyText.trim(),
          is_admin: false,
        });

      if (msgError) throw msgError;

      // Update conversation last_message_at
      await supabase
        .from("support_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversation.id);

      setReplyText("");
      toast({ title: "Reply sent" });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to send reply";
      toast({ title: "Send failed", description: msg, variant: "destructive" });
    } finally {
      setSending(false);
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

  if (!conversation) {
    return null;
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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/support")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-1">
                {conversation.subject}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="text-xs">{conversation.category}</Badge>
                <Badge
                  variant={
                    conversation.status === "Resolved"
                      ? "default"
                      : conversation.status === "In Progress"
                      ? "secondary"
                      : conversation.status === "Awaiting User"
                      ? "outline"
                      : "default"
                  }
                  className="text-xs"
                >
                  {conversation.status}
                </Badge>
                <span>Created {formatDistanceToNow(new Date(conversation.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 space-y-6 max-h-[60vh] overflow-auto">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.is_admin ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      msg.is_admin
                        ? "bg-muted rounded-bl-md"
                        : "bg-primary text-primary-foreground rounded-br-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1 text-right">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      {msg.is_admin && " · From Support Team"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No messages yet. Be the first to reply.
              </div>
            )}
          </div>

          <form onSubmit={handleReply} className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="reply" className="font-medium text-foreground">
                Your Reply
              </Label>
              {conversation.status === "Resolved" && (
                <Badge variant="outline" className="text-xs">Conversation resolved</Badge>
              )}
            </div>
            <Textarea
              id="reply"
              placeholder={conversation.status === "Resolved" ? "This conversation is resolved." : "Type your reply..."}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
              disabled={conversation.status === "Resolved" || sending}
            />
            <Button type="submit" variant="accent" className="w-full" disabled={!replyText.trim() || conversation.status === "Resolved" || sending}>
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Reply
                </>
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default SupportConversation;
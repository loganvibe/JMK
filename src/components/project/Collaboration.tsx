import { useEffect, useState } from "react";
import { Users, Send, Trash2, Loader2, MessageSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Props = { user: any; project: any };

/** Invite a supervisor and hold the review conversation in one place. */
const Collaboration = ({ user, project }: Props) => {
  const { toast } = useToast();
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("supervisor");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from("project_collaborators" as any).select("*").eq("project_id", project.id).order("created_at"),
      supabase.from("project_comments" as any).select("*").eq("project_id", project.id).order("created_at", { ascending: false }),
    ]);
    setCollaborators((c as any[]) ?? []);
    setComments((m as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`project-comments-${project.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_comments", filter: `project_id=eq.${project.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const invite = async () => {
    const clean = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(clean)) {
      toast({ title: "Enter a valid email address", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("project_collaborators" as any).insert({
      project_id: project.id,
      owner_id: user.id,
      email: clean,
      role,
    });
    setBusy(false);
    if (error) {
      toast({
        title: "Could not invite",
        description: error.message.includes("duplicate") ? "That person is already invited." : error.message,
        variant: "destructive",
      });
      return;
    }
    setEmail("");
    toast({ title: "Invitation added", description: `${clean} can view this project once they sign in.` });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("project_collaborators" as any).delete().eq("id", id);
    load();
  };

  const postComment = async () => {
    if (!body.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("project_comments" as any).insert({
      project_id: project.id,
      author_id: user.id,
      author_email: user.email,
      body: body.trim(),
    });
    setBusy(false);
    if (error) {
      toast({ title: "Could not post", description: error.message, variant: "destructive" });
      return;
    }
    setBody("");
    load();
  };

  const toggleResolved = async (c: any) => {
    await supabase.from("project_comments" as any).update({ resolved: !c.resolved }).eq("id", c.id);
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-heading font-bold text-foreground">Supervisor Collaboration</h2>
        <p className="text-sm text-muted-foreground">
          Invite your supervisor to review this project and keep all feedback in one thread.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Users className="w-4 h-4 text-accent" /> People with access
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="supervisor@university.edu.ng"
            className="flex-1 min-w-[220px]"
            type="email"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="supervisor">Supervisor</option>
            <option value="co_supervisor">Co-supervisor</option>
            <option value="peer">Peer reviewer</option>
          </select>
          <Button variant="accent" onClick={invite} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Invite
          </Button>
        </div>

        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : collaborators.length ? (
          <div className="space-y-2">
            {collaborators.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{c.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{String(c.role).replace("_", " ")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{c.status}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No one else has access yet.</p>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MessageSquare className="w-4 h-4 text-accent" /> Review thread
        </div>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a note or question for your supervisor…"
          className="min-h-[90px]"
        />
        <div className="flex justify-end">
          <Button onClick={postComment} disabled={busy || !body.trim()}>
            <Send className="w-4 h-4 mr-2" /> Post
          </Button>
        </div>

        <div className="space-y-2">
          {comments.map((c) => (
            <div
              key={c.id}
              className={`rounded-xl border p-3 ${c.resolved ? "border-success/40 bg-success/5" : "border-border"}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs text-muted-foreground">
                  {c.author_email ?? "Member"} · {new Date(c.created_at).toLocaleString()}
                </p>
                <Button size="sm" variant="ghost" onClick={() => toggleResolved(c)}>
                  <CheckCircle2 className={`w-4 h-4 ${c.resolved ? "text-success" : "text-muted-foreground"}`} />
                </Button>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
          {!comments.length && <p className="text-sm text-muted-foreground">No feedback yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default Collaboration;

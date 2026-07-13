import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Trash2, ShieldCheck, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Admin = () => {
  const nav = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState("universities");

  const [universities, setUniversities] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);

  const [newUni, setNewUni] = useState({ name: "", short_name: "", city: "", type: "Federal" });
  const [newDept, setNewDept] = useState({ name: "", description: "", specializations: "", common_methodologies: "", ai_guidance: "" });
  const [newField, setNewField] = useState({ name: "", department_hint: "", description: "" });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav("/login"); return; }
      const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!role);
      if (!role) { setLoading(false); return; }
      const [{ data: u }, { data: d }, { data: f }] = await Promise.all([
        supabase.from("universities").select("*").order("name"),
        supabase.from("departments").select("*").order("name"),
        supabase.from("research_fields").select("*").order("name"),
      ]);
      setUniversities(u ?? []); setDepartments(d ?? []); setFields(f ?? []);
      setLoading(false);
    })();
  }, [nav]);

  const addUni = async () => {
    if (!newUni.name.trim()) return;
    const { data, error } = await supabase.from("universities").insert(newUni).select().single();
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setUniversities((x) => [...x, data]);
    setNewUni({ name: "", short_name: "", city: "", type: "Federal" });
  };
  const delUni = async (id: string) => {
    await supabase.from("universities").delete().eq("id", id);
    setUniversities((x) => x.filter((u) => u.id !== id));
  };

  const addDept = async () => {
    if (!newDept.name.trim()) return;
    const payload = {
      name: newDept.name,
      description: newDept.description,
      specializations: newDept.specializations.split(",").map((s) => s.trim()).filter(Boolean),
      common_methodologies: newDept.common_methodologies.split(",").map((s) => s.trim()).filter(Boolean),
      ai_guidance: newDept.ai_guidance,
    };
    const { data, error } = await supabase.from("departments").insert(payload).select().single();
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setDepartments((x) => [...x, data]);
    setNewDept({ name: "", description: "", specializations: "", common_methodologies: "", ai_guidance: "" });
  };
  const delDept = async (id: string) => {
    await supabase.from("departments").delete().eq("id", id);
    setDepartments((x) => x.filter((u) => u.id !== id));
  };

  const addField = async () => {
    if (!newField.name.trim()) return;
    const { data, error } = await supabase.from("research_fields").insert(newField).select().single();
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setFields((x) => [...x, data]);
    setNewField({ name: "", department_hint: "", description: "" });
  };
  const delField = async (id: string) => {
    await supabase.from("research_fields").delete().eq("id", id);
    setFields((x) => x.filter((u) => u.id !== id));
  };

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin w-6 h-6" /></div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md text-center space-y-3">
          <ShieldCheck className="w-10 h-10 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-heading font-bold">Admin access required</h1>
          <p className="text-sm text-muted-foreground">
            An administrator must grant you the <code>admin</code> role in the <code>user_roles</code> table to access this page.
          </p>
          <Link to="/dashboard"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to dashboard</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /></Link>
            <GraduationCap className="w-5 h-5 text-accent" />
            <h1 className="font-heading font-bold">Academic Management</h1>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="universities">Universities</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="fields">Research fields</TabsTrigger>
          </TabsList>

          <TabsContent value="universities" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 border border-border rounded-xl p-3 bg-muted/20">
              <Input placeholder="Name" value={newUni.name} onChange={(e) => setNewUni({ ...newUni, name: e.target.value })} />
              <Input placeholder="Short name" value={newUni.short_name} onChange={(e) => setNewUni({ ...newUni, short_name: e.target.value })} />
              <Input placeholder="City" value={newUni.city} onChange={(e) => setNewUni({ ...newUni, city: e.target.value })} />
              <Input placeholder="Type" value={newUni.type} onChange={(e) => setNewUni({ ...newUni, type: e.target.value })} />
              <Button onClick={addUni}><Plus className="w-4 h-4 mr-1" />Add</Button>
            </div>
            <div className="space-y-1">
              {universities.map((u) => (
                <Row key={u.id} title={`${u.name}${u.short_name ? " ("+u.short_name+")" : ""}`}
                  subtitle={`${u.city ?? ""} · ${u.type ?? ""}`} onDelete={() => delUni(u.id)} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="departments" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-2 border border-border rounded-xl p-3 bg-muted/20">
              <Input placeholder="Department name" value={newDept.name} onChange={(e) => setNewDept({ ...newDept, name: e.target.value })} />
              <Input placeholder="Description" value={newDept.description} onChange={(e) => setNewDept({ ...newDept, description: e.target.value })} />
              <Input placeholder="Specializations (comma-separated)" value={newDept.specializations} onChange={(e) => setNewDept({ ...newDept, specializations: e.target.value })} />
              <Input placeholder="Common methodologies (comma-separated)" value={newDept.common_methodologies} onChange={(e) => setNewDept({ ...newDept, common_methodologies: e.target.value })} />
              <Textarea placeholder="AI guidance for this department" value={newDept.ai_guidance} onChange={(e) => setNewDept({ ...newDept, ai_guidance: e.target.value })} />
              <Button onClick={addDept}><Plus className="w-4 h-4 mr-1" />Add department</Button>
            </div>
            <div className="space-y-1">
              {departments.map((d) => (
                <Row key={d.id} title={d.name} subtitle={(d.specializations ?? []).join(", ")} onDelete={() => delDept(d.id)} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="fields" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 border border-border rounded-xl p-3 bg-muted/20">
              <Input placeholder="Field name" value={newField.name} onChange={(e) => setNewField({ ...newField, name: e.target.value })} />
              <Input placeholder="Department hint" value={newField.department_hint} onChange={(e) => setNewField({ ...newField, department_hint: e.target.value })} />
              <Input placeholder="Description" value={newField.description} onChange={(e) => setNewField({ ...newField, description: e.target.value })} />
              <Button onClick={addField}><Plus className="w-4 h-4 mr-1" />Add</Button>
            </div>
            <div className="space-y-1">
              {fields.map((f) => (
                <Row key={f.id} title={f.name} subtitle={`${f.department_hint ?? ""} — ${f.description ?? ""}`} onDelete={() => delField(f.id)} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const Row = ({ title, subtitle, onDelete }: { title: string; subtitle?: string; onDelete: () => void }) => (
  <div className="flex items-center justify-between border border-border rounded-lg p-3 bg-background">
    <div className="min-w-0">
      <p className="font-medium text-foreground truncate">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
    </div>
    <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-1">
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
);

export default Admin;

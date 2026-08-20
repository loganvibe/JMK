import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  LogOut,
  LayoutDashboard,
  FileText,
  CreditCard,
  Sparkles,
  User as UserIcon,
  Loader2,
  Menu,
  X,
  Save,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { signOutAndRedirect } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const academicLevels = [
  "100 Level",
  "200 Level",
  "300 Level",
  "400 Level",
  "500 Level",
  "600 Level",
  "MSc",
  "PhD",
];

const currentYear = new Date().getFullYear();
const gradYears = Array.from({ length: 8 }, (_, i) => currentYear + i - 1);

const Profile = () => {
  const [user, setUser] = useState<unknown>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    university: "",
    faculty: "",
    department: "",
    course: "",
    academic_level: "",
    graduation_year: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUser(user);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setForm({
          full_name: data.full_name ?? "",
          university: data.university ?? "",
          faculty: data.faculty ?? "",
          department: data.department ?? "",
          course: data.course ?? "",
          academic_level: data.academic_level ?? "",
          graduation_year: data.graduation_year ? String(data.graduation_year) : "",
        });
      }
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const payload = {
      id: user.id,
      email: user.email,
      full_name: form.full_name,
      university: form.university,
      faculty: form.faculty,
      department: form.department,
      course: form.course,
      academic_level: form.academic_level,
      graduation_year: form.graduation_year ? parseInt(form.graduation_year) : null,
    };
    const { error } = await supabase.from("profiles").upsert(payload);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("activity_log").insert({
        user_id: user.id,
        action: "profile_updated",
        description: "Updated academic profile",
      });
      toast({ title: "Profile saved", description: "Your academic profile is up to date." });
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await signOutAndRedirect("/");
  };

  const userName = form.full_name || user?.email?.split("@")[0] || "Student";

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="min-h-screen bg-background flex">
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-lg border border-border shadow-soft"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
                  <GraduationCap className="w-6 h-6 text-accent-foreground" />
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
              <Link to="/profile" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 text-accent font-medium">
                <UserIcon className="w-5 h-5" /> Profile
              </Link>
              <Link to="/pricing" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <CreditCard className="w-5 h-5" /> Subscription
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
        <div className="p-6 lg:p-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-2">
              Academic Profile
            </h1>
            <p className="text-muted-foreground">
              Personalize your experience — we use your academic details to tailor project suggestions and AI outputs.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSave}
              className="bg-card rounded-2xl border border-border p-6 lg:p-8 space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label>Full Name</Label>
                  <Input placeholder="Your full name" {...field("full_name")} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>University</Label>
                  <Input placeholder="e.g. University of Lagos" {...field("university")} />
                </div>
                <div className="space-y-2">
                  <Label>Faculty</Label>
                  <Input placeholder="e.g. Science" {...field("faculty")} />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input placeholder="e.g. Computer Science" {...field("department")} />
                </div>
                <div className="space-y-2">
                  <Label>Course / Programme</Label>
                  <Input placeholder="e.g. B.Sc. Computer Science" {...field("course")} />
                </div>
                <div className="space-y-2">
                  <Label>Academic Level</Label>
                  <Select
                    value={form.academic_level}
                    onValueChange={(v) => setForm((f) => ({ ...f, academic_level: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {academicLevels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Expected Graduation Year</Label>
                  <Select
                    value={form.graduation_year}
                    onValueChange={(v) => setForm((f) => ({ ...f, graduation_year: v }))}
                  >
                    <SelectTrigger className="md:w-64"><SelectValue placeholder="Select year" /></SelectTrigger>
                    <SelectContent>
                      {gradYears.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <Button type="submit" variant="accent" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Profile
                </Button>
              </div>
            </motion.form>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;

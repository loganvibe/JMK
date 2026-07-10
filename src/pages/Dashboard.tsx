import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap,
  Search,
  BookmarkPlus,
  LogOut,
  FolderOpen,
  Sparkles,
  Filter,
  LayoutDashboard,
  FileText,
  CreditCard,
  Menu,
  X,
  User as UserIcon,
  TrendingUp,
  Zap,
  Crown,
  Activity,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const departments = [
  "Computer Science","Mechanical Engineering","Electrical Engineering","Civil Engineering",
  "Business Administration","Accounting","Economics","Banking & Finance","Mass Communication",
  "Law","Microbiology","Biochemistry","Pharmacy","Medicine & Surgery","Nursing",
  "Public Administration","Political Science","Sociology","Psychology","Education",
];

const mockTopics = [
  { id: "1", title: "Impact of Artificial Intelligence on Nigerian Banking Sector", description: "Explore how AI is transforming banking operations, customer service, and fraud detection in Nigerian banks.", difficulty: "medium", keywords: ["AI","Banking","FinTech","Nigeria"] },
  { id: "2", title: "Blockchain Technology for Land Registry Management", description: "Design a decentralized land registry system to reduce fraud and improve transparency in property ownership.", difficulty: "hard", keywords: ["Blockchain","Land Registry","Smart Contracts"] },
  { id: "3", title: "Mobile Learning Application for Rural Education", description: "Develop a mobile app that works offline to deliver educational content to rural Nigerian students.", difficulty: "easy", keywords: ["Mobile App","Education","Rural","Offline"] },
  { id: "4", title: "E-Commerce Platform for Agricultural Products", description: "Build a platform connecting farmers directly with consumers, eliminating middlemen and improving farmer income.", difficulty: "medium", keywords: ["E-Commerce","Agriculture","Farmers","Marketplace"] },
  { id: "5", title: "Smart Traffic Management System Using IoT", description: "Design an IoT-based traffic monitoring and management system to reduce congestion in Nigerian cities.", difficulty: "hard", keywords: ["IoT","Traffic","Smart City","Sensors"] },
  { id: "6", title: "Healthcare Appointment Scheduling System", description: "Create a web application for scheduling hospital appointments and managing patient queues efficiently.", difficulty: "easy", keywords: ["Healthcare","Scheduling","Web App","Hospital"] },
];

type ProjectRow = {
  id: string;
  title: string;
  status: string;
  progress_percent: number;
};

const tierMeta: Record<string, { label: string; color: string; icon: any }> = {
  free: { label: "Free Plan", color: "bg-muted text-muted-foreground", icon: Sparkles },
  beta: { label: "Beta Plan", color: "bg-accent/10 text-accent", icon: Zap },
  premium: { label: "Premium+ Plan", color: "bg-primary/10 text-primary", icon: Crown },
};

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [aiUsage, setAiUsage] = useState<any>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadData = async (uid: string) => {
    const [p, s, a, pr, act] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("subscriptions").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("ai_usage").select("*").eq("user_id", uid).order("month", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("projects").select("id,title,status,progress_percent").eq("user_id", uid).order("updated_at", { ascending: false }),
      supabase.from("activity_log").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(6),
    ]);
    setProfile(p.data);
    setSubscription(s.data);
    setAiUsage(a.data);
    setProjects(pr.data || []);
    setActivity(act.data || []);
    if (p.data?.department) setSelectedDepartment(p.data.department);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUser(user);
      await loadData(user.id);
    };
    init();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleSaveTopic = async (topic: typeof mockTopics[number]) => {
    if (!user) return;
    const existing = projects.find((p) => p.title === topic.title);
    if (existing) {
      toast({ title: "Already saved", description: "This project is already in your list." });
      return;
    }
    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title: topic.title,
        description: topic.description,
        department: selectedDepartment,
        topic_type: "new",
        status: "planning",
        progress: {},
        progress_percent: 0,
      })
      .select("id,title,status,progress_percent")
      .single();
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setProjects((prev) => [data as ProjectRow, ...prev]);
    await supabase.from("activity_log").insert({
      user_id: user.id,
      action: "project_saved",
      description: `Saved "${topic.title}"`,
      entity_type: "project",
      entity_id: data.id,
    });
    loadData(user.id);
    toast({ title: "Topic saved!", description: "Added to My Projects." });
  };

  const filteredTopics = mockTopics.filter((t) => {
    const s = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));
    return s && (difficultyFilter === "all" || t.difficulty === difficultyFilter);
  });

  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student";
  const tier = subscription?.tier || "free";
  const tierInfo = tierMeta[tier] || tierMeta.free;
  const TierIcon = tierInfo.icon;
  const creditsUsed = aiUsage?.credits_used ?? 0;
  const creditsLimit = aiUsage?.credits_limit ?? 10;
  const creditsPct = Math.min(100, Math.round((creditsUsed / Math.max(1, creditsLimit)) * 100));
  const activeProjects = projects.filter((p) => p.status !== "completed").length;
  const avgProgress = projects.length
    ? Math.round(projects.reduce((s, p) => s + (p.progress_percent || 0), 0) / projects.length)
    : 0;
  const profileComplete = !!(profile?.university && profile?.department && profile?.academic_level);

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
              <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 text-accent font-medium">
                <LayoutDashboard className="w-5 h-5" /> Dashboard
              </Link>
              <Link to="/my-projects" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <FileText className="w-5 h-5" /> My Projects
                {projects.length > 0 && <Badge variant="secondary" className="ml-auto">{projects.length}</Badge>}
              </Link>
              <Link to="/modify-project" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <Sparkles className="w-5 h-5" /> Modify Project
              </Link>
              <Link to="/profile" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <UserIcon className="w-5 h-5" /> Profile
              </Link>
              <Link to="/pricing" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <CreditCard className="w-5 h-5" /> Subscription
              </Link>
            </nav>

            <div className="p-4 border-t border-border">
              <div className="p-4 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <TierIcon className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium">{tierInfo.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {tier === "free" ? "Upgrade for advanced AI tools" : "Thanks for supporting jmk!"}
                </p>
                {tier === "free" && (
                  <Button variant="accent" size="sm" className="w-full" asChild>
                    <Link to="/pricing">Upgrade Now</Link>
                  </Button>
                )}
              </div>
            </div>

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
        <div className="p-6 lg:p-8 space-y-8">
          {/* Header */}
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-2"
            >
              Welcome back, {userName} 👋
            </motion.h1>
            <p className="text-muted-foreground">
              Here's an overview of your academic journey and project progress.
            </p>
          </div>

          {/* Profile completion banner */}
          {!profileComplete && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between gap-4 rounded-xl border border-accent/30 bg-accent/5 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Complete your academic profile</p>
                  <p className="text-sm text-muted-foreground">Add your university, department and level for tailored recommendations.</p>
                </div>
              </div>
              <Button variant="accent" size="sm" asChild>
                <Link to="/profile">Complete Profile <ChevronRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </motion.div>
          )}

          {/* Top grid: student info + stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student card */}
            <div className="lg:col-span-1 bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-foreground truncate">{userName}</h3>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
              <dl className="space-y-3 text-sm">
                <InfoRow label="University" value={profile?.university} />
                <InfoRow label="Faculty" value={profile?.faculty} />
                <InfoRow label="Department" value={profile?.department} />
                <InfoRow label="Course" value={profile?.course} />
                <InfoRow label="Level" value={profile?.academic_level} />
                <InfoRow label="Graduation" value={profile?.graduation_year} />
              </dl>
              <Button variant="outline" size="sm" className="w-full mt-6" asChild>
                <Link to="/profile">Edit Profile</Link>
              </Button>
            </div>

            {/* Stats grid */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                icon={<FolderOpen className="w-5 h-5 text-accent" />}
                label="Active Projects"
                value={activeProjects}
                sub={`${projects.length} total`}
              />
              <StatCard
                icon={<TrendingUp className="w-5 h-5 text-accent" />}
                label="Avg. Completion"
                value={`${avgProgress}%`}
                sub="Across all projects"
                bar={avgProgress}
              />
              <StatCard
                icon={<TierIcon className="w-5 h-5 text-accent" />}
                label="Subscription"
                value={tierInfo.label}
                sub={subscription?.expires_at ? `Renews ${new Date(subscription.expires_at).toLocaleDateString()}` : "Active"}
                action={tier === "free" ? { label: "Upgrade", to: "/pricing" } : undefined}
              />
              <StatCard
                icon={<Zap className="w-5 h-5 text-accent" />}
                label="AI Credits"
                value={`${creditsUsed} / ${creditsLimit}`}
                sub={`${creditsLimit - creditsUsed} remaining this month`}
                bar={creditsPct}
              />
            </div>
          </div>

          {/* Projects + Activity row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-accent" /> Active Projects
                </h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/my-projects">View all <ChevronRight className="w-4 h-4 ml-1" /></Link>
                </Button>
              </div>
              {projects.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  No projects yet — save a topic below to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.slice(0, 4).map((p) => (
                    <Link
                      key={p.id}
                      to="/my-projects"
                      className="block p-4 rounded-xl border border-border hover:border-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="font-medium text-foreground line-clamp-1">{p.title}</p>
                        <Badge variant={p.status === "completed" ? "default" : p.status === "in_progress" ? "secondary" : "outline"}>
                          {p.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <Progress value={p.progress_percent} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-2">{p.progress_percent}% complete</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-accent" /> Recent Activity
              </h2>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No activity yet.</p>
              ) : (
                <ul className="space-y-4">
                  {activity.map((a) => (
                    <li key={a.id} className="flex gap-3">
                      <div className="w-2 h-2 mt-2 rounded-full bg-accent shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">{a.description || a.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Topic explorer */}
          <div>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-4">
              Explore Project Topics
            </h2>
            <div className="bg-card rounded-2xl border border-border p-6 mb-6">
              <label className="text-sm font-medium text-foreground mb-2 block">Department</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-full md:w-96">
                  <SelectValue placeholder="Choose a department..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedDepartment && (
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search topics by keyword..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulties</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedDepartment ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTopics.map((topic, i) => {
                  const saved = projects.some((p) => p.title === topic.title);
                  return (
                    <motion.div
                      key={topic.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-card rounded-xl border border-border p-6 card-hover"
                    >
                      <Badge variant={topic.difficulty === "easy" ? "secondary" : topic.difficulty === "medium" ? "default" : "destructive"} className="mb-3">
                        {topic.difficulty.charAt(0).toUpperCase() + topic.difficulty.slice(1)}
                      </Badge>
                      <h3 className="text-lg font-heading font-semibold text-foreground mb-2 line-clamp-2">{topic.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{topic.description}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {topic.keywords.slice(0, 3).map((k, j) => (
                          <span key={j} className="px-2 py-1 rounded-full bg-muted text-xs text-muted-foreground">{k}</span>
                        ))}
                      </div>
                      <Button
                        variant={saved ? "accent" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => handleSaveTopic(topic)}
                        disabled={saved}
                      >
                        <BookmarkPlus className="w-4 h-4 mr-2" />
                        {saved ? "Saved" : "Save to My Projects"}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-heading font-semibold text-foreground mb-2">Pick a Department</h3>
                <p className="text-muted-foreground max-w-md mx-auto">Choose a department above to explore project topics curated for that field.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="flex justify-between gap-3">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="text-foreground font-medium text-right truncate">{value || "—"}</dd>
  </div>
);

const StatCard = ({
  icon, label, value, sub, bar, action,
}: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; bar?: number;
  action?: { label: string; to: string };
}) => (
  <div className="bg-card rounded-2xl border border-border p-5">
    <div className="flex items-center justify-between mb-3">
      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">{icon}</div>
      {action && (
        <Button variant="ghost" size="sm" asChild>
          <Link to={action.to}>{action.label}</Link>
        </Button>
      )}
    </div>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="text-2xl font-heading font-bold text-foreground mt-1">{value}</p>
    {typeof bar === "number" && <Progress value={bar} className="h-2 mt-3" />}
    {sub && <p className="text-xs text-muted-foreground mt-2">{sub}</p>}
  </div>
);

export default Dashboard;

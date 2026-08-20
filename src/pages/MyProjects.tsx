import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  GraduationCap, 
  LogOut, 
  LayoutDashboard,
  FileText,
  CreditCard,
  Sparkles,
  Upload,
  Trash2,
  ChevronRight,
  CheckCircle2,
  Circle,
  Menu,
  X,
  FolderOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { signOutAndRedirect } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const progressStages = [
  { id: "proposal", label: "Proposal", weight: 15 },
  { id: "literature", label: "Literature Review", weight: 20 },
  { id: "methodology", label: "Methodology", weight: 20 },
  { id: "implementation", label: "Implementation", weight: 25 },
  { id: "testing", label: "Testing & Results", weight: 10 },
  { id: "documentation", label: "Documentation", weight: 10 },
];

const mockSavedProjects = [
  {
    id: "1",
    title: "Impact of Artificial Intelligence on Nigerian Banking Sector",
    department: "Computer Science",
    status: "in_progress",
    progress: { proposal: true, literature: true, methodology: false, implementation: false, testing: false, documentation: false },
    notes: "Started with the proposal draft. Supervisor approved the topic.",
  },
  {
    id: "2",
    title: "Mobile Learning Application for Rural Education",
    department: "Computer Science",
    status: "planning",
    progress: { proposal: false, literature: false, methodology: false, implementation: false, testing: false, documentation: false },
    notes: "",
  },
];

const MyProjects = () => {
  const [user, setUser] = useState<unknown>(null);
  const [projects, setProjects] = useState(mockSavedProjects);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUser(user);
    };
    getUser();
  }, [navigate]);

  const handleLogout = async () => {
    await signOutAndRedirect("/");
  };

  const calculateProgress = (progress: Record<string, boolean>) => {
    let total = 0;
    progressStages.forEach(stage => {
      if (progress[stage.id]) total += stage.weight;
    });
    return total;
  };

  const updateProjectProgress = (projectId: string, stageId: string, checked: boolean) => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          progress: { ...p.progress, [stageId]: checked }
        };
      }
      return p;
    }));
    toast({
      title: checked ? "Stage completed!" : "Stage unchecked",
      description: checked ? "Great progress! Keep going!" : "You can always come back to this.",
    });
  };

  const updateProjectStatus = (projectId: string, status: string) => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        return { ...p, status };
      }
      return p;
    }));
  };

  const updateProjectNotes = (projectId: string, notes: string) => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        return { ...p, notes };
      }
      return p;
    }));
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student";
  const activeProject = projects.find(p => p.id === selectedProject);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar Toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-lg border border-border shadow-soft"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 1024) && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="fixed lg:static inset-y-0 left-0 z-40 w-64 bg-card border-r border-border flex flex-col"
          >
            {/* Logo */}
            <div className="p-6 border-b border-border">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow">
                  <GraduationCap className="w-6 h-6 text-accent-foreground" />
                </div>
                <span className="text-xl font-heading font-bold text-primary">jmk</span>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              <Link
                to="/dashboard"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </Link>
              <Link
                to="/my-projects"
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 text-accent font-medium"
              >
                <FileText className="w-5 h-5" />
                My Projects
                <Badge variant="secondary" className="ml-auto">
                  {projects.length}
                </Badge>
              </Link>
              <Link
                to="/modify-project"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Sparkles className="w-5 h-5" />
                Modify Project
              </Link>
              <Link
                to="/profile"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <GraduationCap className="w-5 h-5" />
                Profile
              </Link>
              <Link
                to="/pricing"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <CreditCard className="w-5 h-5" />
                Subscription
              </Link>
            </nav>

            {/* Subscription Status */}
            <div className="p-4 border-t border-border">
              <div className="p-4 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium">Free Plan</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Upgrade for advanced AI tools
                </p>
                <Button variant="accent" size="sm" className="w-full" asChild>
                  <Link to="/pricing">Upgrade Now</Link>
                </Button>
              </div>
            </div>

            {/* User & Logout */}
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
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-2"
              >
                My Projects
              </motion.h1>
              <p className="text-muted-foreground">
                Track your saved projects and monitor your progress.
              </p>
            </div>
            <Button variant="accent" asChild>
              <Link to="/projects/new"><Sparkles className="w-4 h-4 mr-2" />Create New Project</Link>
            </Button>
          </div>

          {projects.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Projects List */}
              <div className="lg:col-span-1 space-y-4">
                {projects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedProject === project.id
                        ? "bg-accent/10 border-accent"
                        : "bg-card border-border hover:border-accent/50"
                    }`}
                    onClick={() => setSelectedProject(project.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge
                        variant={
                          project.status === "completed" ? "default" :
                          project.status === "in_progress" ? "secondary" : "outline"
                        }
                      >
                        {project.status === "in_progress" ? "In Progress" :
                         project.status === "completed" ? "Completed" : "Planning"}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground line-clamp-2 mb-2">
                      {project.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      {project.department}
                    </p>
                    <Progress value={calculateProgress(project.progress)} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {calculateProgress(project.progress)}% complete
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Project Details */}
              <div className="lg:col-span-2">
                {activeProject ? (
                  <motion.div
                    key={activeProject.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-card rounded-2xl border border-border p-6"
                  >
                    {/* Project Header */}
                    <div className="mb-6">
                      <h2 className="text-xl font-heading font-bold text-foreground mb-2">
                        {activeProject.title}
                      </h2>
                      <p className="text-sm text-muted-foreground">{activeProject.department}</p>
                    </div>

                    {/* Status Select */}
                    <div className="mb-6">
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Project Status
                      </label>
                      <Select
                        value={activeProject.status}
                        onValueChange={(value) => updateProjectStatus(activeProject.id, value)}
                      >
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planning">Planning</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Progress Checklist */}
                    <div className="mb-6">
                      <label className="text-sm font-medium text-foreground mb-4 block">
                        Progress Checklist
                      </label>
                      <div className="space-y-3">
                        {progressStages.map((stage) => (
                          <div
                            key={stage.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                          >
                            <Checkbox
                              id={stage.id}
                              checked={activeProject.progress[stage.id as keyof typeof activeProject.progress]}
                              onCheckedChange={(checked) => 
                                updateProjectProgress(activeProject.id, stage.id, checked as boolean)
                              }
                            />
                            <label
                              htmlFor={stage.id}
                              className="flex-1 text-sm font-medium cursor-pointer"
                            >
                              {stage.label}
                            </label>
                            <span className="text-xs text-muted-foreground">
                              {stage.weight}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="mb-6">
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Notes
                      </label>
                      <Textarea
                        placeholder="Add notes about your project progress, supervisor feedback, etc."
                        value={activeProject.notes}
                        onChange={(e) => updateProjectNotes(activeProject.id, e.target.value)}
                        rows={4}
                      />
                    </div>

                    {/* File Upload */}
                    <div className="mb-6">
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Attachments
                      </label>
                      <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                        <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Drag and drop files here, or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, DOCX, DOC up to 10MB
                        </p>
                        <input
                          id={`attach-${activeProject.id}`}
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) toast({ title: "File attached", description: `${f.name} added to this project.` });
                          }}
                        />
                        <Button variant="outline" size="sm" className="mt-4" asChild>
                          <label htmlFor={`attach-${activeProject.id}`} className="cursor-pointer">Choose Files</label>
                        </Button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <Button
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          setProjects(projects.filter((p) => p.id !== activeProject.id));
                          setSelectedProject(null);
                          toast({ title: "Project removed", description: "The project has been removed from your list." });
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove Project
                      </Button>
                      <Button variant="accent" onClick={() => navigate("/modify-project")}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Get AI Help
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-card rounded-2xl border border-border p-12 text-center">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-heading font-semibold text-foreground mb-2">
                      Select a Project
                    </h3>
                    <p className="text-muted-foreground">
                      Click on a project from the list to view details and track progress.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-heading font-semibold text-foreground mb-2">
                No Projects Yet
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Start by browsing topics in your dashboard and saving ones you like.
              </p>
              <Button variant="accent" asChild>
                <Link to="/dashboard">Browse Topics</Link>
              </Button>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MyProjects;

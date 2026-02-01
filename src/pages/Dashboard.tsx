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
import { 
  GraduationCap, 
  Search, 
  BookmarkPlus, 
  LogOut, 
  FolderOpen,
  Crown,
  Sparkles,
  Filter,
  ChevronDown,
  Home,
  LayoutDashboard,
  FileText,
  CreditCard,
  Settings,
  Menu,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Nigerian university departments
const departments = [
  "Computer Science",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Civil Engineering",
  "Business Administration",
  "Accounting",
  "Economics",
  "Banking & Finance",
  "Mass Communication",
  "Law",
  "Microbiology",
  "Biochemistry",
  "Pharmacy",
  "Medicine & Surgery",
  "Nursing",
  "Public Administration",
  "Political Science",
  "Sociology",
  "Psychology",
  "Education",
];

// Mock topics data (will be replaced with Supabase data)
const mockTopics = [
  {
    id: "1",
    title: "Impact of Artificial Intelligence on Nigerian Banking Sector",
    description: "Explore how AI is transforming banking operations, customer service, and fraud detection in Nigerian banks.",
    difficulty: "medium",
    keywords: ["AI", "Banking", "FinTech", "Nigeria"],
  },
  {
    id: "2",
    title: "Blockchain Technology for Land Registry Management",
    description: "Design a decentralized land registry system to reduce fraud and improve transparency in property ownership.",
    difficulty: "hard",
    keywords: ["Blockchain", "Land Registry", "Smart Contracts"],
  },
  {
    id: "3",
    title: "Mobile Learning Application for Rural Education",
    description: "Develop a mobile app that works offline to deliver educational content to rural Nigerian students.",
    difficulty: "easy",
    keywords: ["Mobile App", "Education", "Rural", "Offline"],
  },
  {
    id: "4",
    title: "E-Commerce Platform for Agricultural Products",
    description: "Build a platform connecting farmers directly with consumers, eliminating middlemen and improving farmer income.",
    difficulty: "medium",
    keywords: ["E-Commerce", "Agriculture", "Farmers", "Marketplace"],
  },
  {
    id: "5",
    title: "Smart Traffic Management System Using IoT",
    description: "Design an IoT-based traffic monitoring and management system to reduce congestion in Nigerian cities.",
    difficulty: "hard",
    keywords: ["IoT", "Traffic", "Smart City", "Sensors"],
  },
  {
    id: "6",
    title: "Healthcare Appointment Scheduling System",
    description: "Create a web application for scheduling hospital appointments and managing patient queues efficiently.",
    difficulty: "easy",
    keywords: ["Healthcare", "Scheduling", "Web App", "Hospital"],
  },
];

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [savedTopics, setSavedTopics] = useState<string[]>([]);
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
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleSaveTopic = (topicId: string) => {
    if (savedTopics.includes(topicId)) {
      setSavedTopics(savedTopics.filter(id => id !== topicId));
      toast({
        title: "Topic removed",
        description: "The topic has been removed from your saved projects.",
      });
    } else {
      setSavedTopics([...savedTopics, topicId]);
      toast({
        title: "Topic saved!",
        description: "The topic has been added to your projects.",
      });
    }
  };

  const filteredTopics = mockTopics.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDifficulty = difficultyFilter === "all" || topic.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student";

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
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 text-accent font-medium"
              >
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </Link>
              <Link
                to="/my-projects"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <FileText className="w-5 h-5" />
                My Projects
                {savedTopics.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {savedTopics.length}
                  </Badge>
                )}
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
          {/* Welcome Header */}
          <div className="mb-8">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-2"
            >
              Welcome to jmk, {userName}! 👋
            </motion.h1>
            <p className="text-muted-foreground">
              Select your department and explore project topics tailored for you.
            </p>
          </div>

          {/* Department Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl border border-border p-6 mb-8"
          >
            <h2 className="text-lg font-heading font-semibold text-foreground mb-4">
              Select Your Department
            </h2>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full md:w-96">
                <SelectValue placeholder="Choose your department/course..." />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          {/* Search & Filters */}
          {selectedDepartment && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row gap-4 mb-6"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search topics by keyword..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
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
            </motion.div>
          )}

          {/* Topics Grid */}
          {selectedDepartment ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTopics.map((topic, index) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-xl border border-border p-6 card-hover"
                >
                  {/* Difficulty Badge */}
                  <Badge
                    variant={
                      topic.difficulty === "easy" ? "secondary" :
                      topic.difficulty === "medium" ? "default" : "destructive"
                    }
                    className="mb-3"
                  >
                    {topic.difficulty.charAt(0).toUpperCase() + topic.difficulty.slice(1)}
                  </Badge>

                  {/* Title */}
                  <h3 className="text-lg font-heading font-semibold text-foreground mb-2 line-clamp-2">
                    {topic.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {topic.description}
                  </p>

                  {/* Keywords */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {topic.keywords.slice(0, 3).map((keyword, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded-full bg-muted text-xs text-muted-foreground"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>

                  {/* Save Button */}
                  <Button
                    variant={savedTopics.includes(topic.id) ? "accent" : "outline"}
                    size="sm"
                    className="w-full"
                    onClick={() => handleSaveTopic(topic.id)}
                  >
                    <BookmarkPlus className="w-4 h-4 mr-2" />
                    {savedTopics.includes(topic.id) ? "Saved" : "Save to My Projects"}
                  </Button>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-heading font-semibold text-foreground mb-2">
                Select a Department
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Choose your department above to see relevant project topics curated for your course.
              </p>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

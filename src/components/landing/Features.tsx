import { motion } from "framer-motion";
import { 
  GraduationCap, 
  BookOpen, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  Upload,
  Brain,
  Download
} from "lucide-react";

const features = [
  {
    icon: GraduationCap,
    title: "Department-Specific Topics",
    description: "Browse project topics tailored to your exact department and course. Computer Science, Engineering, Business, Law, and 50+ more.",
  },
  {
    icon: BookOpen,
    title: "Save & Track Projects",
    description: "Save your favorite topics, track progress with checklists (Proposal, Lit Review, Methodology), and upload guidelines.",
  },
  {
    icon: Sparkles,
    title: "AI Research Assistant",
    description: "Get detailed outlines, source suggestions, citation help, and viva prep questions powered by advanced AI.",
  },
  {
    icon: FileText,
    title: "Full Chapter Generation",
    description: "Premium users get complete chapter drafts, abstracts, code snippets, and diagrams formatted for submission.",
  },
  {
    icon: Upload,
    title: "Modify Old Projects",
    description: "Upload your existing project and get a refreshed, modified version. Perfect for updates or rework.",
  },
  {
    icon: Download,
    title: "Export to PDF/Word",
    description: "Download your generated content in professional PDF or Word format, ready for submission.",
  },
  {
    icon: Brain,
    title: "Smart Suggestions",
    description: "AI analyzes your topic and provides related research directions, methodology recommendations, and scope advice.",
  },
  {
    icon: CheckCircle2,
    title: "Progress Dashboard",
    description: "Visual progress tracking keeps you on schedule. See what's done and what needs attention at a glance.",
  },
];

export function Features() {
  return (
    <section id="features" className="section-padding bg-background">
      <div className="container-main">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4"
          >
            Features
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-foreground mb-6"
          >
            Everything You Need to Excel
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground"
          >
            From finding the perfect topic to generating polished drafts, jmk provides 
            all the tools Nigerian students need for a successful final year project.
          </motion.p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="group p-6 rounded-2xl bg-card border border-border card-hover"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center mb-4 group-hover:shadow-glow transition-shadow duration-300">
                <feature.icon className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

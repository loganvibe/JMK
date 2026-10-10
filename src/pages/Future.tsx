import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowLeft, Sparkles, Rocket, Clock, Bell, Lightbulb, BarChart3, Database, Globe, Share2 } from "lucide-react";
import { motion } from "framer-motion";

const upcomingFeatures = [
  {
    icon: BarChart3,
    title: "Data Visualization Suite",
    description: "Generate charts, graphs, and interactive visualizations directly from your project data.",
    status: "Planned",
  },
  {
    icon: Database,
    title: "Citation Library Sync",
    description: "Sync your references with Zotero, Mendeley, and Google Scholar for seamless citation management.",
    status: "In Development",
  },
  {
    icon: Globe,
    title: "Multi-Language Support",
    description: "Localized versions for Nigerian languages and international students worldwide.",
    status: "Planned",
  },
  {
    icon: Share2,
    title: "Collaborative Workspace",
    description: "Invite teammates, share drafts, and collect feedback in real-time on your projects.",
    status: "Planned",
  },
  {
    icon: Lightbulb,
    title: "AI Topic Exploration",
    description: "Explore interconnected research topics and discover related work using AI-powered suggestions.",
    status: "Planned",
  },
];

const Future = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to home
          </Button>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-accent grid place-items-center">
            <Rocket className="w-5 h-5 text-accent-foreground" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Future Features</h1>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-foreground/90 mb-8">
          <p className="text-sm text-muted-foreground">
            Last updated: October 2026
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">What's Coming</h2>
            <p>
              jmk is continuously evolving. Here's a look at the features we're actively
              building and planning. Have ideas? <Link to="/support" className="text-accent hover:underline">Let us know</Link>.
            </p>
          </section>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {upcomingFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-2xl border border-border p-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {feature.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 bg-accent/10 rounded-2xl border border-accent/20 p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-accent" />
            <h3 className="font-heading font-semibold text-foreground">Stay Updated</h3>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            These features are in development. We'll notify users via email and in-app
            when they launch. Got a feature request? Contact us at support@jmk.life.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Future;

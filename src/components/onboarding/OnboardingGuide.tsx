import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type OnboardingInput = {
  hasProfile: boolean;
  hasSchool: boolean;
  hasProject: boolean;
  hasTopicContent: boolean;
  usedAI: boolean;
};

const OnboardingGuide = ({
  state,
  onDismiss,
}: {
  state: OnboardingInput;
  onDismiss?: () => void;
}) => {
  const steps = [
    {
      title: "Complete your student profile",
      hint: "Your name and academic level help the AI match your school's expectations.",
      done: state.hasProfile,
      to: "/profile",
      cta: "Open profile",
    },
    {
      title: "Add your university & department",
      hint: "Unlocks department-specific methodologies and formatting rules.",
      done: state.hasSchool,
      to: "/profile",
      cta: "Add school",
    },
    {
      title: "Create your first project",
      hint: "Every chapter, citation and defense tool lives inside a project workspace.",
      done: state.hasProject,
      to: "/projects/new",
      cta: "Create project",
    },
    {
      title: "Generate your first topic",
      hint: "The AI proposes researchable topics based on your department and interests.",
      done: state.hasTopicContent,
      to: "/projects/new",
      cta: "Generate topics",
    },
    {
      title: "Try the AI writing tools",
      hint: "Draft, improve, cite and quality-check any chapter from the workspace.",
      done: state.usedAI,
      to: "/my-projects",
      cta: "Explore tools",
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  if (completed === steps.length) return null;
  const next = steps.find((s) => !s.done)!;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          <h2 className="font-heading text-base font-semibold sm:text-lg">Get started on jmk</h2>
        </div>
        <span className="text-sm text-muted-foreground">{completed} of {steps.length} done</span>
      </div>

      <Progress value={(completed / steps.length) * 100} className="mt-3 h-2" />

      <ul className="mt-4 space-y-2">
        {steps.map((s) => (
          <li
            key={s.title}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background px-3 py-2.5"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex min-w-0 items-center gap-2 text-left">
                  {s.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={`truncate text-sm ${s.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {s.title}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{s.hint}</TooltipContent>
            </Tooltip>
            {!s.done && s.title === next.title && (
              <Button asChild size="sm" className="h-8 shrink-0 gap-1">
                <Link to={s.to}>
                  {s.cta} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </li>
        ))}
      </ul>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="mt-3 text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Hide this guide
        </button>
      )}
    </section>
  );
};

export default OnboardingGuide;

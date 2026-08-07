import { useEffect, useState } from "react";
import { Cpu, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AI_MODELS, getPreferredModel, setPreferredModel } from "@/lib/aiModels";
import { supabase } from "@/integrations/supabase/client";

/** Lets the student pick which AI engine powers every generation. */
const ModelPicker = ({ compact = false }: { compact?: boolean }) => {
  const [model, setModel] = useState(getPreferredModel());

  useEffect(() => {
    const onChange = (e: Event) => setModel((e as CustomEvent).detail as string);
    window.addEventListener("jmk:model-changed", onChange);
    return () => window.removeEventListener("jmk:model-changed", onChange);
  }, []);

  const select = async (id: string) => {
    setPreferredModel(id);
    setModel(id);
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      await supabase.from("profiles").update({ preferred_model: id } as any).eq("id", data.user.id);
    }
  };

  const current = AI_MODELS.find((m) => m.id === model) ?? AI_MODELS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Cpu className="w-4 h-4 text-accent" />
          <span className={compact ? "hidden sm:inline" : ""}>{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-popover">
        <DropdownMenuLabel>AI engine</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {AI_MODELS.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onClick={() => select(m.id)}
            className="flex flex-col items-start gap-1 py-2.5 cursor-pointer"
          >
            <div className="flex items-center gap-2 w-full">
              <span className="font-medium text-foreground">{m.label}</span>
              <Badge variant="outline" className="text-[10px]">{m.vendor}</Badge>
              {m.tier === "pro" && <Badge className="text-[10px]">Pro</Badge>}
              {m.id === model && <Check className="w-4 h-4 ml-auto text-success" />}
            </div>
            <span className="text-xs text-muted-foreground">{m.blurb}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ModelPicker;

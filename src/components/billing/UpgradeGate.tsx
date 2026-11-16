import { Link } from "react-router-dom";
import { Lock, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURE_LABEL, formatNaira, type FeatureKey } from "@/hooks/useEntitlements";

export function UpgradeGate({
  feature,
  compact = false,
  message,
  amount = 1500,
}: {
  feature: FeatureKey;
  compact?: boolean;
  message?: string;
  amount?: number;
}) {
  const text = message ?? `To use ${FEATURE_LABEL[feature]}, contribute ${formatNaira(amount)} for 7 days of access.`;

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
        <p className="text-sm text-muted-foreground"><Lock className="inline w-4 h-4 mr-1 text-accent" />{text}</p>
        <Button size="sm" variant="accent" asChild><Link to="/billing">Contribute</Link></Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center">
      <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4"><HeartHandshake className="w-7 h-7 text-accent" /></div>
      <h3 className="text-xl font-heading font-bold text-foreground mb-2">Support JMK to use AI features</h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-2">{text}</p>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">Your saved projects and previous work remain available. Contributions support JMK’s continued development.</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="accent" asChild><Link to="/billing">Contribute {formatNaira(amount)} &amp; Get Access</Link></Button>
        <Button variant="outline" asChild><Link to="/pricing">Learn more</Link></Button>
      </div>
    </div>
  );
}

export default UpgradeGate;

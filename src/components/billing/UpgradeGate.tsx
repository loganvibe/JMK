import { Link } from "react-router-dom";
import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURE_LABEL, type FeatureKey } from "@/hooks/useEntitlements";

export function UpgradeGate({
  feature,
  planName,
  compact = false,
}: {
  feature: FeatureKey;
  planName?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
        <p className="text-sm text-muted-foreground">
          <Lock className="inline w-4 h-4 mr-1 text-accent" />
          {FEATURE_LABEL[feature]} requires an upgrade.
        </p>
        <Button size="sm" variant="accent" asChild>
          <Link to="/pricing">Upgrade</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center">
      <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
        <Crown className="w-7 h-7 text-accent" />
      </div>
      <h3 className="text-xl font-heading font-bold text-foreground mb-2">
        {FEATURE_LABEL[feature]} is a paid feature
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">
        {planName ? `Your ${planName} does not include this.` : "Your current plan does not include this."}{" "}
        Upgrade to unlock it and get more monthly AI credits.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="accent" asChild>
          <Link to="/pricing">View plans</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/billing">Manage billing</Link>
        </Button>
      </div>
    </div>
  );
}

export default UpgradeGate;

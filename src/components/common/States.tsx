import { ReactNode } from "react";
import { Loader2, AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const LoadingState = ({ label = "Loading…" }: { label?: string }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
    <p className="text-sm">{label}</p>
  </div>
);

export const SkeletonList = ({ rows = 3 }: { rows?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-20 w-full rounded-xl" />
    ))}
  </div>
);

export const ErrorState = ({
  message,
  onRetry,
  retryLabel = "Try again",
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-8 text-center">
    <AlertTriangle className="h-6 w-6 text-destructive" />
    <p className="max-w-md text-sm text-foreground">{message}</p>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" /> {retryLabel}
      </Button>
    )}
  </div>
);

export const EmptyState = ({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
    <div className="text-muted-foreground">{icon ?? <Inbox className="h-6 w-6" />}</div>
    <div>
      <p className="font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
    </div>
    {action}
  </div>
);

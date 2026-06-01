import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  indeterminate?: boolean;
}

export function Progress({
  className,
  value = 0,
  max = 100,
  indeterminate = false,
  ...props
}: ProgressProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={indeterminate ? undefined : max}
      aria-valuenow={indeterminate ? undefined : value}
      aria-busy={indeterminate || undefined}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      {indeterminate ? (
        <div className="absolute inset-y-0 w-1/3 animate-pulse rounded-full bg-primary" />
      ) : (
        <div
          className="h-full bg-primary transition-all duration-300 ease-in-out"
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}

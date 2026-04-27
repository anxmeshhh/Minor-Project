import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface VitalCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  alert?: boolean;
  icon?: ReactNode;
  hint?: string;
  className?: string;
}

export function VitalCard({ label, value, unit, alert, icon, hint, className }: VitalCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border bg-panel p-5 shadow-card transition-colors",
        alert ? "border-critical/70 shadow-glow-critical" : "border-border",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        {icon && <span className={cn("opacity-70", alert && "text-critical opacity-100")}>{icon}</span>}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={cn("font-mono-tabular text-4xl font-semibold", alert && "text-critical")}>
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

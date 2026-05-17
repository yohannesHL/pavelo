import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & {
    variant?: "default" | "accent" | "gold" | "outline";
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default:
      "bg-[var(--color-primary)] text-white",
    accent:
      "bg-[var(--color-accent)] text-white",
    gold:
      "bg-[var(--color-gold)] text-white",
    outline:
      "border border-[var(--border)] text-[var(--foreground)]",
  };

  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-[var(--radius-badge)] px-2.5 py-0.5 text-xs font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Badge };

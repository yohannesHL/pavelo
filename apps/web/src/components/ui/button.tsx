import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-[var(--motion-ui)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-primary)] text-white shadow-sm hover:bg-[var(--color-primary-light)]",
        accent:
          "bg-[var(--color-accent)] text-white shadow-sm hover:bg-[var(--color-accent-light)]",
        outline:
          "border border-[var(--border)] bg-transparent hover:bg-[var(--muted)]",
        ghost: "hover:bg-[var(--muted)]",
        destructive:
          "bg-[var(--color-error)] text-white shadow-sm hover:bg-red-600",
      },
      size: {
        default: "h-10 px-4 py-2 rounded-[var(--radius-input)]",
        sm: "h-8 px-3 text-xs rounded-[var(--radius-badge)]",
        lg: "h-12 px-6 text-base rounded-[var(--radius-input)]",
        icon: "h-10 w-10 rounded-[var(--radius-input)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const badgeVariants = {
  success: "text-[var(--brand-green-dark)] bg-[rgba(90,175,34,0.12)]",
  warning: "text-amber-700 bg-[rgba(246,210,81,0.25)]",
  danger:  "text-rose-700 bg-[rgba(244,63,94,0.1)]",
  info:    "text-[var(--muted)] bg-[rgba(74,112,64,0.08)]",
};

type Props = HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof badgeVariants;
};

export function Badge({ className, variant = "info", ...props }: Props) {
  return (
    <span
      className={cn(
        "nm-badge inline-flex items-center px-3 py-1 text-xs font-semibold tracking-wide",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}

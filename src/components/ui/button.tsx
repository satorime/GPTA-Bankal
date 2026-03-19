import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const variants = {
  default: "nm-btn-primary text-white px-5 py-2.5 font-semibold",
  outline: "nm-btn text-[var(--brand-green-dark)] font-medium px-5 py-2.5",
  ghost:
    "text-[var(--brand-green-dark)] font-medium px-3 py-2 rounded-xl transition-all duration-200 hover:bg-[rgba(90,175,34,0.08)] active:bg-[rgba(90,175,34,0.15)]",
  destructive: "nm-btn text-white px-5 py-2.5 font-semibold !bg-rose-500 hover:!bg-rose-600",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  loading?: boolean;
};

export function Button({
  className,
  variant = "default",
  loading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center text-sm transition-all duration-300 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-green)]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
        variants[variant],
        className
      )}
      disabled={disabled ?? loading}
      {...props}
    >
      {loading ? "Processing…" : children}
    </button>
  );
}

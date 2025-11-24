import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const variants = {
  default:
    "bg-[var(--brand-green)] text-white hover:bg-[var(--brand-green-dark)] focus-visible:outline-[var(--brand-green)]",
  outline:
    "border border-lime-300 text-[var(--brand-green-dark)] hover:bg-lime-50 focus-visible:outline-[var(--brand-green)]",
  ghost: "text-[var(--brand-green-dark)] hover:bg-lime-100/60",
  destructive:
    "bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-600",
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
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60",
        variants[variant],
        className
      )}
      disabled={disabled ?? loading}
      {...props}
    >
      {loading ? "Processing..." : children}
    </button>
  );
}





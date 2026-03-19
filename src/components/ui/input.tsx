import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        "nm-input w-full px-4 py-2.5 text-sm text-[var(--foreground)]",
        className
      )}
      {...props}
    />
  );
});

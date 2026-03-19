import { forwardRef, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        "nm-input w-full px-4 py-2.5 text-sm text-[var(--foreground)] cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});

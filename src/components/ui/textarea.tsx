import { forwardRef, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "nm-input w-full px-4 py-2.5 text-sm text-[var(--foreground)] resize-none",
          className
        )}
        {...props}
      />
    );
  }
);

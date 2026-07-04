import { forwardRef } from "react";
import { cn } from "@/lib/cn";

/** Multiline text input primitive. */
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-lg border border-input bg-surface-raised px-4 py-3 text-base text-ink",
      "transition-[border-color,box-shadow] duration-150",
      "placeholder:text-ink-muted/60",
      "focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/25",
      className,
    )}
    rows={2}
    {...props}
  />
));
Textarea.displayName = "Textarea";

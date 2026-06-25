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
      "w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2.5 text-base text-ink",
      "placeholder:text-ink-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
      className,
    )}
    rows={2}
    {...props}
  />
));
Textarea.displayName = "Textarea";

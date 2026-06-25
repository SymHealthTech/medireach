import { forwardRef } from "react";
import { cn } from "@/lib/cn";

/** Text input primitive — tall, high-contrast, keyboard-friendly (spec §7.2). */
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-xl border border-line bg-surface-raised px-3.5 text-base text-ink",
        "placeholder:text-ink-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        "disabled:opacity-60",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Label = forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label ref={ref} className={cn("mb-1.5 block text-sm font-medium text-ink", className)} {...props} />
));
Label.displayName = "Label";

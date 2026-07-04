import { forwardRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Text input primitive — 48px tall (clears the 44px touch target), 8px corners,
 * neutral edge that turns teal on focus with a soft teal ring (spec input
 * styling). High-contrast text, keyboard-friendly.
 */
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-lg border border-input bg-surface-raised px-4 text-base text-ink",
        "transition-[border-color,box-shadow] duration-150",
        "placeholder:text-ink-muted/60",
        "focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/25",
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

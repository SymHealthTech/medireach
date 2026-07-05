import { forwardRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Text input primitive — 40px tall, 8px corners, neutral edge that turns teal
 * on focus with a soft teal ring (spec input styling). High-contrast text,
 * keyboard-friendly.
 */
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-input bg-surface-raised px-4 text-base text-ink",
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

/**
 * Native select styled to match Input (same height, border, focus ring). Uses a
 * custom caret so it looks consistent across browsers/themes.
 */
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full appearance-none rounded-lg border border-input bg-surface-raised px-4 pr-9 text-base text-ink",
        "bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20fill=%22none%22%20viewBox=%220%200%2024%2024%22%20stroke=%22%239ca3af%22%20stroke-width=%222%22%3E%3Cpath%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%20d=%22M19%209l-7%207-7-7%22/%3E%3C/svg%3E')]",
        "transition-[border-color,box-shadow] duration-150",
        "focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/25",
        "disabled:opacity-60",
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = "Select";

export const Label = forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label ref={ref} className={cn("mb-1.5 block text-sm font-medium text-ink", className)} {...props} />
));
Label.displayName = "Label";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Button primitive. Large touch targets and a single clear primary style per
 * the audience guidance (build-prompt design direction: doctors with little
 * tech comfort — generous targets, one primary action per screen).
 *
 * Variants:
 *   `primary`   — amber action (Confirm / Save / Send); hover darkens ~10%
 *   `brand`     — solid teal
 *   `secondary` — teal outline on transparent (spec secondary button)
 *   `ghost`     — text-only
 *   `outline`   — neutral bordered surface
 *   `danger`    — SOS red (used only for the SOS / emergency feature, §2)
 *
 * Text is 15px / 600 and every variant animates hover + active over 0.15s
 * (build-prompt: smooth hover and active states) with a subtle press-down.
 */
type Variant = "primary" | "brand" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:ring-brand disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";

const variants: Record<Variant, string> = {
  primary: "bg-action text-white hover:bg-action-hover",
  brand: "bg-brand text-brand-fg hover:bg-brand/90",
  secondary: "border border-brand bg-transparent text-brand hover:bg-brand/5",
  ghost: "bg-transparent text-ink hover:bg-line/50",
  outline: "border border-line bg-surface-raised text-ink hover:bg-line/30",
  danger: "bg-sos text-white hover:bg-sos/90",
};

// Every size clears the 44px minimum touch target (spec) except `sm`, which is
// reserved for dense secondary actions inside toolbars.
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-14 px-6 text-[15px]",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

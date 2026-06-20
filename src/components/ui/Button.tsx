import { forwardRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Button primitive. Large touch targets and a single clear primary style per
 * the audience guidance (build-prompt design direction: doctors with little
 * tech comfort — generous targets, one primary action per screen).
 *
 * Variants: `primary` (amber action color), `brand` (teal), `ghost`, `danger`
 * (SOS red — used only for the SOS feature, §2).
 */
type Variant = "primary" | "brand" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-action text-white hover:bg-action/90",
  brand: "bg-brand text-brand-fg hover:bg-brand/90",
  ghost: "bg-transparent text-ink hover:bg-line/50",
  outline: "border border-line bg-surface-raised text-ink hover:bg-line/30",
  danger: "bg-sos text-white hover:bg-sos/90",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-14 px-6 text-base",
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

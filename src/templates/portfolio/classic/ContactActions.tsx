import { MapPin, MessageCircle, Phone, UserPlus } from "lucide-react";
import { cn } from "@/lib/cn";
import type { PublicDoctor } from "@/templates/types";

// Literal class names so Tailwind can see them.
const GRID_COLS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };

export interface Action {
  label: string;
  /** Shorter label for the 4-up mobile bar. */
  short?: string;
  href: string;
  icon: typeof Phone;
  external?: boolean;
  download?: boolean;
}

export function actionsFor(d: PublicDoctor): Action[] {
  const clinic = d.clinics[0];
  const phone = d.phone ?? clinic?.phone;
  const actions: Action[] = [];
  if (phone) actions.push({ label: "Call", href: `tel:+${phone}`, icon: Phone });
  if (d.whatsapp) {
    const text = `Hello ${d.fullName}, I found your page on MediReach.`;
    actions.push({
      label: "WhatsApp",
      href: `https://wa.me/${d.whatsapp}?text=${encodeURIComponent(text)}`,
      icon: MessageCircle,
      external: true,
    });
  }
  if (clinic) actions.push({ label: "Directions", href: clinic.directionsUrl, icon: MapPin, external: true });
  actions.push({ label: "Save contact", short: "Save", href: d.vcfUrl, icon: UserPlus, download: true });
  return actions;
}

/**
 * Call · WhatsApp · Directions · Save contact. Inline under the header on
 * desktop; a sticky bottom bar on mobile (DESIGN_BRIEF.md §5.1).
 */
export function ContactActions({ doctor, variant }: { doctor: PublicDoctor; variant: "inline" | "sticky" }) {
  const actions = actionsFor(doctor);
  return (
    <nav
      aria-label="Contact"
      className={cn(
        variant === "sticky"
          ? "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur transition-transform duration-300 group-data-[hidden]/show:translate-y-full sm:hidden"
          : "hidden sm:block",
      )}
    >
      <ul className={cn("grid gap-2", GRID_COLS[actions.length], variant === "inline" && "max-w-xl")}>
        {actions.map(({ label, short, href, icon: Icon, external, download }, i) => (
          <li key={label}>
            <a
              href={href}
              {...(external ? { target: "_blank", rel: "noopener" } : {})}
              {...(download ? { download: "" } : {})}
              className={cn(
                "flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-[10px] px-2 py-2 text-xs font-semibold transition active:scale-[.98]",
                i === 0 ? "bg-ink text-paper hover:bg-ink-700" : "border border-line bg-surface text-ink hover:border-ink/40",
                variant === "inline" && "flex-row gap-2 text-sm",
              )}
            >
              <Icon aria-hidden className="h-5 w-5" strokeWidth={1.75} />
              {variant === "sticky" && short ? <span aria-label={label}>{short}</span> : label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

import { LayoutDashboard } from "lucide-react";

/**
 * Header of a doctor's website dashboard: it belongs to the doctor's own
 * website, so it shows their name, not the MediReach site navigation.
 * `actions` holds the log-out button (or the demo's link).
 */
export function DoctorDashboardHeader({ name, subtitle, badge, actions }: { name: string; subtitle?: string; badge?: string; actions: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink text-paper">
            <LayoutDashboard className="size-5" strokeWidth={1.9} />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="flex items-center gap-2">
              <span className="truncate font-semibold text-ink">{name}</span>
              {badge && <span className="rounded-full bg-marigold px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">{badge}</span>}
            </span>
            <span className="block truncate text-xs text-muted-foreground">{subtitle ?? "Website dashboard"}</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">Website by MediReach</span>
          {actions}
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Empty state (DESIGN_BRIEF.md §4): small line illustration, one sentence,
 * one primary action.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-card px-6 py-14 text-center">
      <div className="relative mb-5 flex size-20 items-center justify-center">
        <svg aria-hidden viewBox="0 0 80 80" className="absolute inset-0 size-full text-sage">
          <circle cx="40" cy="40" r="38" fill="currentColor" />
          <circle cx="40" cy="40" r="30" fill="none" stroke="var(--line)" strokeDasharray="3 5" />
        </svg>
        <Icon className="relative size-8 text-ink" strokeWidth={1.5} />
      </div>
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && (
        <Button asChild className="mt-5">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}

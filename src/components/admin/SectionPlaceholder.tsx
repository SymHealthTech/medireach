import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";

/**
 * Stand-in body for dashboard sections whose features are built in Phase 4.
 * The page itself (route, role check, nav, title) is real.
 */
export function SectionPlaceholder({
  icon,
  intro,
  emptyTitle,
  emptyDescription,
  action,
}: {
  icon: LucideIcon;
  intro: string;
  emptyTitle: string;
  emptyDescription: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-muted-foreground">{intro}</p>
      <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} action={action} />
    </div>
  );
}

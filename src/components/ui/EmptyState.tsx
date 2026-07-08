import { cn } from "@/lib/cn";

/**
 * Friendly empty state (Phase 3). Replaces the assorted bare
 * "border-dashed" paragraphs with one warm, well-spaced block: an optional
 * emoji/icon in a soft teal disc, a clear title, a muted line of guidance, and
 * an optional call to action. Uses only theme tokens, so it reads correctly in
 * both light and dark mode.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface-raised/60 px-6 py-12 text-center",
        className,
      )}
    >
      {icon != null && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-2xl text-brand">
          {icon}
        </div>
      )}
      <p className="text-base font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

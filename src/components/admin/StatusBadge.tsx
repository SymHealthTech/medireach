import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

/** Doctor status badges (DESIGN_BRIEF.md §4). */
const STYLES: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  review: { label: "In review", className: "bg-marigold/20 text-ink dark:text-marigold" },
  published: { label: "Published", className: "bg-leaf/15 text-leaf-text" },
  suspended: { label: "Suspended", className: "bg-clay/15 text-clay-text" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = STYLES[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", s.className, className)}>
      {s.label}
    </span>
  );
}

export function FoundingBadge({ number }: { number?: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-marigold px-2 py-0.5 text-xs font-semibold text-white"
      title="Founding customer"
    >
      <Star className="size-3 fill-current" />
      {number ? `#${number}` : "Founding"}
    </span>
  );
}

/** Generic coloured pill for other statuses (leads, update requests, templates). */
export function Pill({ tone = "muted", children }: { tone?: "muted" | "leaf" | "marigold" | "clay" | "ink"; children: React.ReactNode }) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    leaf: "bg-leaf/15 text-leaf-text",
    marigold: "bg-marigold/20 text-ink dark:text-marigold",
    clay: "bg-clay/15 text-clay-text",
    ink: "bg-ink text-on-ink",
  } as const;
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>{children}</span>;
}

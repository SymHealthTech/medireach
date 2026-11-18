import Image from "next/image";
import { ChevronRight } from "lucide-react";
import type { SiteCardData } from "@/templates/types";

/** Compact clinic/hospital card for hubs. Factual only: no ratings, ever. */
export function SiteCard({ site: s }: { site: SiteCardData }) {
  const what = s.kind === "hospital" ? "Hospital" : (s.category?.name ?? "Clinic");
  const initials = s.name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <a href={s.url} className="group flex min-w-0 items-center gap-4 rounded-xl border border-line bg-surface p-4 shadow-soft transition hover:border-ink/30">
      {s.logo ? (
        <Image src={s.logo.url} alt={s.logo.alt} width={56} height={56} className="size-14 shrink-0 rounded-xl object-cover" />
      ) : (
        <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-xl font-display text-lg font-semibold text-white" style={{ background: s.color }}>
          {initials}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-lg font-semibold text-ink group-hover:underline">{s.name}</span>
        <span className="block truncate text-sm text-body">
          {what} · {s.area.name}
        </span>
        <span className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
          {s.is24x7 && <span className="font-semibold text-leaf-text">Open 24×7</span>}
          {s.doctorCount > 0 && <span>{s.doctorCount === 1 ? "1 doctor" : `${s.doctorCount} doctors`}</span>}
        </span>
      </span>
      <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
    </a>
  );
}

export function SiteCardGrid({ sites }: { sites: SiteCardData[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sites.map((s) => (
        <li key={s.id} className="min-w-0">
          <SiteCard site={s} />
        </li>
      ))}
    </ul>
  );
}

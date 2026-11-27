import { ChevronRight } from "lucide-react";
import { DoctorAvatar } from "@/components/public/DoctorAvatar";
import type { DoctorCardData } from "@/templates/types";

/** Compact doctor card for hubs (city, specialty and area pages). No ratings, ever. */
export function DoctorCard({ doctor }: { doctor: DoctorCardData }) {
  const meta = [doctor.primarySpecialty?.name, doctor.area?.name].filter(Boolean).join(" · ");
  return (
    <a
      href={doctor.url}
      className="group flex min-w-0 items-center gap-4 rounded-xl border border-line bg-surface p-4 shadow-soft transition hover:border-ink/30"
    >
      <DoctorAvatar name={doctor.fullName} photo={doctor.photo} size={56} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-lg font-semibold text-ink group-hover:underline">
          {doctor.fullName}
        </span>
        {meta && <span className="block truncate text-sm text-body">{meta}</span>}
        {doctor.degreesLine && <span className="block truncate text-sm text-muted-foreground">{doctor.degreesLine}</span>}
      </span>
      <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
    </a>
  );
}

export function DoctorCardGrid({ doctors }: { doctors: DoctorCardData[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {doctors.map((d) => (
        <li key={d.id} className="min-w-0">
          <DoctorCard doctor={d} />
        </li>
      ))}
    </ul>
  );
}

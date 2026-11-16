import { MapPin, MessageCircle, Phone, UserPlus } from "lucide-react";
import { introSentence, profileSubheading } from "@/lib/seo/profile";
import { formatSlots, slotsForDay } from "@/lib/timings";
import { cn } from "@/lib/cn";
import type { PublicDoctor } from "@/templates/types";

/**
 * Marketing mockups of the Classic page. A purpose-built miniature (not the
 * live template): the real page uses viewport breakpoints and emits the
 * doctor's JSON-LD, neither of which belongs inside a homepage illustration.
 * Decorative: hidden from assistive tech, not focusable.
 */

function initials(name: string) {
  const parts = name.replace(/^Dr\.?\s+/i, "").split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

export function MiniProfile({ doctor: d, className }: { doctor: PublicDoctor; className?: string }) {
  const clinic = d.clinics[0];
  const mondayHours = clinic ? formatSlots(slotsForDay(clinic.timings, 1)) : "";
  return (
    <div className={cn("bg-paper text-left text-[11px] leading-snug text-body", className)}>
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="font-display text-[13px] font-semibold text-ink">
          MediReach<span className="ml-0.5 inline-block size-1 rounded-full bg-marigold align-middle" />
        </span>
        <span className="text-[9px] text-muted-foreground">For doctors</span>
      </div>
      <div className="space-y-2.5 px-4 pt-4 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-sage font-display text-xl font-semibold text-ink ring-2 ring-marigold ring-offset-2 ring-offset-paper">
          {initials(d.fullName)}
        </div>
        <p className="font-display text-[19px] font-semibold leading-tight text-ink">{d.fullName}</p>
        <p className="text-[11px]">{profileSubheading(d)}</p>
        <p className="text-[10px] text-muted-foreground">{d.degreesLine}</p>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5 px-4">
        {[
          { icon: Phone, label: "Call" },
          { icon: MessageCircle, label: "WhatsApp" },
          { icon: MapPin, label: "Directions" },
          { icon: UserPlus, label: "Save" },
        ].map(({ icon: Icon, label }, i) => (
          <span
            key={label}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-md py-1.5 text-[8.5px] font-semibold",
              i === 0 ? "bg-ink text-paper" : "border border-line bg-surface text-ink",
            )}
          >
            <Icon className="size-3" strokeWidth={2} />
            {label}
          </span>
        ))}
      </div>
      <div className="mx-4 mt-3 rounded-lg border border-line bg-surface p-3">
        <p className="font-display text-[12px] font-semibold text-ink">About</p>
        <p className="mt-1 text-[10px]">{introSentence(d)}</p>
      </div>
      {clinic && (
        <div className="mx-4 mt-2.5 rounded-lg border border-line bg-surface p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-[12px] font-semibold text-ink">{clinic.name}</p>
            <span className="shrink-0 rounded-full bg-sage px-1.5 py-0.5 text-[8px] text-ink">
              {clinic.type === "hospital_visiting" ? "Visiting" : "Own clinic"}
            </span>
          </div>
          <p className="mt-1 text-[9.5px] text-muted-foreground">{clinic.fullAddress}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[9.5px]">
            <span className="inline-flex items-center gap-1 rounded-full bg-leaf/10 px-1.5 py-0.5 font-semibold text-leaf">
              <span className="size-1 rounded-full bg-leaf" /> Open now
            </span>
            Mon: {mondayHours}
          </p>
        </div>
      )}
      <div className="mx-4 mt-2.5 flex flex-wrap gap-1 pb-6">
        {d.services.slice(0, 4).map((s) => (
          <span key={s.name} className="rounded-full bg-sage px-2 py-0.5 text-[9px] text-ink">
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Phone frame around a MiniProfile. */
export function PhoneMockup({ doctor, className, badge }: { doctor: PublicDoctor; className?: string; badge?: string }) {
  return (
    <div aria-hidden inert className={cn("relative w-[260px] shrink-0 select-none", className)}>
      <div className="overflow-hidden rounded-[34px] border-[9px] border-ink bg-ink shadow-soft">
        <div className="relative h-[520px] overflow-hidden rounded-[25px] bg-paper">
          <div className="absolute left-1/2 top-1.5 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-ink" />
          <div className="pt-5">
            <MiniProfile doctor={doctor} />
          </div>
        </div>
      </div>
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-marigold px-3 py-1 text-xs font-semibold text-[#0e3b3c]">
          {badge}
        </span>
      )}
    </div>
  );
}

/** Browser frame with a URL bar, around a MiniProfile. */
export function BrowserMockup({ doctor, url }: { doctor: PublicDoctor; url: string }) {
  return (
    <div aria-hidden inert className="w-full max-w-[460px] select-none overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
      <div className="flex items-center gap-2 border-b border-line bg-muted px-3 py-2.5">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-clay/60" />
          <span className="size-2.5 rounded-full bg-marigold/70" />
          <span className="size-2.5 rounded-full bg-leaf/60" />
        </span>
        <span className="flex-1 truncate rounded-md bg-surface px-3 py-1 text-xs text-muted-foreground">{url}</span>
      </div>
      <div className="h-[380px] overflow-hidden">
        <MiniProfile doctor={doctor} className="text-[12px]" />
      </div>
    </div>
  );
}

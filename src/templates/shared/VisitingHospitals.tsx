"use client";

import { useState } from "react";
import { ArrowUpRight, Building2, ChevronDown, IndianRupee, MapPin, Navigation, Phone } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { openDaysSummary } from "@/lib/timings";
import type { PublicClinic } from "@/templates/types";

/**
 * Hospitals the doctor visits as a consultant, listed briefly below the
 * doctor's own clinic in every design: no photo, just the hospital name, area
 * and visiting days. Each row opens for the address, note, phone and
 * directions. Coloured through the `cm-` variables, which each design's theme
 * class re-maps, so it matches all five designs. `square` drops the rounded
 * corners (Modern Edge).
 */
export function VisitingHospitals({ hospitals, square, title = "Also consults at" }: { hospitals: PublicClinic[]; square?: boolean; title?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  if (hospitals.length === 0) return null;
  const r = square ? "rounded-none" : "rounded-2xl";

  return (
    <div className="cm-reveal mx-auto mt-10 max-w-[1080px]">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cm-muted">
        <Building2 aria-hidden className="size-4 text-cm-teal" strokeWidth={2} />
        {title}
      </p>
      <ul className={cn("mt-4 divide-y divide-cm-line overflow-hidden bg-white shadow-cm ring-1 ring-cm-line", r)}>
        {hospitals.map((h) => {
          const isOpen = open === h.id;
          const days = openDaysSummary(h.timings).replace(/ \| /g, "; ");
          return (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : h.id)}
                aria-expanded={isOpen}
                aria-controls={`visit-${h.id}`}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-cm-sky sm:px-6"
              >
                <span className={cn("flex size-11 shrink-0 items-center justify-center bg-cm-mint text-cm-teal", square ? "rounded-none" : "rounded-xl")}>
                  <Building2 aria-hidden className="size-5" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-cm-navy">{h.name}</span>
                  <span className="mt-0.5 block text-sm text-cm-muted">
                    {h.area.name}, {h.city.name}
                    {days && <span className="text-cm-text/70"> · Visiting {days}</span>}
                  </span>
                </span>
                <span className="hidden shrink-0 text-sm font-semibold text-cm-teal sm:inline">{isOpen ? "Close" : "Details"}</span>
                <ChevronDown aria-hidden className={cn("size-5 shrink-0 text-cm-teal transition-transform duration-300", isOpen && "rotate-180")} />
              </button>
              <div id={`visit-${h.id}`} hidden={!isOpen}>
                {isOpen && (
                  <div className="cm-rise grid gap-4 border-t border-cm-line bg-cm-sky/60 px-5 py-5 text-[15px] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:px-6">
                    <ul className="space-y-2.5">
                      <li className="flex gap-3">
                        <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-cm-teal" strokeWidth={1.8} />
                        <address className="not-italic text-cm-text/85">{h.fullAddress}</address>
                      </li>
                      {h.phone && (
                        <li className="flex items-center gap-3">
                          <Phone aria-hidden className="size-5 shrink-0 text-cm-teal" strokeWidth={1.8} />
                          <a href={`tel:+${h.phone}`} className="font-semibold text-cm-navy hover:text-cm-teal">
                            {formatPhone(h.phone)}
                          </a>
                        </li>
                      )}
                      {typeof h.fee === "number" && (
                        <li className="flex items-center gap-3 text-cm-text/85">
                          <IndianRupee aria-hidden className="size-5 shrink-0 text-cm-teal" strokeWidth={1.8} />
                          Consultation fee <strong className="font-semibold text-cm-navy">₹{h.fee.toLocaleString("en-IN")}</strong>
                        </li>
                      )}
                      {h.appointmentNote && <li className="text-sm text-cm-muted">{h.appointmentNote}</li>}
                    </ul>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <a
                        href={h.directionsUrl}
                        target="_blank"
                        rel="noopener"
                        className={cn("inline-flex min-h-11 items-center gap-2 bg-cm-navy px-4 text-sm font-semibold text-white transition hover:bg-cm-navy-2", square ? "rounded-none" : "rounded-xl")}
                      >
                        <Navigation aria-hidden className="size-4" /> Directions
                      </a>
                      {h.phone && (
                        <a
                          href={`tel:+${h.phone}`}
                          className={cn("inline-flex min-h-11 items-center gap-2 bg-white px-4 text-sm font-semibold text-cm-navy ring-1 ring-cm-line transition hover:bg-cm-sky", square ? "rounded-none" : "rounded-xl")}
                        >
                          <Phone aria-hidden className="size-4" /> Call
                        </a>
                      )}
                      {h.site && (
                        <a href={h.site.url} className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-cm-teal hover:underline">
                          Hospital website <ArrowUpRight aria-hidden className="size-4" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

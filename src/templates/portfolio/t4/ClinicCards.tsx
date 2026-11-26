"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, IndianRupee, Map as MapIcon, MapPin, Navigation, Phone } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { nowInIndia } from "@/lib/timings";
import { status, TimingsBoard, TYPE_LABEL } from "@/templates/portfolio/t2/ClinicsSection";
import type { PublicClinic } from "@/templates/types";

/**
 * Warm Heritage clinics: one card per clinic, side by side on large screens.
 * A forest-green header with the live open/closed status, the address and
 * contact rows, the week's timings, and a map that opens on request.
 */
export function ClinicCards({ clinics }: { clinics: PublicClinic[] }) {
  const [now, setNow] = useState<{ day: number; minutes: number } | null>(null);
  const [maps, setMaps] = useState<Record<string, boolean>>({});
  useEffect(() => setNow(nowInIndia()), []);

  return (
    <div className={cn("grid gap-8", clinics.length > 1 ? "lg:grid-cols-2" : "mx-auto max-w-3xl")}>
      {clinics.map((c, i) => {
        const st = now ? status(c.timings, now) : null;
        return (
          <article
            key={c.id}
            className="cm-reveal flex flex-col overflow-hidden rounded-[26px] bg-white shadow-wh-lg ring-1 ring-wh-line"
            style={{ ["--cm-delay" as string]: `${i * 120}ms` }}
          >
            <header className="relative overflow-hidden bg-wh-forest px-6 pb-6 pt-7 text-wh-cream sm:px-8">
              <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full border border-wh-saffron/25" />
              <span aria-hidden className="absolute -right-4 -top-4 size-24 rounded-full border border-wh-saffron/20" />
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-wh-saffron">{TYPE_LABEL[c.type]}</p>
              <h3 className="mt-2 font-display text-2xl font-semibold leading-snug sm:text-[28px]">{c.name}</h3>
              <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-wh-cream/75">
                {c.area.name}, {c.city.name}
                {st && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      st.open ? "bg-emerald-400/20 text-emerald-200" : "bg-white/10 text-wh-cream/80",
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", st.open ? "bg-emerald-300" : "bg-wh-cream/50")} />
                    {st.open ? "Open now" : "Closed now"}
                  </span>
                )}
              </p>
            </header>
            <div aria-hidden className="wh-scallop -mt-px rotate-180 [--wh-scallop:var(--color-wh-forest)]" />

            <div className="flex flex-1 flex-col gap-5 px-6 pb-7 pt-3 sm:px-8">
              {st && <p className="font-display text-lg text-wh-terra">{st.text}</p>}
              <ul className="space-y-3 text-[15px]">
                <li className="flex gap-3">
                  <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-wh-terra" strokeWidth={1.8} />
                  <address className="not-italic text-wh-text/85">{c.fullAddress}</address>
                </li>
                {c.phone && (
                  <li className="flex items-center gap-3">
                    <Phone aria-hidden className="size-5 shrink-0 text-wh-terra" strokeWidth={1.8} />
                    <a href={`tel:+${c.phone}`} className="font-semibold text-wh-forest hover:text-wh-terra">
                      {formatPhone(c.phone)}
                    </a>
                  </li>
                )}
                {typeof c.fee === "number" && (
                  <li className="flex items-center gap-3 text-wh-text/85">
                    <IndianRupee aria-hidden className="size-5 shrink-0 text-wh-terra" strokeWidth={1.8} />
                    Consultation fee <strong className="font-semibold text-wh-forest">₹{c.fee.toLocaleString("en-IN")}</strong>
                  </li>
                )}
              </ul>
              {c.appointmentNote && <p className="rounded-2xl bg-wh-paper px-4 py-3 text-sm text-wh-forest">{c.appointmentNote}</p>}

              <TimingsBoard timings={c.timings} />

              <div className="mt-auto flex flex-wrap gap-2">
                <a
                  href={c.directionsUrl}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-wh-forest px-5 text-sm font-semibold text-wh-cream transition hover:bg-wh-forest-2"
                >
                  <Navigation aria-hidden className="size-4" /> Directions
                </a>
                {c.phone && (
                  <a
                    href={`tel:+${c.phone}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-wh-forest ring-1 ring-wh-line transition hover:bg-wh-paper"
                  >
                    <Phone aria-hidden className="size-4" /> Call
                  </a>
                )}
                {c.mapEmbedUrl && (
                  <button
                    type="button"
                    onClick={() => setMaps((m) => ({ ...m, [c.id]: !m[c.id] }))}
                    aria-expanded={!!maps[c.id]}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-wh-terra ring-1 ring-wh-line transition hover:bg-wh-paper"
                  >
                    <MapIcon aria-hidden className="size-4" /> {maps[c.id] ? "Hide map" : "Show map"}
                  </button>
                )}
                {c.site && (
                  <a href={c.site.url} className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-wh-terra hover:underline">
                    {c.site.name} website <ArrowUpRight aria-hidden className="size-4" />
                  </a>
                )}
              </div>
              {maps[c.id] && c.mapEmbedUrl && (
                <iframe
                  title={`Map showing ${c.name}`}
                  src={c.mapEmbedUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="cm-rise block h-56 w-full rounded-2xl border-0 ring-1 ring-wh-line"
                />
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

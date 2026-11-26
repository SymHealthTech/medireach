"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowUpRight, IndianRupee, Map as MapIcon, MapPin, Navigation, Phone } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { nowInIndia } from "@/lib/timings";
import { status, TimingsBoard, TYPE_LABEL } from "@/templates/portfolio/t2/ClinicsSection";
import type { PublicClinic } from "@/templates/types";

/**
 * Modern Edge clinics: every clinic shown in full, one after another, with
 * the photo and details on alternating sides and the week's timings beside
 * them. The map loads only when asked for ("Show map").
 */
export function ClinicList({ clinics, photos }: { clinics: PublicClinic[]; photos: string[] }) {
  const [now, setNow] = useState<{ day: number; minutes: number } | null>(null);
  const [maps, setMaps] = useState<Record<string, boolean>>({});
  useEffect(() => setNow(nowInIndia()), []);

  return (
    <ol className="space-y-8">
      {clinics.map((c, i) => {
        const st = now ? status(c.timings, now) : null;
        const flip = i % 2 === 1;
        return (
          <li key={c.id} className="cm-reveal grid overflow-hidden bg-white shadow-me ring-1 ring-me-line lg:grid-cols-2">
            <div className={cn("relative min-h-[260px]", flip && "lg:order-2")}>
              <Image src={photos[i]!} alt="" fill sizes="(min-width: 1024px) 640px, 100vw" className="object-cover" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-me-ink/90 via-me-ink/30 to-transparent" />
              <span className="absolute left-0 top-0 bg-me-orange px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white">
                {String(i + 1).padStart(2, "0")} · {TYPE_LABEL[c.type]}
              </span>
              <div className="absolute inset-x-6 bottom-6 text-white">
                <h3 className="text-2xl font-bold uppercase leading-tight tracking-tight sm:text-3xl">{c.name}</h3>
                <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-white/75">
                  {c.area.name}, {c.city.name}
                  {st && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold uppercase tracking-wider",
                        st.open ? "bg-emerald-500 text-white" : "bg-white/15 text-white",
                      )}
                    >
                      {st.open ? "Open now" : "Closed"}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="grid gap-6 p-6 sm:p-8">
              <div className="min-w-0 space-y-4">
                {st && <p className="text-sm font-bold uppercase tracking-wider text-me-cobalt">{st.text}</p>}
                <ul className="space-y-3 text-[15px]">
                  <li className="flex gap-3">
                    <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-me-orange" strokeWidth={1.9} />
                    <address className="not-italic text-me-text/85">{c.fullAddress}</address>
                  </li>
                  {c.phone && (
                    <li className="flex items-center gap-3">
                      <Phone aria-hidden className="size-5 shrink-0 text-me-orange" strokeWidth={1.9} />
                      <a href={`tel:+${c.phone}`} className="font-bold text-me-ink hover:text-me-cobalt">
                        {formatPhone(c.phone)}
                      </a>
                    </li>
                  )}
                  {typeof c.fee === "number" && (
                    <li className="flex items-center gap-3 text-me-text/85">
                      <IndianRupee aria-hidden className="size-5 shrink-0 text-me-orange" strokeWidth={1.9} />
                      Fee <strong className="font-bold text-me-ink">₹{c.fee.toLocaleString("en-IN")}</strong>
                    </li>
                  )}
                </ul>
                {c.appointmentNote && <p className="border-l-[3px] border-me-orange bg-me-ivory px-4 py-3 text-sm text-me-ink">{c.appointmentNote}</p>}
                <div className="flex flex-wrap gap-2">
                  <a
                    href={c.directionsUrl}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex h-11 items-center gap-2 bg-me-ink px-4 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-me-cobalt"
                  >
                    <Navigation aria-hidden className="size-4" /> Directions
                  </a>
                  {c.mapEmbedUrl && (
                    <button
                      type="button"
                      onClick={() => setMaps((m) => ({ ...m, [c.id]: !m[c.id] }))}
                      aria-expanded={!!maps[c.id]}
                      className="inline-flex h-11 items-center gap-2 px-4 text-sm font-bold uppercase tracking-wider text-me-ink ring-1 ring-me-line transition hover:bg-me-steel"
                    >
                      <MapIcon aria-hidden className="size-4" /> {maps[c.id] ? "Hide map" : "Show map"}
                    </button>
                  )}
                  {c.site && (
                    <a href={c.site.url} className="inline-flex h-11 items-center gap-1 px-2 text-sm font-bold text-me-cobalt hover:underline">
                      Website <ArrowUpRight aria-hidden className="size-4" />
                    </a>
                  )}
                </div>
                {maps[c.id] && c.mapEmbedUrl && (
                  <iframe
                    title={`Map showing ${c.name}`}
                    src={c.mapEmbedUrl}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="cm-rise block h-56 w-full border-0 ring-1 ring-me-line"
                  />
                )}
              </div>
              <div className="min-w-0 [&>div]:!rounded-none">
                <TimingsBoard timings={c.timings} />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, IndianRupee, MapPin, Navigation, Phone } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { nowInIndia } from "@/lib/timings";
import { status, TimingsBoard, TYPE_LABEL } from "@/templates/portfolio/t2/ClinicsSection";
import type { PublicClinic } from "@/templates/types";

/**
 * Serene Care clinics: pill tabs (one per clinic, with a live open/closed
 * dot), and one panel at a time: address card (buttons with a small map
 * beside them) and weekly timings. Arrow keys move between tabs.
 */
export function ClinicTabs({ clinics }: { clinics: PublicClinic[] }) {
  const [active, setActive] = useState(0);
  const [now, setNow] = useState<{ day: number; minutes: number } | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => setNow(nowInIndia()), []);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (active + (e.key === "ArrowRight" ? 1 : -1) + clinics.length) % clinics.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  const c = clinics[active]!;
  const st = now ? status(c.timings, now) : null;

  return (
    <div>
      {clinics.length > 1 && (
        <div
          role="tablist"
          aria-label="Clinics"
          onKeyDown={onKey}
          className="cm-reveal mx-auto flex w-fit max-w-full flex-wrap justify-center gap-2 rounded-[28px] bg-white p-2 shadow-sc ring-1 ring-sc-line"
        >
          {clinics.map((x, i) => {
            const s = now ? status(x.timings, now) : null;
            return (
              <button
                key={x.id}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`sc-tab-${x.id}`}
                aria-selected={i === active}
                aria-controls={`sc-panel-${x.id}`}
                tabIndex={i === active ? 0 : -1}
                onClick={() => setActive(i)}
                className={cn(
                  "flex min-h-12 items-center gap-2.5 rounded-full px-5 text-left text-sm font-semibold transition-all duration-300",
                  i === active ? "bg-sc-plum text-white shadow-sc" : "text-sc-plum hover:bg-sc-blush",
                )}
              >
                {s && <span aria-hidden className={cn("size-2 shrink-0 rounded-full", s.open ? "bg-emerald-400" : i === active ? "bg-white/40" : "bg-sc-muted/40")} />}
                <span>
                  <span className="block leading-tight">{x.name}</span>
                  <span className={cn("block text-xs font-medium", i === active ? "text-white/70" : "text-sc-muted")}>{x.area.name}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div
        key={c.id}
        id={`sc-panel-${c.id}`}
        role={clinics.length > 1 ? "tabpanel" : undefined}
        aria-labelledby={clinics.length > 1 ? `sc-tab-${c.id}` : undefined}
        className="cm-rise mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10"
      >
        <div className="min-w-0">
          <div>
            <div className="relative overflow-hidden rounded-[28px] bg-white p-6 shadow-sc-lg ring-1 ring-sc-line sm:p-8">
              <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sc-gold via-sc-pink to-sc-rose" />
              <span className="inline-block rounded-full bg-sc-blush px-3.5 py-1 text-xs font-bold uppercase tracking-[0.16em] text-sc-rose">{TYPE_LABEL[c.type]}</span>
              <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-display text-2xl font-semibold text-sc-plum">{c.name}</h3>
                {st && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                      st.open ? "bg-emerald-50 text-emerald-700" : "bg-sc-blush text-sc-muted",
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", st.open ? "bg-emerald-500" : "bg-sc-muted/50")} />
                    {st.open ? "Open now" : "Closed now"}
                  </span>
                )}
              </div>
              {st && <p className="mt-1 text-sm text-sc-muted">{st.text}</p>}
              <ul className="mt-5 space-y-3 text-[15px]">
                <li className="flex gap-3">
                  <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-sc-rose" strokeWidth={1.8} />
                  <address className="not-italic text-sc-text/85">{c.fullAddress}</address>
                </li>
                {c.phone && (
                  <li className="flex items-center gap-3">
                    <Phone aria-hidden className="size-5 shrink-0 text-sc-rose" strokeWidth={1.8} />
                    <a href={`tel:+${c.phone}`} className="font-semibold text-sc-plum hover:text-sc-rose">
                      {formatPhone(c.phone)}
                    </a>
                  </li>
                )}
                {typeof c.fee === "number" && (
                  <li className="flex items-center gap-3 text-sc-text/85">
                    <IndianRupee aria-hidden className="size-5 shrink-0 text-sc-rose" strokeWidth={1.8} />
                    Consultation fee <strong className="font-semibold text-sc-plum">₹{c.fee.toLocaleString("en-IN")}</strong>
                  </li>
                )}
              </ul>
              {c.appointmentNote && <p className="mt-5 rounded-2xl border border-dashed border-sc-gold/60 bg-sc-cream px-4 py-3 text-sm text-sc-plum">{c.appointmentNote}</p>}
              <div className={cn("mt-5 grid gap-4", c.mapEmbedUrl && "sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]")}>
                <div className="flex flex-col gap-2.5">
                  <a
                    href={c.directionsUrl}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-sc-plum px-5 text-sm font-semibold text-white transition hover:bg-sc-plum-2"
                  >
                    <Navigation aria-hidden className="size-4" strokeWidth={2} /> Directions
                  </a>
                  {c.phone && (
                    <a
                      href={`tel:+${c.phone}`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-sc-plum ring-1 ring-sc-line transition hover:bg-sc-blush"
                    >
                      <Phone aria-hidden className="size-4" strokeWidth={2} /> Call
                    </a>
                  )}
                  {c.site && (
                    <a href={c.site.url} className="inline-flex min-h-11 items-center justify-center gap-1 px-2 text-sm font-semibold text-sc-rose hover:underline">
                      {c.site.name} website <ArrowUpRight aria-hidden className="size-4" />
                    </a>
                  )}
                </div>
                {c.mapEmbedUrl && (
                  <iframe
                    title={`Map showing ${c.name}`}
                    src={c.mapEmbedUrl}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="block h-36 w-full rounded-2xl border-0 ring-1 ring-sc-line sm:h-full sm:min-h-[104px]"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <TimingsBoard timings={c.timings} />
        </div>
      </div>
    </div>
  );
}

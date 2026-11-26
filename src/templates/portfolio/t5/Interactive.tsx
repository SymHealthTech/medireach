"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Apple,
  ArrowRight,
  Baby,
  Bone,
  Brain,
  Check,
  ClipboardCheck,
  Droplet,
  Eye,
  HeartPulse,
  House,
  Pill,
  Search,
  Smile,
  Sparkles,
  Stethoscope,
  Syringe,
  Thermometer,
  Users,
  Wind,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { DAY_SHORT, formatTime, nowInIndia, slotsForDay, WEEK_ORDER } from "@/lib/timings";
import type { ServiceIcon } from "@/content/service-descriptions";
import type { PublicClinic } from "@/templates/types";

const ICONS: Record<ServiceIcon, typeof Stethoscope> = {
  stethoscope: Stethoscope,
  droplet: Droplet,
  heart: HeartPulse,
  syringe: Syringe,
  clipboard: ClipboardCheck,
  thermometer: Thermometer,
  apple: Apple,
  users: Users,
  activity: Activity,
  baby: Baby,
  bone: Bone,
  eye: Eye,
  smile: Smile,
  brain: Brain,
  wind: Wind,
  sparkles: Sparkles,
  home: House,
  pill: Pill,
};

/**
 * Services as tabs: the list on the left, the chosen service on the right.
 * Every description is in the page (hidden panels), so it stays crawlable.
 */
export function ServiceTabs({ services }: { services: { name: string; text: string; icon: ServiceIcon }[] }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const next = (active + keys[e.key]! + services.length) % services.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div
        role="tablist"
        aria-label="Services"
        aria-orientation="vertical"
        onKeyDown={onKey}
        className="cm-reveal flex flex-col gap-1.5 rounded-2xl bg-white p-2 shadow-sp ring-1 ring-sp-line"
      >
        {services.map((s, i) => {
          const Icon = ICONS[s.icon];
          return (
            <button
              key={s.name}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`sp-svc-tab-${i}`}
              aria-selected={i === active}
              aria-controls={`sp-svc-${i}`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              className={cn(
                "group flex min-h-12 items-center gap-3 rounded-xl px-3 text-left text-[15px] font-semibold transition",
                i === active ? "bg-sp-slate text-white" : "text-sp-slate hover:bg-sp-ice",
              )}
            >
              <span
                className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg transition", i === active ? "bg-sp-crimson text-white" : "bg-sp-ice text-sp-crimson")}
              >
                <Icon aria-hidden className="size-[18px]" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">{s.name}</span>
              <ArrowRight
                aria-hidden
                className={cn("size-4 shrink-0 transition", i === active ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0 group-hover:opacity-60")}
              />
            </button>
          );
        })}
      </div>
      <div className="relative min-h-[320px]">
        {services.map((s, i) => {
          const Icon = ICONS[s.icon];
          return (
            <div
              key={s.name}
              role="tabpanel"
              id={`sp-svc-${i}`}
              aria-labelledby={`sp-svc-tab-${i}`}
              hidden={i !== active}
              className="cm-rise h-full overflow-hidden rounded-2xl bg-sp-slate p-8 text-white shadow-sp-lg sm:p-10"
            >
              <div className="flex items-start justify-between gap-6">
                <span className="flex size-16 items-center justify-center rounded-2xl bg-sp-crimson">
                  <Icon aria-hidden className="size-8" strokeWidth={1.6} />
                </span>
                <span className="text-5xl font-bold tabular-nums text-white/10">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="mt-8 text-3xl font-bold tracking-tight">{s.name}</h3>
              <p className="mt-4 text-lg leading-relaxed text-white/75">{s.text}</p>
              <div aria-hidden className="relative mt-10 h-px overflow-hidden bg-white/10">
                <span className="sp-scan absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-sp-crimson to-transparent" />
              </div>
              <a href="#appointment" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 font-semibold text-sp-slate transition hover:bg-sp-blush">
                Ask about {s.name.toLowerCase()} <ArrowRight aria-hidden className="size-4" />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Conditions with a search box: type to filter the list. */
export function ConditionsFilter({ conditions }: { conditions: string[] }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? conditions.filter((c) => c.toLowerCase().includes(t)) : conditions;
  }, [q, conditions]);

  return (
    <div className="cm-reveal rounded-2xl bg-white p-6 shadow-sp ring-1 ring-sp-line sm:p-8">
      <label className="relative block">
        <span className="sr-only">Search conditions</span>
        <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-sp-muted" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a condition"
          className="block h-14 w-full rounded-xl border border-sp-line bg-sp-ice pl-12 pr-12 text-[15px] text-sp-text outline-none transition placeholder:text-sp-muted/70 focus:border-sp-crimson focus:bg-white focus:ring-4 focus:ring-sp-crimson/10"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-sp-muted hover:bg-sp-line"
          >
            <X className="size-4" />
          </button>
        )}
      </label>
      <p className="mt-4 text-sm text-sp-muted" aria-live="polite">
        {q ? `${shown.length} of ${conditions.length} match “${q.trim()}”` : `${conditions.length} conditions`}
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((c) => (
          <li key={c} className="flex items-center gap-2.5 rounded-xl bg-sp-ice px-4 py-3 text-[15px] font-semibold text-sp-slate">
            <Check aria-hidden className="size-4 shrink-0 text-sp-crimson" strokeWidth={3} />
            {c}
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="mt-2 rounded-xl bg-sp-blush px-4 py-3 text-sm text-sp-crimson-2">Not listed here. Please ask the clinic about your concern.</p>}
    </div>
  );
}

/** The week as a grid: days down the side, clinics across, today highlighted. */
export function ScheduleMatrix({ clinics }: { clinics: PublicClinic[] }) {
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => setToday(nowInIndia().day), []);
  return (
    <div className="cm-reveal overflow-x-auto rounded-2xl bg-white shadow-sp ring-1 ring-sp-line">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <caption className="sr-only">Weekly consultation timings</caption>
        <thead>
          <tr className="bg-sp-slate text-white">
            <th scope="col" className="px-5 py-4 text-xs font-bold uppercase tracking-[0.16em]">
              Day
            </th>
            {clinics.map((c) => (
              <th key={c.id} scope="col" className="px-5 py-4 font-semibold">
                {c.name}
                <span className="block text-xs font-normal text-white/60">{c.area.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {WEEK_ORDER.map((day) => (
            <tr key={day} className={cn("border-t border-sp-line", today === day && "bg-sp-blush/60")}>
              <th scope="row" className="whitespace-nowrap px-5 py-3.5 font-semibold text-sp-slate">
                {DAY_SHORT[day]}
                {today === day && <span className="ml-2 rounded-full bg-sp-crimson px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Today</span>}
              </th>
              {clinics.map((c) => {
                const slots = slotsForDay(c.timings, day);
                return (
                  <td key={c.id} className="px-5 py-3.5">
                    {slots.length ? (
                      <span className="flex flex-wrap gap-1.5">
                        {slots.map((s) => (
                          <span
                            key={`${s.open}-${s.close}`}
                            className={cn("whitespace-nowrap rounded-lg px-2.5 py-1 font-semibold", today === day ? "bg-sp-crimson text-white" : "bg-sp-ice text-sp-slate")}
                          >
                            {formatTime(s.open)} – {formatTime(s.close)}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-sp-muted/70">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

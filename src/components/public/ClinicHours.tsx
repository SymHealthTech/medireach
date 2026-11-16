"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  DAY_NAMES,
  formatSlots,
  hasAnyTimings,
  isOpenAt,
  nowInIndia,
  slotsForDay,
  WEEK_ORDER,
  type DayTimings,
} from "@/lib/timings";

/**
 * Clinic timings with today's row highlighted and an Open now / Closed badge.
 * The full week is server-rendered (crawlable); "today" and "open now" are
 * computed on the client in India time, since the page itself is static.
 */
export function ClinicHours({ timings }: { timings: DayTimings[] }) {
  const [now, setNow] = useState<{ day: number; minutes: number } | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const tick = () => setNow(nowInIndia());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!hasAnyTimings(timings)) {
    return <p className="text-sm text-muted-foreground">Please call the clinic for timings.</p>;
  }

  const open = now ? isOpenAt(timings, now) : null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {now && (
          <>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                open ? "bg-leaf/10 text-leaf-text" : "bg-line text-body",
              )}
            >
              <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", open ? "bg-leaf" : "bg-muted-foreground")} />
              {open ? "Open now" : "Closed now"}
            </span>
            <span className="text-sm text-body">
              Today: {formatSlots(slotsForDay(timings, now.day))}
            </span>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="mt-2 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-ink"
      >
        {expanded ? "Hide weekly timings" : "See all timings"}
        <ChevronDown aria-hidden className={cn("h-4 w-4 transition", expanded && "rotate-180")} strokeWidth={1.75} />
      </button>

      {/* Always in the HTML for crawlers; visually collapsed until expanded.
          sr-only goes on a wrapper: a table ignores the 1px box and overflows narrow screens. */}
      <div className={cn(!expanded && "sr-only")}>
        <table className="mt-1 w-full text-sm">
          <caption className="sr-only">Weekly timings</caption>
          <tbody>
            {WEEK_ORDER.map((day) => {
              const isToday = now?.day === day;
              return (
                <tr key={day} className={cn("border-t border-line first:border-0", isToday && "font-semibold text-ink")}>
                  <th scope="row" className="py-2 pr-4 text-left font-medium">
                    {DAY_NAMES[day]}
                  </th>
                  <td className="py-2 text-right">{formatSlots(slotsForDay(timings, day))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

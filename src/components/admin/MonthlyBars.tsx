"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Six-month column chart (DESIGN_BRIEF.md §4: ink bars, marigold for the
 * current month). Single series, so no legend — the title names it.
 *
 * Accessibility (dataviz rules): each bar is a focusable hit target wider than
 * the 24px mark with a hover/focus tooltip; the current month carries a direct
 * value label in a text colour (marigold is only 2.2:1 on white, so it never
 * carries text); a table view lists every value.
 */
export interface MonthPoint {
  label: string; // "Nov" (tooltip and table)
  value: number;
  detail?: string; // tooltip secondary line, e.g. "6 payments"
  /** Shorter axis label (days: "27"); defaults to `label`. */
  axis?: string;
}

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= max)!;
  return step * pow;
}

const FORMATS = {
  inr: (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`,
  count: (n: number) => String(Math.round(n)),
};

export function MonthlyBars({
  title,
  points,
  unit,
  period = "Month",
  labelEvery = 1,
}: {
  title: string;
  points: MonthPoint[];
  /** How values are shown (a name, not a function: this is rendered from server pages). */
  unit: keyof typeof FORMATS;
  /** Table column heading ("Month", "Day"). */
  period?: string;
  /** Many bars (days): label every nth on the axis; the last is always labelled. */
  labelEvery?: number;
}) {
  const format = FORMATS[unit];
  const [active, setActive] = useState<number | null>(null);
  const nice = niceMax(Math.max(...points.map((p) => p.value)));
  // Counts: an even top, so the middle gridline is a whole number (5 → 6: 0, 3, 6).
  const max = unit === "count" && nice % 2 === 1 ? nice + 1 : nice;
  const ticks = [0, max / 2, max];
  const current = points.length - 1;

  return (
    <figure className="space-y-3">
      <figcaption className="text-sm font-semibold text-ink">{title}</figcaption>
      <div className="relative mt-4 h-48 pl-14">
        {/* Gridlines + y ticks (hairline, recessive) */}
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 flex items-center" style={{ bottom: `${(t / max) * 100}%` }}>
            <span className="w-12 -translate-y-0 pr-2 text-right text-[11px] tabular-nums text-muted-foreground">{format(t)}</span>
            <span className="h-px flex-1 bg-line" />
          </div>
        ))}
        <ol className="relative flex h-full items-end justify-around">
          {points.map((p, i) => {
            const h = (p.value / max) * 100;
            const isCurrent = i === current;
            return (
              <li key={i} className="relative flex h-full flex-1 flex-col items-center justify-end px-px">
                {isCurrent && p.value > 0 && (
                  <span className="mb-1 text-xs font-semibold tabular-nums text-ink" style={{ marginBottom: 4 }}>
                    {format(p.value)}
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`${p.label}: ${format(p.value)}${p.detail ? `, ${p.detail}` : ""}`}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive((a) => (a === i ? null : a))}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive((a) => (a === i ? null : a))}
                  className="flex h-full w-full max-w-14 cursor-default items-end justify-center outline-offset-2"
                  style={{ height: `${Math.max(h, 0)}%` }}
                >
                  <span
                    className={cn(
                      "block h-full w-full max-w-6 rounded-t-[4px] transition-opacity",
                      isCurrent ? "bg-marigold" : "bg-ink",
                      active !== null && active !== i && "opacity-60",
                      p.value === 0 && "h-px rounded-none bg-line",
                    )}
                  />
                </button>
                {active === i && (
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg border border-line bg-popover px-2.5 py-1.5 text-center shadow-soft"
                  >
                    <span className="block text-sm font-semibold tabular-nums text-foreground">{format(p.value)}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {p.label}
                      {p.detail ? ` · ${p.detail}` : ""}
                    </span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <ol aria-hidden className="flex justify-around pl-14 text-xs text-muted-foreground">
        {points.map((p, i) => (
          <li key={i} className={cn("flex-1 text-center", i === current && "font-semibold text-ink")}>
            {i === current || (current - i) % labelEvery === 0 ? (p.axis ?? p.label) : ""}
          </li>
        ))}
      </ol>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-ink">Show as table</summary>
        <table className="mt-2 w-full max-w-sm text-left">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-1 font-medium">{period}</th>
              <th className="py-1 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={i} className="border-t border-line">
                <td className="py-1">{p.label}</td>
                <td className="py-1 text-right tabular-nums">
                  {format(p.value)}
                  {p.detail ? <span className="text-muted-foreground"> · {p.detail}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

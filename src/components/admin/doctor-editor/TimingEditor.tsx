"use client";

import { Copy, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DAY_NAMES } from "@/lib/timings";
import type { ClinicForm, SlotValue } from "@/lib/doctors/form";

type Timings = ClinicForm["timings"];

const ORDER = [1, 2, 3, 4, 5, 6, 0];
const DEFAULT_SLOT: SlotValue = { open: "10:00", close: "13:00" };

/**
 * Weekly timings (DESIGN_BRIEF.md §4): 7 day rows, open/closed toggle,
 * multiple slots per day, and "copy Monday" shortcuts.
 */
export function TimingEditor({
  value,
  onChange,
  disabled,
  idPrefix,
}: {
  value: Timings;
  onChange: (v: Timings) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  const get = (day: number) => value.find((t) => t.day === day)?.slots ?? [];
  const setDay = (day: number, slots: SlotValue[]) => {
    const others = value.filter((t) => t.day !== day);
    onChange([...others, { day, slots }].sort((a, b) => ORDER.indexOf(a.day) - ORDER.indexOf(b.day)));
  };
  const copyMonday = (days: number[]) => {
    const mon = get(1);
    onChange(ORDER.map((day) => ({ day, slots: days.includes(day) ? mon.map((s) => ({ ...s })) : get(day) })));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={disabled || get(1).length === 0} onClick={() => copyMonday([2, 3, 4, 5])}>
          <Copy /> Copy Monday to all weekdays
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={disabled || get(1).length === 0} onClick={() => copyMonday([2, 3, 4, 5, 6])}>
          <Copy /> …and Saturday
        </Button>
      </div>
      <ul className="divide-y divide-line rounded-lg border border-line bg-card">
        {ORDER.map((day) => {
          const slots = get(day);
          const open = slots.length > 0;
          return (
            <li key={day} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start">
              <div className="flex w-36 shrink-0 items-center gap-3">
                <Switch
                  id={`${idPrefix}-day-${day}`}
                  checked={open}
                  disabled={disabled}
                  onCheckedChange={(on) => setDay(day, on ? [{ ...DEFAULT_SLOT }] : [])}
                  aria-label={`${DAY_NAMES[day]} open`}
                />
                <label htmlFor={`${idPrefix}-day-${day}`} className="text-sm font-medium">
                  {DAY_NAMES[day]}
                </label>
              </div>
              {open ? (
                <div className="flex flex-1 flex-col gap-2">
                  {slots.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={s.open}
                        disabled={disabled}
                        aria-label={`${DAY_NAMES[day]} slot ${i + 1} opens`}
                        onChange={(e) => setDay(day, slots.map((x, j) => (j === i ? { ...x, open: e.target.value } : x)))}
                        className="h-10 rounded-lg border border-input bg-card px-2 text-sm"
                      />
                      <span className="text-muted-foreground">to</span>
                      <input
                        type="time"
                        value={s.close}
                        disabled={disabled}
                        aria-label={`${DAY_NAMES[day]} slot ${i + 1} closes`}
                        onChange={(e) => setDay(day, slots.map((x, j) => (j === i ? { ...x, close: e.target.value } : x)))}
                        className="h-10 rounded-lg border border-input bg-card px-2 text-sm"
                      />
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={disabled}
                        aria-label="Remove slot"
                        onClick={() => setDay(day, slots.filter((_, j) => j !== i))}
                      >
                        <X />
                      </Button>
                    </div>
                  ))}
                  {slots.length < 4 && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setDay(day, [...slots, { open: "17:00", close: "20:00" }])}
                      className="inline-flex w-fit items-center gap-1 text-sm font-medium text-ink hover:underline"
                    >
                      <Plus className="size-4" /> Add slot
                    </button>
                  )}
                </div>
              ) : (
                <span className="py-2 text-sm text-muted-foreground">Closed</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

"use client";

import { useState } from "react";
import { CalendarClock, Copy, Keyboard, Plus, Wand2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { DAY_NAMES, TIMING_PRESETS, WEEK_ORDER, parseTimingsText, timingsToText, type DayTimings, type Slot } from "@/lib/timings";
import { inputClass } from "./input-class";

const emptyWeek = (): DayTimings[] => WEEK_ORDER.map((day) => ({ day, slots: [] }));
const DEFAULT_SLOT: Slot = { open: "10:00", close: "13:00" };
const EVENING_SLOT: Slot = { open: "18:00", close: "21:00" };

/** Text the picker would write itself (so switching back and forth loses nothing). */
function pickerWeek(text: string): DayTimings[] | null {
  if (!text.trim()) return emptyWeek();
  const week = parseTimingsText(text);
  return week && timingsToText(week) === text.trim() ? week : null;
}

const timeClass = cn(inputClass, "h-11 min-w-0 flex-1 px-2 sm:w-32 sm:flex-none");

/**
 * Weekly timings for the website form: one-tap patterns, a row per day
 * (open/closed, several slots), "copy Monday" shortcuts, or plain text.
 * The answer stays text ("Mon–Sat: 10 am – 1 pm, 6 pm – 9 pm") so older
 * forms and the admin's import keep working.
 */
export function TimingsField({ id, value, onChange, placeholder, describedBy, invalid }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string; describedBy?: string; invalid?: boolean }) {
  const [mode, setMode] = useState<"pick" | "type">(() => (pickerWeek(value) ? "pick" : "type"));
  // The picker keeps its own week (a slot being edited may briefly open after it closes); the text follows it.
  const [week, setWeek] = useState<DayTimings[]>(() => pickerWeek(value) ?? parseTimingsText(value) ?? emptyWeek());
  const [written, setWritten] = useState(value);
  if (value !== written) {
    // Changed from outside (a saved form opened, or typed in text mode).
    setWritten(value);
    setWeek(pickerWeek(value) ?? parseTimingsText(value) ?? emptyWeek());
  }
  const write = (next: DayTimings[]) => {
    const text = timingsToText(next);
    setWeek(next);
    setWritten(text);
    onChange(text);
  };
  const get = (day: number) => week.find((d) => d.day === day)?.slots ?? [];
  const setDay = (day: number, slots: Slot[]) => write(week.map((d) => (d.day === day ? { day, slots } : d)));
  const copyMonday = (days: number[]) => write(week.map((d) => (days.includes(d.day) ? { day: d.day, slots: get(1).map((s) => ({ ...s })) } : d)));

  if (mode === "type") {
    const readable = parseTimingsText(value);
    return (
      <div className="space-y-2">
        <textarea
          id={id}
          rows={3}
          value={value}
          placeholder={placeholder}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClass, "min-h-11 py-2.5 leading-relaxed")}
        />
        <button
          type="button"
          onClick={() => {
            if (readable) write(readable);
            setMode("pick");
          }}
          className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-lagoon/40 bg-lagoon/5 px-3 text-sm font-semibold text-lagoon hover:bg-lagoon/10"
        >
          <CalendarClock className="size-4" aria-hidden /> {value.trim() && readable ? "Show these in the day-by-day picker" : "Use the day-by-day picker"}
        </button>
        {value.trim() && !readable && <p className="text-xs text-body/70">We couldn&apos;t read these as days and hours. That&apos;s fine: our team will enter them.</p>}
      </div>
    );
  }

  return (
    <div id={id} role="group" aria-describedby={describedBy} className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Common timings">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-body/70">
          <Wand2 className="size-3.5 text-marigold" aria-hidden /> Quick fill:
        </span>
        {TIMING_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => write(p.timings)}
            className="inline-flex min-h-8 items-center rounded-full border border-lagoon/30 bg-lagoon/5 px-2.5 text-xs font-medium text-ink hover:border-lagoon hover:bg-lagoon/10"
          >
            {p.label}
          </button>
        ))}
      </div>

      <ul className={cn("divide-y divide-line overflow-hidden rounded-xl border bg-surface", invalid ? "border-clay" : "border-line")}>
        {WEEK_ORDER.map((day) => {
          const slots = get(day);
          const open = slots.length > 0;
          const dayId = `${id}-day-${day}`;
          return (
            <li key={day} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start">
              <label htmlFor={dayId} className="flex min-h-11 w-36 shrink-0 cursor-pointer items-center gap-3">
                <input
                  id={dayId}
                  type="checkbox"
                  checked={open}
                  onChange={(e) => setDay(day, e.target.checked ? [{ ...DEFAULT_SLOT }] : [])}
                  className="size-5 accent-[#0E7C7B]"
                />
                <span className="text-sm font-semibold text-ink">{DAY_NAMES[day]}</span>
              </label>
              {open ? (
                <div className="flex flex-1 flex-col gap-2">
                  {slots.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 sm:gap-2">
                      <input
                        type="time"
                        value={s.open}
                        aria-label={`${DAY_NAMES[day]} slot ${i + 1} opens`}
                        onChange={(e) => e.target.value && setDay(day, slots.map((x, j) => (j === i ? { ...x, open: e.target.value } : x)))}
                        className={timeClass}
                      />
                      <span className="shrink-0 text-sm text-body/70">to</span>
                      <input
                        type="time"
                        value={s.close}
                        aria-label={`${DAY_NAMES[day]} slot ${i + 1} closes`}
                        onChange={(e) => e.target.value && setDay(day, slots.map((x, j) => (j === i ? { ...x, close: e.target.value } : x)))}
                        className={timeClass}
                      />
                      <button
                        type="button"
                        aria-label={`Remove ${DAY_NAMES[day]} slot ${i + 1}`}
                        onClick={() => setDay(day, slots.filter((_, j) => j !== i))}
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-clay-text hover:bg-clay/10"
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                    </div>
                  ))}
                  {slots.length < 4 && (
                    <button
                      type="button"
                      onClick={() => setDay(day, [...slots, slots.some((x) => x.open >= "17:00") ? { open: "14:00", close: "17:00" } : { ...EVENING_SLOT }])}
                      className="inline-flex min-h-9 w-fit items-center gap-1 text-sm font-semibold text-lagoon hover:underline"
                    >
                      <Plus className="size-4" aria-hidden /> Add evening / another slot
                    </button>
                  )}
                </div>
              ) : (
                <span className="flex min-h-11 items-center text-sm text-body/60">Closed</span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={get(1).length === 0}
          onClick={() => copyMonday([2, 3, 4, 5])}
          className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-line bg-surface px-3 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-50"
        >
          <Copy className="size-4" aria-hidden /> Copy Monday to Tue–Fri
        </button>
        <button
          type="button"
          disabled={get(1).length === 0}
          onClick={() => copyMonday([2, 3, 4, 5, 6])}
          className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-line bg-surface px-3 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-50"
        >
          <Copy className="size-4" aria-hidden /> …and Saturday
        </button>
        <button type="button" onClick={() => setMode("type")} className="inline-flex min-h-10 items-center gap-2 rounded-[10px] px-3 text-sm font-semibold text-lagoon hover:bg-lagoon/10">
          <Keyboard className="size-4" aria-hidden /> Type them instead
        </button>
      </div>
      {value && <p className="rounded-lg bg-paper px-3 py-2 text-sm whitespace-pre-line text-body">{value}</p>}
    </div>
  );
}

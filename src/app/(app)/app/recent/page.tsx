"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiGet } from "@/lib/client/api";
import { useMe } from "@/lib/client/useMe";
import { cn } from "@/lib/cn";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DayPatient {
  id: string;
  visitId: string;
  name: string;
  mobile: string;
  gender?: string;
  ageYears?: number;
  isEditLocked: boolean;
}
interface DayRecord {
  date: string; // YYYY-MM-DD IST
  patientCount: number;
  patients: DayPatient[];
}
interface RecentPatient {
  id: string;
  name: string;
  mobile: string;
  lastVisitDate: string;
}

// ─── IST helpers ─────────────────────────────────────────────────────────────

const IST_MS = 5.5 * 60 * 60 * 1000;
function todayIST(): string {
  return new Date(Date.now() + IST_MS).toISOString().slice(0, 10);
}
function yesterdayIST(): string {
  return new Date(Date.now() + IST_MS - 86_400_000).toISOString().slice(0, 10);
}

function dayLabel(dateStr: string): string {
  const today = todayIST();
  const yesterday = yesterdayIST();
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  const parts = dateStr.split("-");
  const y = parseInt(parts[0] ?? "2000", 10);
  const m = parseInt(parts[1] ?? "1", 10);
  const d = parseInt(parts[2] ?? "1", 10);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function monthLabel(mk: string): string {
  const parts = mk.split("-");
  const y = parseInt(parts[0] ?? "2000", 10);
  const m = parseInt(parts[1] ?? "1", 10);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

interface MonthGroup {
  key: string;
  label: string;
  days: DayRecord[];
}

function groupByMonth(days: DayRecord[]): MonthGroup[] {
  const map = new Map<string, DayRecord[]>();
  for (const d of days) {
    const mk = monthKey(d.date);
    if (!map.has(mk)) map.set(mk, []);
    map.get(mk)!.push(d);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, ds]) => ({ key, label: monthLabel(key), days: ds }));
}

// ─── SVG icons (no external dep) ─────────────────────────────────────────────

function IconChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
      <rect x="2.5" y="3.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 7h13M6 2.5v2M12 2.5v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Mini "calendar-page" tile: a soft teal month strip over the day number and
 * weekday — a quiet brand tint, not a solid block, so the list stays calm.
 */
function DateTile({ dateStr }: { dateStr: string }) {
  const dt = new Date(dateStr + "T00:00:00");
  const wd = dt.toLocaleDateString("en-IN", { weekday: "short" });
  const mon = dt.toLocaleDateString("en-IN", { month: "short" });
  return (
    <span className="flex h-14 w-12 shrink-0 flex-col items-center overflow-hidden rounded-xl bg-surface-raised ring-1 ring-line">
      <span className="w-full bg-brand/15 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wider text-brand">
        {mon}
      </span>
      <span className="flex flex-1 flex-col items-center justify-center leading-none">
        <span className="text-lg font-bold text-ink">{dt.getDate()}</span>
        <span className="text-[9px] font-medium uppercase tracking-wide text-ink-muted">{wd}</span>
      </span>
    </span>
  );
}

/** Soft teal count pill — a quiet brand accent for the patient count. */
function CountPill({ n }: { n: number }) {
  return (
    <span className="shrink-0 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
      {n}
    </span>
  );
}

/**
 * Day heading text next to the DateTile. The tile already carries the weekday +
 * day number, so this shows a single, non-redundant label: "Today"/"Yesterday"
 * (with the full date underneath) or just the full date for older days.
 */
function DayHeading({ dateStr }: { dateStr: string }) {
  const rel = dayLabel(dateStr);
  const isRelative = rel === "Today" || rel === "Yesterday";
  const full = new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate font-medium text-ink">{isRelative ? rel : full}</span>
      {isRelative && <span className="block text-xs text-ink-muted">{full}</span>}
    </span>
  );
}

/**
 * Shared page banner: a clean, soft card with a quiet teal icon badge. Simple
 * and professional — no gradients.
 */
function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-surface-raised p-4 shadow-card ring-1 ring-line/60 dark:shadow-card-dark dark:ring-line/70">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <IconCalendar />
      </span>
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RecentPage() {
  const { me, loading: meLoading } = useMe();
  const router = useRouter();
  const [dates, setDates] = useState<DayRecord[]>([]);
  const [recentPatients, setRecentPatients] = useState<RecentPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);

  const isReceptionist = me?.role === "receptionist";

  const load = useCallback(async () => {
    setLoading(true);
    if (isReceptionist) {
      const data = await apiGet<{ patients: RecentPatient[] }>("/api/recent").catch(() => ({ patients: [] }));
      setRecentPatients(data.patients);
    } else {
      const data = await apiGet<{ dates: DayRecord[] }>("/api/records/daily").catch(() => ({ dates: [] }));
      setDates(data.dates);
    }
    setLoading(false);
  }, [isReceptionist]);

  useEffect(() => {
    if (!meLoading) load();
  }, [load, meLoading]);

  if (loading || meLoading) return <PageSkeleton />;

  if (isReceptionist) {
    // Group flat list by lastVisitDate client-side
    const grouped = new Map<string, RecentPatient[]>();
    const today = todayIST();
    if (!grouped.has(today)) grouped.set(today, []);
    for (const p of recentPatients) {
      if (!grouped.has(p.lastVisitDate)) grouped.set(p.lastVisitDate, []);
      grouped.get(p.lastVisitDate)!.push(p);
    }
    const dayRecords: DayRecord[] = [...grouped.keys()]
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({
        date,
        patientCount: grouped.get(date)!.length,
        patients: grouped.get(date)!.map((p) => ({
          id: p.id,
          visitId: "",
          name: p.name,
          mobile: p.mobile,
          isEditLocked: false,
        })),
      }));

    return (
      <ReceptionistView
        days={dayRecords}
        editing={editing}
        setEditing={setEditing}
        onRefresh={load}
      />
    );
  }

  return <DoctorView dates={dates} onOpenDay={(date) => router.push(`/app/recent/${date}`)} />;
}

// ─── Doctor view (tabs: browse records + download an Excel export) ────────────

function DoctorView({
  dates,
  onOpenDay,
}: {
  dates: DayRecord[];
  onOpenDay: (date: string) => void;
}) {
  const [tab, setTab] = useState<"records" | "download">("records");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Patient records"
        subtitle="Tap a month to open its dates. Records lock 3 days after visit."
      />

      <TabBar tab={tab} setTab={setTab} />

      {tab === "records" ? (
        <RecordsList dates={dates} onOpenDay={onOpenDay} />
      ) : (
        <DownloadPanel />
      )}
    </div>
  );
}

// ─── Horizontal tabs ──────────────────────────────────────────────────────────

function TabBar({
  tab,
  setTab,
}: {
  tab: "records" | "download";
  setTab: (t: "records" | "download") => void;
}) {
  const tabs: { key: "records" | "download"; label: string }[] = [
    { key: "records", label: "Records" },
    { key: "download", label: "Download" },
  ];
  return (
    <div className="flex gap-1 rounded-2xl bg-ink/[0.04] p-1">
      {tabs.map((t) => {
        const active = tab === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
              active
                ? "bg-surface-raised text-brand shadow-card dark:shadow-card-dark"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Records list (month + day list; a day opens its own patient page) ────────

function RecordsList({
  dates,
  onOpenDay,
}: {
  dates: DayRecord[];
  onOpenDay: (date: string) => void;
}) {
  const months = groupByMonth(dates);
  // Start with every month collapsed — the list shows only months first; a
  // month's dates appear when its dropdown is tapped.
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());

  function toggleMonth(key: string) {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <>
      {months.length === 0 ? (
        <EmptyState
          icon="📁"
          title="No patient records yet"
          description="Confirmed consultations will appear here, grouped by day."
        />
      ) : (
        <div className="space-y-3">
          {months.map((month) => {
            const isMonthOpen = openMonths.has(month.key);
            const monthTotal = month.days.reduce((s, d) => s + d.patientCount, 0);
            return (
              <div className="overflow-hidden rounded-2xl bg-surface-raised shadow-card ring-1 ring-line/60 dark:shadow-card-dark dark:ring-line/70" key={month.key}>
                {/* Month header — a soft, neutral gray tint sets it gently apart
                    from the plain day rows */}
                <button
                  type="button"
                  onClick={() => toggleMonth(month.key)}
                  className={cn(
                    "flex w-full items-center gap-3 bg-ink/[0.03] px-4 py-3.5 text-left transition-colors hover:bg-ink/[0.06]",
                    isMonthOpen && "border-b border-line",
                  )}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <IconCalendar />
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold text-ink">{month.label}</span>
                    <span className="block text-xs text-ink-muted">
                      {monthTotal} {monthTotal === 1 ? "patient" : "patients"}
                    </span>
                  </span>
                  <CountPill n={monthTotal} />
                  <span className={cn("text-ink-muted transition-transform duration-200", isMonthOpen && "rotate-180")}>
                    <IconChevronDown />
                  </span>
                </button>

                {isMonthOpen && (
                  <div className="divide-y divide-line">
                    {month.days.map((day) => (
                      /* Tapping a day opens its own patient list page — a day can
                         hold 50+ patients, too many to expand inline. */
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => onOpenDay(day.date)}
                        className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface"
                      >
                        <DateTile dateStr={day.date} />
                        <DayHeading dateStr={day.date} />
                        <CountPill n={day.patientCount} />
                        <span className="text-ink-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand">
                          <IconChevronRight />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── Download panel (date-range presets → Excel export) ───────────────────────

type Preset = "today" | "yesterday" | "week" | "month" | "custom";

function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y ?? 2000, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Monday of the IST week that contains `dateStr`. */
function startOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = new Date(Date.UTC(y ?? 2000, (m ?? 1) - 1, d ?? 1)).getUTCDay(); // 0=Sun
  return shiftDate(dateStr, -((dow + 6) % 7));
}

/** Resolve a preset to an inclusive {from, to} date range in IST. */
function presetRange(preset: Preset): { from: string; to: string } {
  const today = todayIST();
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = yesterdayIST();
      return { from: y, to: y };
    }
    case "week":
      return { from: startOfWeek(today), to: today };
    case "month":
      return { from: today.slice(0, 7) + "-01", to: today };
    default:
      return { from: today, to: today };
  }
}

function rangeLabel(from: string, to: string): string {
  const fmt = (s: string) =>
    new Date(s + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return from === to ? fmt(from) : `${fmt(from)} — ${fmt(to)}`;
}

function DownloadPanel() {
  const [preset, setPreset] = useState<Preset>("today");
  const [customFrom, setCustomFrom] = useState<string>(todayIST());
  const [customTo, setCustomTo] = useState<string>(todayIST());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const range = preset === "custom" ? { from: customFrom, to: customTo } : presetRange(preset);
  const invalidCustom = preset === "custom" && (!customFrom || !customTo || customFrom > customTo);

  const options: { key: Preset; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "week", label: "This week" },
    { key: "month", label: "This month" },
    { key: "custom", label: "Custom dates" },
  ];

  async function download() {
    if (invalidCustom) {
      setError("Please pick a valid date range (start on or before end).");
      return;
    }
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch(
        `/api/records/export?from=${range.from}&to=${range.to}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Could not export records.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `patient-records_${range.from}_to_${range.to}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone("Download started — check your downloads folder.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold text-ink">Download records (Excel)</h2>
        <p className="mt-0.5 text-sm text-ink-muted">
          Export patient records with all fields to an .xlsx spreadsheet.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = preset === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => {
                setPreset(o.key);
                setDone(null);
                setError(null);
              }}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition-colors",
                active
                  ? "bg-brand/10 text-brand ring-brand/30"
                  : "bg-surface-raised text-ink-muted ring-line hover:text-ink",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {preset === "custom" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">From</span>
            <Input
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => {
                setCustomFrom(e.target.value);
                setDone(null);
              }}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">To</span>
            <Input
              type="date"
              value={customTo}
              min={customFrom || undefined}
              max={todayIST()}
              onChange={(e) => {
                setCustomTo(e.target.value);
                setDone(null);
              }}
            />
          </label>
        </div>
      )}

      <div className="rounded-xl bg-surface px-3.5 py-2.5 text-sm text-ink-muted">
        {invalidCustom ? (
          <span className="text-sos">Start date must be on or before the end date.</span>
        ) : (
          <>Selected: <span className="font-medium text-ink">{rangeLabel(range.from, range.to)}</span></>
        )}
      </div>

      {error && <p className="text-sm text-sos">{error}</p>}
      {done && <p className="text-sm text-brand">{done}</p>}

      <Button variant="brand" onClick={download} loading={busy} disabled={invalidCustom}>
        Download Excel
      </Button>
    </Card>
  );
}

// ─── Receptionist view (day accordion, last 7 days) ───────────────────────────

function ReceptionistView({
  days,
  editing,
  setEditing,
  onRefresh,
}: {
  days: DayRecord[];
  editing: string | null;
  setEditing: (id: string | null) => void;
  onRefresh: () => void;
}) {
  const [openDay, setOpenDay] = useState<string | null>(null);

  function toggleDay(date: string) {
    setOpenDay((prev) => (prev === date ? null : date));
  }

  const hasPatients = days.some((d) => d.patientCount > 0);

  return (
    <div className="space-y-4">
      <PageHeader title="Recent patients" subtitle="Last 7 days. Contact corrections only." />

      {!hasPatients ? (
        <EmptyState
          icon="📁"
          title="No recent patients"
          description="Patients seen in the last 7 days will show up here."
        />
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl bg-surface-raised shadow-card dark:shadow-card-dark dark:ring-1 dark:ring-line/70">
          {days.map((day) => {
            const isDayOpen = openDay === day.date;
            return (
              <div key={day.date}>
                <button
                  type="button"
                  onClick={() => toggleDay(day.date)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface",
                    isDayOpen && "bg-ink/[0.04]",
                  )}
                >
                  <DateTile dateStr={day.date} />
                  <DayHeading dateStr={day.date} />
                  <CountPill n={day.patientCount} />
                  <span className={cn("text-ink-muted transition-transform duration-200", isDayOpen && "rotate-180")}>
                    <IconChevronDown />
                  </span>
                </button>

                {isDayOpen && (
                  <div className="bg-surface px-3 pb-3 pt-1">
                    {day.patientCount === 0 ? (
                      <p className="py-4 text-center text-sm text-ink-muted">0 patients today</p>
                    ) : (
                      <ul className="space-y-2 pb-1">
                        {day.patients.map((p, idx) =>
                          editing === p.id ? (
                            <EditRow
                              key={p.id}
                              patient={p}
                              onCancel={() => setEditing(null)}
                              onSaved={() => { setEditing(null); onRefresh(); }}
                            />
                          ) : (
                            <li
                              key={p.id}
                              className="flex items-center justify-between gap-3 rounded-xl bg-surface-raised px-3 py-2.5 shadow-card dark:shadow-card-dark dark:ring-1 dark:ring-line/70"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-ink">{p.name}</p>
                                  <p className="text-xs text-ink-muted">{p.mobile}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand/10"
                                onClick={() => setEditing(p.id)}
                              >
                                Edit contact
                              </button>
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Contact edit row (receptionist only) ────────────────────────────────────

function EditRow({
  patient,
  onCancel,
  onSaved,
}: {
  patient: DayPatient;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(patient.name);
  const [mobile, setMobile] = useState(patient.mobile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/recent/${patient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mobile }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not save.");
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
      <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile" inputMode="numeric" />
      {error && <p className="text-sm text-sos">{error}</p>}
      <div className="flex gap-2">
        <Button variant="brand" onClick={save} disabled={busy}>{busy ? "…" : "Save"}</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-line">
        <div className="bg-surface-raised px-4 py-3">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="divide-y divide-line">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

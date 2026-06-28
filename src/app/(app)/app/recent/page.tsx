"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiGet } from "@/lib/client/api";
import { useMe } from "@/lib/client/useMe";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DayPatient {
  id: string;
  visitId: string;
  name: string;
  mobile: string;
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
function IconLock() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
      <rect x="2" y="5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 5V4a2 2 0 1 1 4 0v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
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

  return <DoctorView dates={dates} onNavigate={(id) => router.push(`/app/records/${id}`)} />;
}

// ─── Doctor view (month + day accordion) ─────────────────────────────────────

function DoctorView({
  dates,
  onNavigate,
}: {
  dates: DayRecord[];
  onNavigate: (patientId: string) => void;
}) {
  const months = groupByMonth(dates);
  const currentMonthKey = todayIST().slice(0, 7);
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set([currentMonthKey]));
  const [openDay, setOpenDay] = useState<string | null>(null);

  function toggleMonth(key: string) {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }
  function toggleDay(date: string) {
    setOpenDay((prev) => (prev === date ? null : date));
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Patient records</h1>
        <p className="text-sm text-ink-muted">Tap a date to view patients. Records lock 3 days after visit.</p>
      </div>

      {months.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-ink-muted">
          No patient records yet.
        </p>
      ) : (
        <div className="space-y-3">
          {months.map((month) => {
            const isMonthOpen = openMonths.has(month.key);
            return (
              <div key={month.key} className="overflow-hidden rounded-2xl border border-line">
                {/* Month header */}
                <button
                  type="button"
                  onClick={() => toggleMonth(month.key)}
                  className="flex w-full items-center justify-between bg-surface-raised px-4 py-3"
                >
                  <span className="font-semibold text-ink">{month.label}</span>
                  <span className="text-ink-muted">
                    {isMonthOpen ? <IconChevronDown /> : <IconChevronRight />}
                  </span>
                </button>

                {isMonthOpen && (
                  <div className="divide-y divide-line">
                    {month.days.map((day) => {
                      const isDayOpen = openDay === day.date;
                      return (
                        <div key={day.date}>
                          {/* Day header */}
                          <button
                            type="button"
                            onClick={() => toggleDay(day.date)}
                            className="flex w-full items-center justify-between px-4 py-3 hover:bg-surface-raised/60 transition-colors"
                          >
                            <div className="flex items-baseline gap-2">
                              <span className="font-medium text-ink">{dayLabel(day.date)}</span>
                              <span className="text-xs text-ink-muted">
                                {new Date(day.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                                {day.patientCount} {day.patientCount === 1 ? "patient" : "patients"}
                              </span>
                              <span className="text-ink-muted">
                                {isDayOpen ? <IconChevronDown /> : <IconChevronRight />}
                              </span>
                            </div>
                          </button>

                          {/* Patient list */}
                          {isDayOpen && (
                            <div className="bg-surface px-4 pb-3 pt-1">
                              {day.patientCount === 0 ? (
                                <p className="py-4 text-center text-sm text-ink-muted">
                                  0 patients today
                                </p>
                              ) : (
                                <ul className="space-y-2">
                                  {day.patients.map((p, idx) => (
                                    <li
                                      key={p.id}
                                      className="flex items-center justify-between rounded-xl border border-line bg-surface-raised p-3"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                                          {idx + 1}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => onNavigate(p.id)}
                                          className="text-left"
                                        >
                                          <p className="font-medium text-ink hover:underline">{p.name}</p>
                                          <p className="text-xs text-ink-muted">{p.mobile}</p>
                                        </button>
                                      </div>
                                      {p.isEditLocked ? (
                                        <span className="flex items-center gap-1 text-xs text-ink-muted">
                                          <IconLock /> Locked
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => onNavigate(p.id)}
                                          className="text-xs text-brand hover:underline"
                                        >
                                          Edit
                                        </button>
                                      )}
                                    </li>
                                  ))}
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
          })}
        </div>
      )}
    </div>
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
      <div>
        <h1 className="text-2xl font-bold text-ink">Recent patients</h1>
        <p className="text-sm text-ink-muted">Last 7 days. Contact corrections only.</p>
      </div>

      {!hasPatients ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-ink-muted">
          No recent patients.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line divide-y divide-line">
          {days.map((day) => {
            const isDayOpen = openDay === day.date;
            return (
              <div key={day.date}>
                <button
                  type="button"
                  onClick={() => toggleDay(day.date)}
                  className="flex w-full items-center justify-between px-4 py-3 hover:bg-surface-raised/60 transition-colors"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-ink">{dayLabel(day.date)}</span>
                    <span className="text-xs text-ink-muted">
                      {new Date(day.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                      {day.patientCount} {day.patientCount === 1 ? "patient" : "patients"}
                    </span>
                    <span className="text-ink-muted">
                      {isDayOpen ? <IconChevronDown /> : <IconChevronRight />}
                    </span>
                  </div>
                </button>

                {isDayOpen && (
                  <div className="bg-surface px-4 pb-3 pt-1">
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
                              className="flex items-center justify-between rounded-xl border border-line bg-surface-raised p-3"
                            >
                              <div className="flex items-center gap-3">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                                  {idx + 1}
                                </span>
                                <div>
                                  <p className="font-medium text-ink">{p.name}</p>
                                  <p className="text-xs text-ink-muted">{p.mobile}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="text-xs text-brand hover:underline"
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

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiGet } from "@/lib/client/api";

// ─── Types (mirror /api/records/daily) ───────────────────────────────────────

interface DayPatient {
  id: string;
  visitId: string;
  name: string;
  mobile: string;
  gender?: string;
  ageYears?: number;
  isEditLocked: boolean;
}

/** Compact "· 34y · M" suffix from whatever demographics we have. */
function demographics(p: DayPatient): string {
  const bits: string[] = [];
  if (typeof p.ageYears === "number") bits.push(`${p.ageYears}y`);
  if (p.gender) bits.push(p.gender.charAt(0).toUpperCase());
  return bits.join(" · ");
}
interface DayRecord {
  date: string; // YYYY-MM-DD IST
  patientCount: number;
  patients: DayPatient[];
}

// ─── IST date helpers ────────────────────────────────────────────────────────

const IST_MS = 5.5 * 60 * 60 * 1000;
function todayIST(): string {
  return new Date(Date.now() + IST_MS).toISOString().slice(0, 10);
}
function yesterdayIST(): string {
  return new Date(Date.now() + IST_MS - 86_400_000).toISOString().slice(0, 10);
}

function fullDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function relLabel(dateStr: string): string | null {
  if (dateStr === todayIST()) return "Today";
  if (dateStr === yesterdayIST()) return "Yesterday";
  return null;
}

function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Big calendar tile for the page banner: month over a large day number. */
function BigDateTile({ dateStr }: { dateStr: string }) {
  const dt = new Date(dateStr + "T00:00:00");
  const mon = dt.toLocaleDateString("en-IN", { month: "short" });
  return (
    <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand text-brand-fg shadow-sm">
      <span className="text-[11px] font-semibold uppercase tracking-wide opacity-90">{mon}</span>
      <span className="text-2xl font-bold leading-none">{dt.getDate()}</span>
    </span>
  );
}

/**
 * A single day's patient list (spec §9.1). Reached by tapping a date on the
 * Patient Records page — its own page because a busy day can hold 50+ patients,
 * too many to expand inline. Each patient box is fully tappable and opens that
 * patient's records; contact/clinical edits live on the record itself.
 */
export default function RecentDatePage() {
  const { date } = useParams<{ date: string }>();
  const router = useRouter();
  const [day, setDay] = useState<DayRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ dates: DayRecord[] }>("/api/records/daily")
      .then((d) => setDay(d.dates.find((x) => x.date === date) ?? { date, patientCount: 0, patients: [] }))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [date]);

  if (loading) return <DateSkeleton onBack={() => router.back()} />;

  const rel = relLabel(date);
  const patients = day?.patients ?? [];

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="text-sm text-ink-muted hover:underline">
        ← Back
      </button>

      {/* Banner — brand→amber wash gives the page a warm, distinct header */}
      <div className="flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-brand/12 via-brand/[0.05] to-action/10 p-4 shadow-card ring-1 ring-line/60 dark:shadow-card-dark dark:ring-line/70">
        <BigDateTile dateStr={date} />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-ink">{rel ?? fullDate(date)}</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            {rel ? `${fullDate(date)} · ` : ""}
            <span className="font-semibold text-action-hover">
              {patients.length} {patients.length === 1 ? "patient" : "patients"}
            </span>
          </p>
        </div>
      </div>

      {error && <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos">{error}</p>}

      {patients.length === 0 ? (
        <EmptyState
          icon="📁"
          title="No patients on this day"
          description="Confirmed consultations from this day would appear here."
        />
      ) : (
        <ul className="space-y-2">
          {patients.map((p, idx) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => router.push(`/app/records/${p.id}`)}
                className="group flex w-full items-center gap-3 rounded-xl bg-surface-raised px-3 py-3 text-left shadow-card ring-1 ring-line/50 transition-all hover:-translate-y-px hover:shadow-md hover:ring-brand/30 dark:shadow-card-dark dark:ring-line/70"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand/70 text-sm font-semibold text-brand-fg shadow-sm">
                  {idx + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">
                    {p.name}
                    {demographics(p) && (
                      <span className="ml-1.5 text-xs font-normal text-ink-muted">{demographics(p)}</span>
                    )}
                  </span>
                  <span className="block text-xs text-ink-muted">{p.mobile}</span>
                </span>
                <span className="text-ink-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand">
                  <IconChevronRight />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DateSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-ink-muted hover:underline">← Back</button>
      <div className="flex items-center gap-4 rounded-2xl bg-surface-raised p-4 shadow-card dark:shadow-card-dark dark:ring-1 dark:ring-line/70">
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <ul className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i} className="flex items-center gap-3 rounded-xl bg-surface-raised px-3 py-3 shadow-card dark:shadow-card-dark dark:ring-1 dark:ring-line/70">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

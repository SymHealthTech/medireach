"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { apiGet } from "@/lib/client/api";

/**
 * Patient Dues (the clinic's own outstanding-fee bookkeeping — NOT MediReach
 * subscription billing). Doctor-only: the API enforces this server-side and this
 * screen is linked only from the doctor menu. Lists every patient who still owes,
 * most-recent-first, with a forgiving name search. Tapping a row opens that
 * patient's dues detail to record a payment.
 */

interface DueRow {
  patientId: string;
  patientName: string;
  totalOutstanding: number;
  visitCount: number;
  latestDate: string;
}

function fmtDate(d: string): string {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DuesPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<DueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      const data = await apiGet<{ dues: DueRow[] }>(`/api/dues?${params.toString()}`);
      setRows(data.dues);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [q]);

  // Debounce so typing a name doesn't fire a request per keystroke.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(load, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [load]);

  const grandTotal = rows.reduce((sum, r) => sum + r.totalOutstanding, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Patient Dues"
        subtitle="Outstanding fees your patients still owe. Tap a patient to record a payment."
      />

      <Card className="space-y-3">
        <Input
          placeholder="Search by patient name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
        />
        {!loading && rows.length > 0 && (
          <p className="text-sm text-ink-muted">
            {rows.length} patient{rows.length === 1 ? "" : "s"} ·{" "}
            <span className="font-semibold text-ink">₹{grandTotal}</span> outstanding
          </p>
        )}
      </Card>

      {error && <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="alert">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-muted"><Spinner size="sm" /> Loading…</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="💸"
          title={q ? "No matching patients" : "No outstanding dues"}
          description={
            q
              ? "No patient with dues matches that name."
              : "When a patient pays partially or leaves a fee unpaid, it shows up here to settle later."
          }
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.patientId}>
              <Link
                href={`/app/dues/${r.patientId}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-surface-raised px-4 py-3 shadow-card transition-shadow hover:shadow-md dark:shadow-card-dark dark:ring-1 dark:ring-line/70"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{r.patientName || "—"}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {fmtDate(r.latestDate)}
                    {r.visitCount > 1 ? ` · ${r.visitCount} unpaid visits` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-base font-bold text-sos">₹{r.totalOutstanding}</p>
                  <p className="text-[11px] text-ink-muted">due ›</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

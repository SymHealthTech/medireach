"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { apiGet } from "@/lib/client/api";
import type { CertificateType } from "@/lib/certificate/types";

/** Short, scannable labels for the records list (the picker uses longer ones). */
const TYPE_LABEL: Record<CertificateType, string> = {
  unfit: "Unfit / Sick Leave",
  fitness_resume: "Fitness — Resume",
  fitness_job: "Fitness — Employment",
};

interface CertRecord {
  id: string;
  type: CertificateType;
  patientName: string;
  patientId: string | null;
  diagnosis: string | null;
  illness: string | null;
  jobPurpose: string | null;
  fromDate: string | null;
  toDate: string | null;
  days: number | null;
  resumeDate: string | null;
  certificateDate: string;
  hasPdf: boolean;
}

function fmt(d: string | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** The leave period / resume date summary shown on the row, per type. */
function periodSummary(c: CertRecord): string {
  if (c.type === "unfit") {
    if (c.fromDate && c.toDate) {
      const d = c.days != null ? ` · ${c.days} day${c.days === 1 ? "" : "s"}` : "";
      return `Leave: ${fmt(c.fromDate)} – ${fmt(c.toDate)}${d}`;
    }
    return "";
  }
  if (c.type === "fitness_resume") {
    return c.resumeDate ? `Resume from: ${fmt(c.resumeDate)}` : "";
  }
  return c.jobPurpose ? `Purpose: ${c.jobPurpose}` : "";
}

/**
 * Certificate Records (spec: Medical Certificates — legal retrieval). Lists every
 * certificate the doctor has issued, searchable by patient name, certificate
 * type, and issue-date range — the fields an authority query would use. Tapping a
 * row re-opens the stored PDF. Doctor-only (the API enforces this server-side;
 * this screen is linked only from the doctor menu).
 */
export default function CertificateRecordsPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"" | CertificateType>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [records, setRecords] = useState<CertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (type) params.set("type", type);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const data = await apiGet<{ certificates: CertRecord[] }>(`/api/certificates?${params.toString()}`);
      setRecords(data.certificates);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [q, type, from, to]);

  // Debounce so typing the name / adjusting filters doesn't fire a request per keystroke.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(load, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [load]);

  async function openPdf(c: CertRecord) {
    if (!c.hasPdf) return;
    // Open the tab synchronously (inside the click) so the async signed-URL
    // fetch doesn't get popup-blocked, then navigate it once resolved.
    const win = window.open("", "_blank");
    setOpeningId(c.id);
    try {
      const { url } = await apiGet<{ url: string }>(`/api/certificates/${c.id}/pdf`);
      if (win && !win.closed) win.location.href = url;
      else window.open(url, "_blank");
    } catch (e) {
      if (win && !win.closed) win.close();
      setError((e as Error).message);
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Certificate Records"
        subtitle="Every medical certificate you've issued. Retained for 3 years for legal retrieval."
      />

      {/* Search & filter */}
      <Card className="space-y-3">
        <Input
          placeholder="Search by patient name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="cr-type" className="mb-1 block text-xs font-medium uppercase tracking-wider text-ink-muted">Type</label>
            <select
              id="cr-type"
              value={type}
              onChange={(e) => setType(e.target.value as "" | CertificateType)}
              className="h-10 w-full rounded-lg border border-input bg-surface-raised px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">All types</option>
              <option value="unfit">Unfit / Sick Leave</option>
              <option value="fitness_resume">Fitness — Resume</option>
              <option value="fitness_job">Fitness — Employment</option>
            </select>
          </div>
          <div>
            <label htmlFor="cr-from" className="mb-1 block text-xs font-medium uppercase tracking-wider text-ink-muted">Issued from</label>
            <Input id="cr-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label htmlFor="cr-to" className="mb-1 block text-xs font-medium uppercase tracking-wider text-ink-muted">Issued to</label>
            <Input id="cr-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        {(q || type || from || to) && (
          <button
            type="button"
            onClick={() => { setQ(""); setType(""); setFrom(""); setTo(""); }}
            className="text-xs font-semibold text-brand hover:underline"
          >
            Clear filters
          </button>
        )}
      </Card>

      {error && <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="alert">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-muted"><Spinner size="sm" /> Loading…</div>
      ) : records.length === 0 ? (
        <EmptyState
          icon="📄"
          title="No certificates found"
          description="Certificates you issue will appear here, searchable by patient, type, and date."
        />
      ) : (
        <ul className="space-y-2">
          {records.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => openPdf(c)}
                disabled={!c.hasPdf || openingId === c.id}
                className="flex w-full items-center justify-between gap-3 rounded-xl bg-surface-raised px-4 py-3 text-left shadow-card transition-shadow hover:shadow-md disabled:cursor-default disabled:opacity-70 dark:shadow-card-dark dark:ring-1 dark:ring-line/70"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-ink">{c.patientName || "—"}</span>
                    <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                      {TYPE_LABEL[c.type]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Issued {fmt(c.certificateDate)}
                    {periodSummary(c) ? ` · ${periodSummary(c)}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-brand">
                  {openingId === c.id ? "Opening…" : c.hasPdf ? "View PDF ↗" : "No PDF"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

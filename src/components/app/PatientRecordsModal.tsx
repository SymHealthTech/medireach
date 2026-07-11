"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { apiGet } from "@/lib/client/api";
import { isQuickServicePurpose, isCertificatePurpose, visitPurposeLabel } from "@/lib/constants";

interface OE {
  bp?: string; weight?: string; height?: string; pulse?: string; temp?: string;
  rr?: string; pa?: string; cvs?: string; cns?: string; bsl?: string; lmp?: string;
}
interface VisitHistoryRecord {
  _id: string;
  type: string;
  visitMode?: string;
  confirmedAt?: string;
  createdAt: string;
  co?: string; ho?: string; fh?: string;
  oe?: OE;
  procedure?: {
    nebuliserAgent?: string; injectionDetails?: string;
    woundSpec?: string; mechanismOfInjury?: string; dressingNotes?: string;
  };
  diagnosis?: string;
  provisionalDiagnosis?: string;
  followUp?: string;
  medicines?: Array<{ name: string; type?: string; clinicalText?: string; dosage?: string; frequency?: string }>;
  notes?: string;
  fees?: number;
  reportPublicIds?: string[];
}

const OE_LABELS: [keyof OE, string][] = [
  ["height", "Height"], ["weight", "Weight"], ["temp", "Temp"], ["bp", "BP"],
  ["pulse", "Pulse"], ["pa", "P/A"], ["cvs", "CVS"], ["cns", "CNS"],
  ["rr", "RR"], ["bsl", "BSL"], ["lmp", "LMP"],
];
const OE_UNITS: Partial<Record<keyof OE, string>> = { temp: "°F", bp: "mmHg", pulse: "/min", rr: "/min", bsl: "mg/dL" };
const PROC_LABELS: [keyof NonNullable<VisitHistoryRecord["procedure"]>, string][] = [
  ["nebuliserAgent", "Nebulising agent"], ["injectionDetails", "Injection details"],
  ["woundSpec", "Wound specifications"], ["mechanismOfInjury", "Mechanism of injury"],
  ["dressingNotes", "Dressing notes"],
];

function fmtOE(key: keyof OE, value?: string): string {
  if (!value) return "";
  const unit = OE_UNITS[key];
  return unit ? `${value} ${unit}` : value;
}

/**
 * Patient records/history in a modal — self-fetching the visit history (up to a
 * year). The same "Records" affordance the consult page offers, shared so every
 * visit screen shows history identically. `excludeVisitId` drops the visit
 * currently being worked on from the list.
 */
export function PatientRecordsModal({
  open,
  onClose,
  patientId,
  excludeVisitId,
}: {
  open: boolean;
  onClose: () => void;
  patientId: string | null;
  excludeVisitId?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<VisitHistoryRecord[] | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || records !== null || !patientId) return;
    setLoading(true);
    apiGet<{ visits: VisitHistoryRecord[] }>(`/api/patients/${patientId}/history`)
      .then((d) => setRecords(d.visits.filter((v) => v._id !== excludeVisitId)))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [open, records, patientId, excludeVisitId]);

  if (!open) return null;

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex w-full max-w-2xl flex-col gap-3 overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-xl sm:max-h-[85vh] sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-ink">Patient Records</p>
          <button onClick={onClose} className="text-lg text-ink-muted hover:text-sos" aria-label="Close">✕</button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-ink-muted"><Spinner size="sm" /> Loading…</div>
        )}
        {!loading && records?.length === 0 && (
          <p className="text-sm text-ink-muted">No previous records found.</p>
        )}
        {!loading && records && records.length > 0 && (
          <div className="space-y-2">
            {records.map((v) => {
              const isOpen = expandedIds.has(v._id);
              const dateStr = new Date(v.confirmedAt ?? v.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
              });
              const activeMeds = (v.medicines ?? []).filter((m) => m.name);
              const oeKeys = v.oe ? OE_LABELS.filter(([k]) => (v.oe![k] ?? "").trim()) : [];
              const procRows = v.procedure ? PROC_LABELS.filter(([k]) => (v.procedure![k] ?? "").trim()) : [];

              return (
                <div key={v._id} className="overflow-hidden rounded-xl border border-line">
                  <button
                    className="flex w-full items-center justify-between bg-surface-raised px-3 py-2.5 text-left"
                    onClick={() => toggle(v._id)}
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-sm font-semibold text-ink">{dateStr}</span>
                      <span className="rounded-md bg-line/60 px-1.5 py-0.5 text-[11px] font-medium capitalize text-ink-muted">{v.type}</span>
                      {isQuickServicePurpose(v.visitMode) && (
                        <span className="rounded-md bg-success/15 px-1.5 py-0.5 text-[11px] font-medium text-success">
                          {isCertificatePurpose(v.visitMode) ? "📄 " : ""}{visitPurposeLabel(v.visitMode)}
                        </span>
                      )}
                      {v.diagnosis && <span className="text-[11px] text-ink-muted">· {v.diagnosis}</span>}
                    </div>
                    <span className="ml-2 shrink-0 text-[11px] text-ink-muted">{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {isOpen && (
                    <div className="space-y-2.5 px-3 py-3 text-sm">
                      {v.co && <HistoryRow label="C/O" value={v.co} />}
                      {v.ho && <HistoryRow label="P/H/O" value={v.ho} />}
                      {v.fh && <HistoryRow label="F/H" value={v.fh} />}

                      {oeKeys.length > 0 && (
                        <div>
                          <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-ink-muted">O/E</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                            {oeKeys.map(([key, label]) => (
                              <span key={key} className="text-ink"><span className="font-medium">{label}:</span> {fmtOE(key, v.oe![key])}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {procRows.map(([key, label]) => (
                        <HistoryRow key={key} label={label} value={v.procedure![key]!} />
                      ))}

                      {v.provisionalDiagnosis && <HistoryRow label="Provisional Dx" value={v.provisionalDiagnosis} />}
                      {v.diagnosis && <HistoryRow label="Diagnosis" value={v.diagnosis} />}

                      {activeMeds.length > 0 && (
                        <div>
                          <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-ink-muted">Medicines</p>
                          <ol className="list-decimal space-y-0.5 pl-4">
                            {activeMeds.map((m, i) => (
                              <li key={i} className="text-ink">
                                {m.clinicalText || `${m.type ? m.type + ". " : ""}${m.name}${m.dosage ? " " + m.dosage : ""}${m.frequency ? " — " + m.frequency : ""}`}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {v.followUp && <HistoryRow label="Follow-up" value={v.followUp} />}
                      {v.notes && <HistoryRow label="Notes" value={v.notes} />}
                      {v.fees != null && <HistoryRow label="Fees" value={`₹${v.fees}`} />}
                      {(v.reportPublicIds?.length ?? 0) > 0 && (
                        <p className="text-[11px] text-ink-muted">{v.reportPublicIds!.length} report(s) on file</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="whitespace-pre-wrap text-sm text-ink">{value}</p>
    </div>
  );
}

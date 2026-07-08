"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/Spinner";
import { apiGet, apiPost } from "@/lib/client/api";
import type { DuesStatus } from "@/lib/constants";

/**
 * Per-patient dues detail (the Patient Dues feature — clinic fee bookkeeping,
 * separate from MediReach subscription billing). Doctor-only. Shows the total
 * outstanding, a per-visit breakdown, and the payment history. Clearing a due
 * happens ONLY here: "Record payment" settles a visit (full or partial) and adds
 * a history entry; "Edit fee" corrects a mistyped amount.
 */

interface DueItem {
  visitId: string;
  date: string;
  diagnosis: string | null;
  feeAmount: number;
  amountPaid: number;
  dueAmount: number;
  status: DuesStatus;
}
interface PaymentEntry {
  visitId: string;
  amount: number;
  at: string;
  note: string | null;
}
interface DuesDetail {
  patient: { id: string; name: string; mobile: string };
  totalOutstanding: number;
  items: DueItem[];
  history: PaymentEntry[];
}

function fmtDate(d: string): string {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_STYLE: Record<DuesStatus, string> = {
  paid: "bg-success/15 text-success",
  partial: "bg-action/15 text-action",
  unpaid: "bg-sos/15 text-sos",
};

export default function DuesDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const router = useRouter();
  // Where "Back" returns to — the consult page keeps its in-progress state via a
  // draft save, so returning lands the doctor right where they left off.
  const from = useSearchParams().get("from");

  const [data, setData] = useState<DuesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The single open inline action (settle or adjust) for one visit at a time.
  const [action, setAction] = useState<{ visitId: string; mode: "settle" | "adjust"; value: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await apiGet<DuesDetail>(`/api/dues/${patientId}`);
      setData(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  function openAction(item: DueItem, mode: "settle" | "adjust") {
    setError(null);
    setAction({
      visitId: item.visitId,
      mode,
      value: String(mode === "settle" ? item.dueAmount : item.feeAmount),
    });
  }

  async function submitAction() {
    if (!action) return;
    const amount = Number(action.value);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Enter a valid amount.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body =
        action.mode === "settle"
          ? { action: "settle", visitId: action.visitId, amount }
          : { action: "adjust", visitId: action.visitId, feeAmount: amount };
      await apiPost(`/api/dues/${patientId}`, body);
      setAction(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <PageHeader
        title={data?.patient.name || "Patient Dues"}
        subtitle={data?.patient.mobile ? `Mobile: ${data.patient.mobile}` : undefined}
        actions={
          <Button variant="ghost" onClick={() => router.push(from || "/app/dues")}>
            ← Back
          </Button>
        }
      />

      {error && <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="alert">{error}</p>}

      {/* Total outstanding */}
      <Card className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Total outstanding</p>
          <p className="mt-1 text-3xl font-bold text-sos">₹{data?.totalOutstanding ?? 0}</p>
        </div>
        {(data?.totalOutstanding ?? 0) === 0 && (
          <span className="rounded-full bg-success/15 px-3 py-1 text-sm font-semibold text-success">All settled ✓</span>
        )}
      </Card>

      {/* Per-visit breakdown */}
      <div>
        <p className="mb-2 text-sm font-semibold text-ink">Per-visit breakdown</p>
        {!data || data.items.length === 0 ? (
          <EmptyState icon="🧾" title="No dues recorded" description="This patient has no dues on file." />
        ) : (
          <ul className="space-y-2">
            {data.items.map((item) => {
              const isOpen = action?.visitId === item.visitId;
              return (
                <li key={item.visitId} className="rounded-xl border border-line bg-surface-raised">
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-ink">{fmtDate(item.date)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[item.status]}`}>
                          {item.status}
                        </span>
                        {item.diagnosis && <span className="text-[11px] text-ink-muted">· {item.diagnosis}</span>}
                      </div>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        Fee ₹{item.feeAmount} · Paid ₹{item.amountPaid}
                        {item.dueAmount > 0 && <> · <span className="font-semibold text-sos">Due ₹{item.dueAmount}</span></>}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 border-t border-line px-4 py-2">
                    {item.dueAmount > 0 && (
                      <button
                        type="button"
                        onClick={() => openAction(item, "settle")}
                        className="text-xs font-semibold text-brand hover:underline"
                      >
                        Record payment
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openAction(item, "adjust")}
                      className="text-xs font-semibold text-ink-muted hover:underline"
                    >
                      Edit fee
                    </button>
                  </div>

                  {/* Inline form */}
                  {isOpen && (
                    <div className="space-y-2 border-t border-line px-4 py-3">
                      <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted">
                        {action!.mode === "settle" ? "Amount received (₹)" : "Correct fee (₹)"}
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          inputMode="numeric"
                          autoFocus
                          value={action!.value}
                          onChange={(e) => setAction((a) => (a ? { ...a, value: e.target.value.replace(/[^\d]/g, "") } : a))}
                          className="max-w-[10rem]"
                        />
                        <Button size="sm" variant="brand" onClick={submitAction} loading={saving}>
                          {action!.mode === "settle" ? "Record" : "Save"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setAction(null)} disabled={saving}>
                          Cancel
                        </Button>
                      </div>
                      {action!.mode === "settle" && (
                        <p className="text-[11px] text-ink-muted">
                          Up to ₹{item.dueAmount} outstanding. A partial amount leaves the rest as a due.
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Payment history */}
      {data && data.history.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Payment history</p>
          <Card className="divide-y divide-line p-0">
            {data.history.map((p, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-ink">₹{p.amount}</p>
                  <p className="text-[11px] text-ink-muted">
                    {fmtDate(p.at)}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                <span className="text-[11px] text-ink-muted">received</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

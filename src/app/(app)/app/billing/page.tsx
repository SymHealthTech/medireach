"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { apiGet, apiPost } from "@/lib/client/api";
import { openCheckout } from "@/lib/client/razorpay";

interface Invoice {
  id: string;
  cycleNumber: number;
  periodStart: string;
  periodEnd: string;
  patientCount: number;
  amount: number;
  status: "pending" | "paid" | "overdue" | "void";
  dueDate: string;
  graceEndDate: string;
  payer: "doctor" | "sponsor";
}
interface Summary {
  accountStatus: string;
  currentCycle: { cycleNumber: number; periodStart: string; periodEnd: string; patientCountSoFar: number; projectedCharge: number };
  invoices: Invoice[];
}
interface Collection {
  today: { total: number; count: number };
  cycle: { total: number; count: number };
}

/**
 * Billing screen (spec §12): current plan & status, live cycle projection,
 * invoice history with pay action, the clinic's own collection sheet (§9.4),
 * and a low-prominence Unsubscribe control at the bottom (§12).
 */
export default function BillingPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [s, c] = await Promise.all([
      apiGet<Summary>("/api/billing").catch(() => null),
      apiGet<Collection>("/api/billing/collection").catch(() => null),
    ]);
    setSummary(s);
    setCollection(c);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function pay(invoiceId: string) {
    setMsg(null);
    setPayingId(invoiceId);
    try {
      const order = await apiPost<{ orderId: string; amount: number; keyId: string; prefill: Record<string, string> }>(
        "/api/billing/pay/order",
        { invoiceId },
      );
      const result = await openCheckout({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        name: "MediReach",
        description: "Subscription invoice",
        prefill: order.prefill,
      });
      await apiPost("/api/billing/pay/verify", {
        invoiceId,
        orderId: result.razorpay_order_id,
        paymentId: result.razorpay_payment_id,
        signature: result.razorpay_signature,
      });
      setMsg("Payment successful.");
      load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setPayingId(null);
    }
  }

  async function unsubscribe() {
    if (!confirm("Cancel your subscription? Your access continues until the end of the current paid cycle. Your data is kept and you can rejoin anytime.")) return;
    try {
      const { effectiveAt } = await apiPost<{ effectiveAt: string }>("/api/billing/unsubscribe", { cancel: true });
      setMsg(`Subscription will end on ${new Date(effectiveAt).toLocaleDateString("en-IN")}.`);
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  if (!summary) return <p className="text-ink-muted">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Billing</h1>
      {msg && <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand">{msg}</p>}

      {summary.accountStatus === "paused" && (
        <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos">
          Access is paused due to a pending payment. Pay the outstanding invoice below to resume immediately — your data is safe.
        </p>
      )}

      <Card className="space-y-1">
        <p className="text-sm text-ink-muted">Current cycle #{summary.currentCycle.cycleNumber}</p>
        <p className="text-3xl font-bold text-ink">₹{summary.currentCycle.projectedCharge}</p>
        <p className="text-sm text-ink-muted">
          {summary.currentCycle.patientCountSoFar} patients so far · projected ·{" "}
          {new Date(summary.currentCycle.periodEnd).toLocaleDateString("en-IN")} due
        </p>
      </Card>

      {collection && (
        <Card className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-ink-muted">Today&apos;s collection</p>
            <p className="text-xl font-bold text-ink">₹{collection.today.total}</p>
            <p className="text-xs text-ink-muted">{collection.today.count} patients</p>
          </div>
          <div>
            <p className="text-sm text-ink-muted">This cycle</p>
            <p className="text-xl font-bold text-ink">₹{collection.cycle.total}</p>
            <p className="text-xs text-ink-muted">{collection.cycle.count} patients</p>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        <h2 className="font-semibold text-ink">Invoices</h2>
        {summary.invoices.length === 0 ? (
          <p className="text-sm text-ink-muted">No invoices yet.</p>
        ) : (
          summary.invoices.map((inv) => (
            <Card key={inv.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">Cycle #{inv.cycleNumber} · ₹{inv.amount}</p>
                <p className="text-sm text-ink-muted">
                  {inv.patientCount} patients ·{" "}
                  <StatusBadge status={inv.status} /> · {inv.payer === "sponsor" ? "Sponsor" : "You"}
                </p>
              </div>
              {(inv.status === "pending" || inv.status === "overdue") && (
                <Button variant="primary" onClick={() => pay(inv.id)} disabled={payingId === inv.id}>
                  {payingId === inv.id ? "…" : "Pay"}
                </Button>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Low-prominence unsubscribe control (§12). */}
      <div className="pt-6 text-center">
        <button onClick={unsubscribe} className="text-sm text-ink-muted underline hover:text-sos">
          Cancel subscription
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "paid" ? "text-success" : status === "overdue" ? "text-sos" : "text-ink-muted";
  return <span className={color}>{status}</span>;
}

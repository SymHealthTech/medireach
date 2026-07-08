"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { InvoiceDocument, type InvoiceClinic, type InvoiceDocumentProps } from "@/components/app/InvoiceDocument";
import type { TaxBreakup } from "@/lib/billing/tax";
import { apiGet, apiPost } from "@/lib/client/api";
import { openCheckout } from "@/lib/client/razorpay";
import { clearMeCache } from "@/lib/client/useMe";
import { cn } from "@/lib/cn";

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
  tax: TaxBreakup;
}
interface Summary {
  accountStatus: string;
  tier: "starter" | "pro";
  currentCycleTier: "starter" | "pro";
  tierChangePending: { toTier: "starter" | "pro"; effectiveAtCycleStart: string } | null;
  clinic: InvoiceClinic;
  currentCycle: {
    cycleNumber: number;
    periodStart: string;
    periodEnd: string;
    patientCountSoFar: number;
    projectedCharge: number;
    payer: "doctor" | "sponsor";
    tax: TaxBreakup;
  };
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
  const [preview, setPreview] = useState<InvoiceDocumentProps | null>(null);
  const [tierBusy, setTierBusy] = useState(false);

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

  async function upgrade() {
    if (!confirm("Upgrade to Pro? Voice dictation and AI structuring unlock immediately. This cycle keeps its ₹499 Starter charge; Pro per-patient billing begins next cycle.")) return;
    setTierBusy(true);
    setMsg(null);
    try {
      await apiPost("/api/billing/tier", { action: "upgrade" });
      clearMeCache(); // tier changed — force a fresh /api/me so voice/AI unlock app-wide
      setMsg("Upgraded to Pro — voice and AI are now available.");
      load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setTierBusy(false);
    }
  }

  async function downgrade() {
    if (!confirm("Downgrade to Starter? You'll lose voice dictation and AI features. You keep them until the end of the current cycle, then move to the flat ₹499 Starter plan.")) return;
    setTierBusy(true);
    setMsg(null);
    try {
      const { tierChangePending } = await apiPost<{ tierChangePending: { effectiveAtCycleStart: string } | null }>(
        "/api/billing/tier",
        { action: "downgrade" },
      );
      const when = tierChangePending ? new Date(tierChangePending.effectiveAtCycleStart).toLocaleDateString("en-IN") : "the next cycle";
      setMsg(`Downgrade scheduled for ${when}. Voice and AI stay active until then.`);
      load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setTierBusy(false);
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

  if (!summary) return <BillingSkeleton />;

  const clinic = summary.clinic;

  // The in-progress cycle billed up to today — a provisional "Sample".
  function sampleInvoiceProps(): InvoiceDocumentProps {
    const c = summary!.currentCycle;
    return {
      clinic,
      invoiceNumber: `SAMPLE-${c.cycleNumber}`,
      cycleNumber: c.cycleNumber,
      periodStart: c.periodStart,
      periodEnd: new Date(),
      issueDate: new Date(),
      patientCount: c.patientCountSoFar,
      amount: c.projectedCharge,
      tax: c.tax,
      watermark: "Sample",
    };
  }

  // A finalised invoice — issued at cycle close (periodEnd).
  function realInvoiceProps(inv: Invoice): InvoiceDocumentProps {
    const watermark =
      inv.status === "paid" ? "Paid" : inv.status === "overdue" ? "Overdue" : inv.status === "void" ? "Void" : undefined;
    return {
      clinic,
      invoiceNumber: `INV-${inv.cycleNumber}`,
      cycleNumber: inv.cycleNumber,
      periodStart: inv.periodStart,
      periodEnd: inv.periodEnd,
      issueDate: inv.periodEnd,
      patientCount: inv.patientCount,
      amount: inv.amount,
      tax: inv.tax,
      watermark,
    };
  }

  const paused = summary.accountStatus === "paused";

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" subtitle="Your plan, invoices, and payments." />

      {msg && (
        <div className="flex items-start gap-2 rounded-xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand">
          <span aria-hidden>✓</span>
          <p>{msg}</p>
        </div>
      )}

      {paused && (
        <div className="flex items-start gap-3 rounded-xl border border-sos/25 bg-sos/10 px-4 py-3 text-sm text-sos">
          <span className="mt-0.5 text-base" aria-hidden>⚠️</span>
          <p>
            Access is paused due to a pending payment. Pay the outstanding invoice below to resume immediately — your data is safe.
          </p>
        </div>
      )}

      {/* Hero — live cycle projection */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand/70 p-6 text-brand-fg shadow-card">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-white/[0.07]" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-brand-fg/80">Current cycle #{summary.currentCycle.cycleNumber}</p>
            <p className="mt-1 text-4xl font-bold tracking-tight">₹{summary.currentCycle.projectedCharge}</p>
            <p className="mt-1 text-sm text-brand-fg/80">
              {summary.currentCycle.patientCountSoFar} patients so far · projected
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold backdrop-blur",
              paused ? "bg-sos text-white" : "bg-white/20 text-brand-fg",
            )}
          >
            {paused ? "Paused" : "Active"}
          </span>
        </div>
        <div className="relative mt-5 flex items-center gap-2 border-t border-white/15 pt-4 text-sm text-brand-fg/90">
          <span aria-hidden>🗓️</span>
          Due {new Date(summary.currentCycle.periodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      {/* Plan / tier — current plan, what it includes, and the switch control. */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-ink">
                {summary.tier === "pro" ? "Pro plan" : "Starter plan"}
              </p>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                summary.tier === "pro" ? "bg-brand/10 text-brand" : "bg-line/60 text-ink-muted",
              )}>
                {summary.tier === "pro" ? "Voice + AI" : "Typing only"}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              {summary.tier === "pro"
                ? "Voice dictation and AI structuring, billed per patient (₹299 minimum)."
                : "Type consultations with keyword shortcuts. Flat ₹499 per cycle."}
            </p>
          </div>
          {summary.tier === "starter" || summary.tierChangePending?.toTier === "starter" ? (
            <Button variant="primary" size="md" onClick={upgrade} disabled={tierBusy}>
              {tierBusy ? "…" : summary.tierChangePending?.toTier === "starter" ? "Keep Pro" : "Upgrade to Pro"}
            </Button>
          ) : (
            <Button variant="outline" size="md" onClick={downgrade} disabled={tierBusy}>
              {tierBusy ? "…" : "Downgrade"}
            </Button>
          )}
        </div>
        {summary.tierChangePending?.toTier === "starter" && (
          <p className="rounded-xl bg-action/10 px-3 py-2 text-sm text-action">
            ⏳ Scheduled to switch to Starter on{" "}
            {new Date(summary.tierChangePending.effectiveAtCycleStart).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.
            You keep voice and AI until then.
          </p>
        )}
      </Card>

      {collection && (
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon="💵"
            tint="success"
            label="Today's collection"
            amount={collection.today.total}
            caption={`${collection.today.count} patients`}
          />
          <StatCard
            icon="📈"
            tint="brand"
            label="This cycle"
            amount={collection.cycle.total}
            caption={`${collection.cycle.count} patients`}
          />
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">Invoices</h2>
          {summary.invoices.length > 0 && (
            <span className="rounded-full bg-line/60 px-2.5 py-0.5 text-xs font-medium text-ink-muted">
              {summary.invoices.length}
            </span>
          )}
        </div>

        {/* Preview the in-progress cycle billed up to today, as a full invoice. */}
        <button
          onClick={() => setPreview(sampleInvoiceProps())}
          className="group flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-brand/40 bg-brand/[0.04] px-5 py-4 text-left transition-colors hover:border-brand/70 hover:bg-brand/[0.08]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-lg text-brand" aria-hidden>
              🧾
            </span>
            <div>
              <p className="font-medium text-ink">View invoice up to today</p>
              <p className="text-sm text-ink-muted">Live total for the current cycle</p>
            </div>
          </div>
          <span className="text-lg text-brand transition-transform group-hover:translate-x-0.5" aria-hidden>
            →
          </span>
        </button>

        {summary.invoices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-surface-raised px-5 py-8 text-center">
            <p className="text-sm text-ink-muted">No finalised invoices yet.</p>
            <p className="mt-1 text-xs text-ink-subtle">Your first invoice is issued when this cycle closes.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {summary.invoices.map((inv) => (
              <Card key={inv.id} className="flex items-center justify-between gap-3 transition-shadow hover:shadow-md">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink">₹{inv.amount}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    Cycle #{inv.cycleNumber} · {inv.patientCount} patients · {inv.payer === "sponsor" ? "Sponsor" : "You"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPreview(realInvoiceProps(inv))}>
                    View
                  </Button>
                  {(inv.status === "pending" || inv.status === "overdue") && (
                    <Button variant="primary" size="sm" onClick={() => pay(inv.id)} disabled={payingId === inv.id}>
                      {payingId === inv.id ? "…" : "Pay"}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Low-prominence unsubscribe control, bottom-left (§12). */}
      <div className="border-t border-line pt-6">
        <button onClick={unsubscribe} className="text-sm text-ink-muted underline decoration-line underline-offset-4 transition-colors hover:text-sos hover:decoration-sos">
          Cancel subscription
        </button>
      </div>

      {/* Invoice preview — same design sent to the doctor later. Shared by the
          "up to today" sample and each finalised invoice. */}
      <Modal open={preview !== null} onClose={() => setPreview(null)} className="max-w-xl">
        {preview && (
          <div className="overflow-hidden rounded-2xl">
            <InvoiceDocument {...preview} />
            <div className="flex items-center justify-between gap-3 border-t border-line bg-surface-raised p-4">
              <p className="text-xs text-ink-muted">
                {preview.watermark === "Sample"
                  ? "Provisional total up to today — final invoice is issued at cycle end."
                  : "Computer-generated invoice from MediReach."}
              </p>
              <Button variant="outline" size="sm" onClick={() => setPreview(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function BillingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-24" />

      <Skeleton className="h-40 w-full rounded-2xl" />

      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <Card key={i} className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-14" />
            </div>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        <Skeleton className="h-5 w-20" />
        {[0, 1, 2].map((i) => (
          <Card key={i} className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-52" />
            </div>
            <Skeleton className="h-9 w-16 rounded-xl" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  tint,
  label,
  amount,
  caption,
}: {
  icon: string;
  tint: "success" | "brand";
  label: string;
  amount: number;
  caption: string;
}) {
  const chip = tint === "success" ? "bg-success/10 text-success" : "bg-brand/10 text-brand";
  return (
    <Card className="flex items-start gap-3">
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg", chip)} aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-ink-muted">{label}</p>
        <p className="text-xl font-bold text-ink">₹{amount}</p>
        <p className="text-xs text-ink-subtle">{caption}</p>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-success/10 text-success",
    overdue: "bg-sos/10 text-sos",
    pending: "bg-action/15 text-action",
    void: "bg-line/60 text-ink-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
        styles[status] ?? styles.pending,
      )}
    >
      {status}
    </span>
  );
}

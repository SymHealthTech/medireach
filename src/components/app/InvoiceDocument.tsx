import { BILLING, TAX, type Tier } from "@/lib/constants";
import type { TaxBreakup } from "@/lib/billing/tax";

export interface InvoiceClinic {
  doctorName: string;
  clinicName: string;
  clinicAddress: string;
  appId: string;
  mobile: string;
  email: string;
}

export interface InvoiceDocumentProps {
  clinic: InvoiceClinic;
  invoiceNumber: string;
  cycleNumber: number;
  /** Plan this cycle was billed at: Starter (flat fee) or Pro (per-patient). */
  tier: Tier;
  periodStart: string | Date;
  periodEnd: string | Date;
  issueDate: string | Date;
  patientCount: number;
  amount: number;
  /** GST breakup (inclusive pricing). When absent or disabled, no tax is shown. */
  tax?: TaxBreakup;
  /** "SAMPLE" for the up-to-today preview, "PAID"/"DUE" etc. for real ones. */
  watermark?: string;
}

const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/**
 * MediReach subscription invoice — the canonical printable/shareable invoice
 * design (spec §11/§12). Rendered as a fixed-color "paper" document (not themed)
 * so the same markup can be exported to an image/PDF for WhatsApp delivery.
 * Used both for the "sample invoice up to today" preview and real invoices.
 */
export function InvoiceDocument({
  clinic,
  invoiceNumber,
  cycleNumber,
  tier,
  periodStart,
  periodEnd,
  issueDate,
  patientCount,
  amount,
  tax,
  watermark,
}: InvoiceDocumentProps) {
  const isPro = tier === "pro";
  // Pro line-item breakdown that reconciles to `amount` (spec §11: greater of
  // the monthly minimum or the per-patient total). Unused for Starter, which is
  // a single flat cycle fee regardless of patient count.
  const perPatientTotal =
    patientCount <= BILLING.DISCOUNT_THRESHOLD
      ? patientCount * BILLING.PER_PATIENT_INR
      : BILLING.DISCOUNT_THRESHOLD * BILLING.PER_PATIENT_INR +
        (patientCount - BILLING.DISCOUNT_THRESHOLD) * BILLING.PER_PATIENT_DISCOUNTED_INR;
  const minimumApplied = isPro && amount > perPatientTotal;
  const taxed = Boolean(tax?.enabled);

  return (
    <div id="invoice-print" className="relative overflow-hidden bg-white p-6 text-gray-900 sm:p-8">
      {watermark && (
        <span className="pointer-events-none absolute -right-6 top-10 select-none text-6xl font-black uppercase tracking-widest text-gray-900/[0.06] sm:text-7xl">
          {watermark}
        </span>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <p className="text-lg font-bold leading-tight text-gray-900">
            {clinic.clinicName || clinic.doctorName || "Clinic"}
          </p>
          {clinic.clinicName && clinic.doctorName && (
            <p className="text-sm text-gray-600">{clinic.doctorName}</p>
          )}
          {clinic.clinicAddress && (
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-gray-500">{clinic.clinicAddress}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {[clinic.mobile, clinic.email].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold tracking-tight text-teal-700">{TAX.SELLER_LEGAL_NAME || "MediReach"}</p>
          <p className="mt-2 text-xs uppercase tracking-wide text-gray-400">{taxed ? "Tax Invoice" : "Invoice"}</p>
          <p className="font-mono text-sm text-gray-900">{invoiceNumber}</p>
          <p className="mt-1 inline-block rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700">
            {isPro ? "Pro plan" : "Starter plan"}
          </p>
          {taxed && TAX.SELLER_GSTIN && (
            <p className="mt-1 text-[10px] text-gray-500">
              GSTIN: <span className="font-mono">{TAX.SELLER_GSTIN}</span>
            </p>
          )}
          {taxed && <p className="text-[10px] text-gray-500">SAC: {tax!.sac}</p>}
        </div>
      </div>

      {/* Meta */}
      <div className="space-y-2 py-4">
        <div className="flex items-start justify-between gap-4">
          <Meta label="Issue date" value={fmtDate(issueDate)} />
          <Meta label="Billing cycle" value={`#${cycleNumber}`} align="right" />
        </div>
        <div className="flex items-start justify-between gap-4">
          <Meta label="Period" value={`${fmtDate(periodStart)} – ${fmtDate(periodEnd)}`} />
          {clinic.appId && <Meta label="Account" value={clinic.appId} align="right" />}
        </div>
      </div>

      {/* Line items */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="py-2 font-medium">Description</th>
            <th className="py-2 text-right font-medium">Qty</th>
            <th className="py-2 text-right font-medium">Rate</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {isPro ? (
            <>
              <tr className="border-b border-gray-100">
                <td className="py-3 pr-2">
                  Consultations
                  <span className="block text-xs text-gray-500">Confirmed visits in cycle</span>
                </td>
                <td className="py-3 text-right tabular-nums">{patientCount}</td>
                <td className="py-3 text-right tabular-nums">{inr(BILLING.PER_PATIENT_INR)}</td>
                <td className="py-3 text-right tabular-nums">{inr(perPatientTotal)}</td>
              </tr>
              {minimumApplied && (
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-2" colSpan={3}>
                    Monthly minimum adjustment
                    <span className="block text-xs text-gray-500">
                      Minimum charge of {inr(BILLING.MONTHLY_MINIMUM_INR)} applies
                    </span>
                  </td>
                  <td className="py-3 text-right tabular-nums">{inr(amount - perPatientTotal)}</td>
                </tr>
              )}
            </>
          ) : (
            <tr className="border-b border-gray-100">
              <td className="py-3 pr-2">
                Starter plan — cycle fee
                <span className="block text-xs text-gray-500">
                  Flat rate · {patientCount} consultation{patientCount === 1 ? "" : "s"} in cycle
                </span>
              </td>
              <td className="py-3 text-right tabular-nums">1</td>
              <td className="py-3 text-right tabular-nums">{inr(BILLING.STARTER_FLAT_INR)}</td>
              <td className="py-3 text-right tabular-nums">{inr(BILLING.STARTER_FLAT_INR)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Total */}
      <div className="mt-5 flex justify-end">
        <div className="w-full max-w-[17rem] space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>{taxed ? "Taxable value" : "Subtotal"}</span>
            <span className="tabular-nums">{inr(taxed ? tax!.taxableValue : amount)}</span>
          </div>
          {taxed && tax!.interState && (
            <div className="flex justify-between text-gray-600">
              <span>IGST @ {tax!.rate}%</span>
              <span className="tabular-nums">{inr(tax!.igst)}</span>
            </div>
          )}
          {taxed && !tax!.interState && (
            <>
              <div className="flex justify-between text-gray-600">
                <span>CGST @ {tax!.rate / 2}%</span>
                <span className="tabular-nums">{inr(tax!.cgst)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>SGST @ {tax!.rate / 2}%</span>
                <span className="tabular-nums">{inr(tax!.sgst)}</span>
              </div>
            </>
          )}
          <div className="mt-2 flex justify-between border-t border-gray-300 pt-2 text-base font-bold text-gray-900">
            <span>Total due</span>
            <span className="tabular-nums">{inr(amount)}</span>
          </div>
          {taxed && (
            <p className="pt-1 text-right text-[10px] text-gray-400">Prices inclusive of GST</p>
          )}
        </div>
      </div>

      <p className="mt-6 border-t border-gray-200 pt-4 text-xs leading-relaxed text-gray-500">
        {isPro ? (
          <>
            Billed per confirmed consultation at {inr(BILLING.PER_PATIENT_INR)} each (
            {inr(BILLING.PER_PATIENT_DISCOUNTED_INR)} beyond {BILLING.DISCOUNT_THRESHOLD.toLocaleString("en-IN")}{" "}
            in a cycle), subject to a {inr(BILLING.MONTHLY_MINIMUM_INR)} monthly minimum
          </>
        ) : (
          <>
            Starter plan billed at a flat {inr(BILLING.STARTER_FLAT_INR)} per 30-day cycle, regardless of the
            number of consultations
          </>
        )}
        {taxed ? "; all amounts are inclusive of GST at " + tax!.rate + "%" : ""}. This is a computer-generated
        invoice from {TAX.SELLER_LEGAL_NAME || "MediReach"}.
      </p>
    </div>
  );
}

function Meta({ label, value, align = "left" }: { label: string; value: string; align?: "left" | "right" }) {
  return (
    <div className={align === "right" ? "text-right" : undefined}>
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-xs font-medium text-gray-900">{value}</p>
    </div>
  );
}

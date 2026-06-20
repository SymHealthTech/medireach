import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/Button";
import { whatsappLink } from "@/lib/marketing";
import { BILLING } from "@/lib/constants";

export const metadata: Metadata = { title: "Pricing — MediReach" };

/** Pricing page (spec §4.5): transparent, plain-language, with a worked example. */
export default function PricingPage() {
  const rows = [
    { label: "Joining fee (one-time)", value: `₹${BILLING.JOINING_FEE_INR}` },
    { label: "Monthly minimum (per 30-day cycle)", value: `₹${BILLING.MONTHLY_MINIMUM_INR}` },
    { label: "Per patient (up to 1,000/cycle)", value: `₹${BILLING.PER_PATIENT_INR}` },
    { label: "Per patient (beyond 1,000/cycle)", value: `₹${BILLING.PER_PATIENT_DISCOUNTED_INR}` },
  ];

  return (
    <div className="bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl font-bold text-ink">Simple, usage-based pricing</h1>
        <p className="mt-3 text-ink-muted">
          You pay for what you use. The ₹{BILLING.MONTHLY_MINIMUM_INR} minimum keeps things
          predictable for quiet cycles; busy clinics simply pay per patient. No long contracts.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-line">
          {rows.map((r, i) => (
            <div key={r.label} className={`flex items-center justify-between px-5 py-4 ${i % 2 ? "bg-surface-raised" : "bg-surface"}`}>
              <span className="text-ink">{r.label}</span>
              <span className="font-semibold text-ink">{r.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-brand/30 bg-brand/5 p-6">
          <h2 className="font-bold text-ink">A worked example</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Dr. A sees about 15 patients a day — roughly 450 in a 30-day cycle. At ₹{BILLING.PER_PATIENT_INR}
            /patient that&apos;s <strong className="text-ink">₹{450 * BILLING.PER_PATIENT_INR}</strong> for the
            cycle (above the ₹{BILLING.MONTHLY_MINIMUM_INR} minimum). A quieter clinic seeing 5/day
            (~150/cycle) pays the ₹{BILLING.MONTHLY_MINIMUM_INR} minimum, since 150 × ₹{BILLING.PER_PATIENT_INR} is below it.
          </p>
        </div>

        <p className="mt-6 text-sm text-ink-muted">
          Billing runs on a rolling 30-day cycle from your join date — the same rhythm as a mobile
          recharge. There&apos;s a 10-day grace window if a payment is late; your data is always kept safe.
        </p>

        <div className="mt-8 flex gap-3">
          <a href={whatsappLink()} target="_blank" rel="noopener">
            <Button variant="primary" size="lg">Get a free demo</Button>
          </a>
          <Link href="/how-it-works">
            <Button variant="outline" size="lg">How it works</Button>
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

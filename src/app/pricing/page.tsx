import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/Button";
import { whatsappLink } from "@/lib/marketing";
import { BILLING } from "@/lib/constants";

export const metadata: Metadata = { title: "Pricing — MediReach" };

/** Pricing page (spec §4.5 + two-tier): two plans, transparent, with a worked example. */
export default function PricingPage() {
  const starterPoints = [
    "Type consultations with keyboard shortcuts",
    "Instant abbreviation expansion (tds → 3 times a day)",
    "Medical certificates & certificate records",
    "Patient dues & revenue reports",
    "Prescription templates, WhatsApp delivery & SOS",
    "Any number of patients — the price never changes",
  ];
  const proPoints = [
    "Everything in Starter",
    "Voice dictation — speak the whole consultation",
    "AI structuring into clean clinical fields",
    "Mixed Hindi / Marathi / English dictation",
    "Certificate-only visits don't count toward per-patient billing",
    "Per-patient pricing that rewards volume",
  ];

  return (
    <div className="bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-5 py-16">
        <h1 className="text-3xl font-bold text-ink">Two simple plans</h1>
        <p className="mt-3 text-ink-muted">
          Start with a one-time ₹{BILLING.JOINING_FEE_INR} joining fee, then pick the plan that matches how
          you work. No long contracts — switch between Starter and Pro anytime.
        </p>

        {/* Plan cards */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {/* Starter */}
          <div className="flex flex-col rounded-2xl border border-line bg-surface-raised p-6">
            <p className="text-sm font-semibold text-ink-muted">Starter</p>
            <p className="mt-2 text-4xl font-bold text-ink">
              ₹{BILLING.STARTER_FLAT_INR}
              <span className="text-base font-medium text-ink-muted">/month</span>
            </p>
            <p className="mt-1 text-sm text-ink-muted">Flat per 30-day cycle · typing only</p>
            <ul className="mt-5 space-y-2 text-sm text-ink">
              {starterPoints.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-brand">✓</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="flex flex-col rounded-2xl border-2 border-brand bg-surface-raised p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-brand">Pro</p>
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">Voice + AI</span>
            </div>
            <p className="mt-2 text-4xl font-bold text-ink">
              ₹{BILLING.MONTHLY_MINIMUM_INR}
              <span className="text-base font-medium text-ink-muted"> + ₹{BILLING.PER_PATIENT_INR}/patient</span>
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              You pay the greater of the ₹{BILLING.MONTHLY_MINIMUM_INR} monthly minimum or your per-patient total
            </p>
            <ul className="mt-5 space-y-2 text-sm text-ink">
              {proPoints.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-brand">✓</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Pro rate detail */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-line">
          {[
            { label: "Joining fee (one-time, both plans)", value: `₹${BILLING.JOINING_FEE_INR}` },
            { label: "Starter (flat, any patient count)", value: `₹${BILLING.STARTER_FLAT_INR}/cycle` },
            { label: "Pro monthly minimum (per 30-day cycle)", value: `₹${BILLING.MONTHLY_MINIMUM_INR}` },
            { label: "Pro per patient (up to 1,000/cycle)", value: `₹${BILLING.PER_PATIENT_INR}` },
            { label: "Pro per patient (beyond 1,000/cycle)", value: `₹${BILLING.PER_PATIENT_DISCOUNTED_INR}` },
          ].map((r, i) => (
            <div key={r.label} className={`flex items-center justify-between px-5 py-4 ${i % 2 ? "bg-surface-raised" : "bg-surface"}`}>
              <span className="text-ink">{r.label}</span>
              <span className="font-semibold text-ink">{r.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-brand/30 bg-brand/5 p-6">
          <h2 className="font-bold text-ink">A worked example</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Dr. A is on <strong className="text-ink">Pro</strong> and sees about 15 patients a day — roughly 450 in
            a 30-day cycle. At ₹{BILLING.PER_PATIENT_INR}/patient that&apos;s{" "}
            <strong className="text-ink">₹{450 * BILLING.PER_PATIENT_INR}</strong> for the cycle (above the
            ₹{BILLING.MONTHLY_MINIMUM_INR} minimum). A quieter Pro clinic seeing 5/day (~150/cycle) pays the
            ₹{BILLING.MONTHLY_MINIMUM_INR} minimum, since 150 × ₹{BILLING.PER_PATIENT_INR} is below it. A doctor
            who prefers typing pays a flat <strong className="text-ink">₹{BILLING.STARTER_FLAT_INR}</strong> on
            Starter no matter how many patients they see.
          </p>
        </div>

        <div className="mt-6 space-y-2 text-sm text-ink-muted">
          <p>
            Billing runs on a rolling 30-day cycle from your join date — the same rhythm as a mobile recharge.
            There&apos;s a 10-day grace window if a payment is late; your data is always kept safe.
          </p>
          <p>
            <strong className="text-ink">Switching plans:</strong> upgrading to Pro unlocks voice immediately;
            a downgrade to Starter takes effect at your next cycle so you&apos;re never billed twice. No mid-cycle
            proration either way.
          </p>
        </div>

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

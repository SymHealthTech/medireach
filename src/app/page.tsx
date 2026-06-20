import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { LeadForm } from "@/components/site/LeadForm";
import { Button } from "@/components/ui/Button";
import { whatsappLink } from "@/lib/marketing";
import { BILLING } from "@/lib/constants";

/**
 * Public landing page (spec §4): a single long-scroll, benefit-led page aimed at
 * a busy solo GP on a phone. CTA is "Get a free demo / WhatsApp us" — not "Sign
 * up" — matching the high-touch sales reality. Server-rendered.
 */
export default function HomePage() {
  return (
    <div className="bg-surface">
      <SiteHeader />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
              Write prescriptions by <span className="text-brand">speaking</span> — nothing to type.
            </h1>
            <p className="text-lg text-ink-muted">
              MediReach turns your spoken consultation into a clean, structured prescription you
              review and send on WhatsApp in seconds. Built for busy clinics in India.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href={whatsappLink()} target="_blank" rel="noopener">
                <Button variant="primary" size="lg">Get a free demo</Button>
              </a>
              <Link href="/how-it-works">
                <Button variant="outline" size="lg">See how it works</Button>
              </Link>
            </div>
            <p className="text-sm text-ink-muted">
              No typing · Works in Hindi, Marathi &amp; English · Sends on WhatsApp
            </p>
          </div>
          <FlowVisual />
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-line bg-surface-raised">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-center text-2xl font-bold text-ink">From spoken words to a sent prescription</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "1", t: "Receptionist registers", d: "Front desk adds the patient and their details to today's queue." },
              { n: "2", t: "Doctor speaks", d: "Dictate the consultation naturally — in your own shorthand." },
              { n: "3", t: "AI structures it", d: "It's organised into clean clinical fields and medicines." },
              { n: "4", t: "Confirm & send", d: "Review, confirm, and share the prescription on WhatsApp." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-line bg-surface p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand font-bold text-brand-fg">
                  {s.n}
                </div>
                <h3 className="mt-4 font-semibold text-ink">{s.t}</h3>
                <p className="mt-1 text-sm text-ink-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-2xl font-bold text-ink">Everything a small clinic needs</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { t: "Voice prescriptions", d: "Speak in your own clinical shorthand; patients get plain-language instructions." },
            { t: "WhatsApp delivery", d: "Send the prescription straight to the patient — no printer needed." },
            { t: "Daily & monthly reports", d: "Automatic summaries of your patients and collections." },
            { t: "Doctor safety button", d: "A discreet SOS that alerts fellow doctors with your location." },
            { t: "Redesignable prescription pad", d: "Pick a template; add your clinic and a sponsor footer." },
            { t: "Works on any device", d: "Front desk on a tablet, doctor on a phone — one login." },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl border border-line bg-surface-raised p-6">
              <h3 className="font-semibold text-ink">{f.t}</h3>
              <p className="mt-1 text-sm text-ink-muted">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="border-y border-line bg-surface-raised">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h2 className="text-2xl font-bold text-ink">Simple, usage-based pricing</h2>
          <p className="mt-3 text-ink-muted">
            ₹{BILLING.JOINING_FEE_INR} one-time joining fee, then ₹{BILLING.MONTHLY_MINIMUM_INR}/month
            minimum + ₹{BILLING.PER_PATIENT_INR} per patient.
          </p>
          <div className="mx-auto mt-6 max-w-md rounded-2xl border border-line bg-surface p-6 text-left">
            <p className="text-sm font-semibold text-brand">Worked example</p>
            <p className="mt-1 text-sm text-ink-muted">
              A clinic seeing about 15 patients a day (~450/cycle) pays roughly{" "}
              <span className="font-semibold text-ink">₹{15 * 30 * BILLING.PER_PATIENT_INR}</span> for that 30-day cycle.
            </p>
          </div>
          <Link href="/pricing" className="mt-6 inline-block text-brand hover:underline">
            See full pricing →
          </Link>
        </div>
      </section>

      {/* Trust & safety */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-2xl font-bold text-ink">Built around doctors&apos; real concerns</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            { t: "Your data is protected", d: "DPDP-aligned security. Patient data is encrypted and access-controlled." },
            { t: "1-year auto-deletion", d: "Records are automatically removed after a year — we don't hoard data." },
            { t: "Doctor-to-doctor SOS", d: "A safety network built in, because clinic safety matters." },
          ].map((t) => (
            <div key={t.t} className="rounded-2xl border border-line bg-surface-raised p-6">
              <h3 className="font-semibold text-ink">{t.t}</h3>
              <p className="mt-1 text-sm text-ink-muted">{t.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-line bg-surface-raised">
        <div className="mx-auto max-w-3xl px-5 py-16">
          <h2 className="text-center text-2xl font-bold text-ink">Questions doctors ask</h2>
          <div className="mt-8 space-y-3">
            {[
              { q: "What if I don't have a printer?", a: "You don't need one — prescriptions go to the patient on WhatsApp as an image." },
              { q: "Does it understand Marathi/Hindi mixed with English?", a: "Yes. Speak naturally; the AI handles mixed-language clinical dictation." },
              { q: "What happens if I miss a payment?", a: "You get a 10-day grace window. If unpaid, access pauses — your data is kept safe and resumes the moment you pay." },
              { q: "Is my patients' data safe?", a: "Yes — encrypted storage, strict access controls, signed document links, and a 1-year deletion policy." },
            ].map((f) => (
              <details key={f.q} className="rounded-xl border border-line bg-surface p-4">
                <summary className="cursor-pointer font-medium text-ink">{f.q}</summary>
                <p className="mt-2 text-sm text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Lead capture */}
      <section className="mx-auto max-w-2xl px-5 py-16">
        <LeadForm />
      </section>

      <SiteFooter />
    </div>
  );
}

/** Simple custom illustration of the voice → structured → confirm flow (§4.2). */
function FlowVisual() {
  return (
    <div className="rounded-3xl border border-line bg-surface-raised p-6 shadow-sm">
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-2xl bg-brand/10 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-brand-fg">🎤</span>
          <p className="text-sm text-ink">&ldquo;Tab paracetamol 500 one TDS, viral fever…&rdquo;</p>
        </div>
        <div className="text-center text-ink-muted">↓</div>
        <div className="space-y-2 rounded-2xl border border-line bg-surface p-4 text-sm">
          <p className="text-ink"><span className="text-ink-muted">Diagnosis:</span> Viral fever</p>
          <p className="text-ink"><span className="text-ink-muted">Rx:</span> Paracetamol 500mg — 3 times a day after food</p>
        </div>
        <div className="text-center text-ink-muted">↓</div>
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-success/10 p-4 text-sm font-semibold text-success">
          ✓ Confirmed &amp; sent on WhatsApp
        </div>
      </div>
    </div>
  );
}

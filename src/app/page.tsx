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
      <section className="relative overflow-hidden">
        {/* Light-mode-only backdrop: a soft teal/amber mesh gradient with a faint
            dot grid and a pulse line echoing the logo. Hidden in dark mode, where
            the page keeps its own restrained teal glow. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[url('/hero-clinic.svg')] bg-cover bg-center bg-no-repeat dark:hidden"
        />
        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="space-y-6">
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
                Run your whole clinic by <span className="text-brand">speaking</span> — or typing.
              </h1>
              <p className="text-lg text-ink-muted">
                MediReach turns your consultation into a clean prescription you review and send on
                WhatsApp in seconds — plus certificates, dues, records and reports. Built for busy
                clinics in India.
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
                Voice or typing · Works in Hindi, Marathi &amp; English · Sends on WhatsApp
              </p>
            </div>
            <FlowVisual />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-line bg-surface-raised">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-center text-xl font-semibold tracking-tight text-ink">From consultation to a sent prescription</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "1", t: "Receptionist registers", d: "Front desk adds the patient to today's queue — a normal visit or a quick certificate-only visit." },
              { n: "2", t: "Doctor speaks or types", d: "Dictate the consultation on Pro, or type it fast with shortcuts on Starter — your choice." },
              { n: "3", t: "It becomes a clean record", d: "Fields and medicines are organised, and shorthand is expanded into plain-language instructions." },
              { n: "4", t: "Confirm & send", d: "Review, confirm, and share the prescription or certificate on WhatsApp." },
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
        <h2 className="text-center text-xl font-semibold tracking-tight text-ink">Everything a small clinic needs</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-ink-muted">
          One login runs the front desk and the consultation room — from the first prescription to the
          month&apos;s collections.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {([
            { t: "Voice prescriptions", tag: "Pro", d: "Speak in your own clinical shorthand; the AI structures it into clean fields and plain-language instructions for the patient." },
            { t: "Fast typing mode", tag: "Starter", d: "Prefer to type? Keyboard entry with your shortcuts and instant abbreviation expansion — no AI, one low flat price." },
            { t: "WhatsApp delivery", d: "Send the finished prescription straight to the patient as a PDF — no printer needed. Set a default message once." },
            { t: "Medical certificates", d: "Generate, preview and share professional A4 certificates: sick-leave / unfit, fitness-to-resume, and fitness-for-job." },
            { t: "Certificate-only fast path", d: "A patient who came only for a certificate joins the normal queue and skips the full consultation — issued in seconds." },
            { t: "Certificate records", d: "A searchable, long-retention archive of every certificate you've issued — retrieve or re-download any PDF when an authority asks." },
            { t: "Patient dues", d: "Record part-payments at the counter and track outstanding fees per patient, with a running total and payment history." },
            { t: "Revenue reports", d: "Automatic daily and monthly summaries of your patients and collections — know exactly where the month stands." },
            { t: "Prescription pad designer", d: "Pick from five print-ready A4 templates; add your clinic details, signature and an optional sponsor pharmacy footer." },
            { t: "Custom shortcuts", d: "Build your own shorthand so a few letters expand into full medicines, complaints, advice, diagnoses and fees." },
            { t: "Digital visiting card", d: "A beautiful public one-page profile with a shareable link and QR code to hand your patients." },
            { t: "Doctor safety SOS", d: "A discreet button that instantly alerts up to 10 fellow doctors with your location when you need help." },
            { t: "Staff logins", d: "Add front-desk receptionist accounts to register patients and run the queue — clinical data stays private to you." },
            { t: "Works on any device", d: "Front desk on a tablet, doctor on a phone — one clinic, one login, always in sync." },
          ] as { t: string; d: string; tag?: string }[]).map((f) => (
            <div key={f.t} className="rounded-2xl border border-line bg-surface-raised p-6">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-ink">{f.t}</h3>
                {f.tag && (
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">{f.tag}</span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-muted">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="border-y border-line bg-surface-raised">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-ink">Two simple plans — pick how you work</h2>
          <p className="mt-3 text-ink-muted">
            A one-time ₹{BILLING.JOINING_FEE_INR} joining fee, then choose a plan. Switch between them anytime.
          </p>
          <div className="mx-auto mt-8 grid max-w-3xl gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-surface p-6 text-left">
              <p className="text-sm font-semibold text-ink-muted">Starter</p>
              <p className="mt-1 text-3xl font-bold text-ink">₹{BILLING.STARTER_FLAT_INR}<span className="text-base font-medium text-ink-muted">/month</span></p>
              <p className="mt-2 text-sm text-ink-muted">
                Typing only, one flat price — any number of patients. Shortcuts, certificates, dues,
                records, reports, WhatsApp and SOS all included.
              </p>
            </div>
            <div className="rounded-2xl border-2 border-brand bg-surface p-6 text-left">
              <p className="text-sm font-semibold text-brand">Pro · voice + AI</p>
              <p className="mt-1 text-3xl font-bold text-ink">₹{BILLING.MONTHLY_MINIMUM_INR}<span className="text-base font-medium text-ink-muted"> + ₹{BILLING.PER_PATIENT_INR}/patient</span></p>
              <p className="mt-2 text-sm text-ink-muted">
                Everything in Starter, plus voice dictation and AI structuring. You pay the greater of
                the ₹{BILLING.MONTHLY_MINIMUM_INR} minimum or ₹{BILLING.PER_PATIENT_INR} per patient.
              </p>
            </div>
          </div>
          <Link href="/pricing" className="mt-8 inline-block text-brand hover:underline">
            See full pricing →
          </Link>
        </div>
      </section>

      {/* Trust & safety */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-xl font-semibold tracking-tight text-ink">Built around doctors&apos; real concerns</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { t: "Your data is protected", d: "DPDP-aligned security — encrypted storage, strict access control, and signed, expiring document links." },
            { t: "1-year auto-deletion", d: "Ordinary patient and visit records are removed automatically after a year — we don't hoard data." },
            { t: "Certificates kept 3 years", d: "Certificates are legal documents, so they're retained for three years for authority, employer or court retrieval." },
            { t: "Nothing saved until you confirm", d: "No always-on recording. Every record is reviewed and confirmed by you before it's finalised or shared." },
            { t: "Clinic cash stays your business", d: "Patient dues bookkeeping is entirely separate from your MediReach subscription — we never touch your collections." },
            { t: "Doctor-to-doctor SOS", d: "A safety network built in, because clinic safety matters. It supplements — never replaces — emergency services." },
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
          <h2 className="text-center text-xl font-semibold tracking-tight text-ink">Questions doctors ask</h2>
          <div className="mt-8 space-y-3">
            {[
              { q: "Do I have to use voice?", a: "No. Choose the Starter plan for fast typing with shortcuts at a flat price, or Pro for voice dictation plus AI structuring. You can switch between plans anytime." },
              { q: "What if I don't have a printer?", a: "You don't need one — prescriptions and certificates go to the patient on WhatsApp as a clean A4 PDF." },
              { q: "Does it understand Marathi/Hindi mixed with English?", a: "Yes. Speak naturally; on Pro the AI handles mixed-language clinical dictation, and the in-app guide is available in English, Hindi and Marathi." },
              { q: "Can I issue medical certificates?", a: "Yes — sick-leave/unfit, fitness-to-resume and fitness-for-job certificates as professional A4 PDFs, shared on WhatsApp just like a prescription. Every certificate is saved to a searchable records archive." },
              { q: "Can I track fees a patient still owes?", a: "Yes. Patient Dues lets you record part-payments at the counter and see each patient's outstanding balance and payment history — kept completely separate from your MediReach subscription." },
              { q: "Can my receptionist see patient records?", a: "No. Receptionists register patients and manage the queue, but they can't see clinical notes, prescriptions, dues or certificates — that's enforced on the server." },
              { q: "What happens if I miss a payment?", a: "You get a 10-day grace window. If unpaid, access pauses — your data is kept safe and resumes the moment you pay." },
              { q: "Is my patients' data safe?", a: "Yes — encrypted storage, strict access controls, signed document links, and automatic deletion (one year for visit data, three years for certificates)." },
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

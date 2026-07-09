import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/Button";
import { whatsappLink } from "@/lib/marketing";

export const metadata: Metadata = { title: "How it works — MediReach" };

const STEPS = [
  {
    n: "1",
    t: "The receptionist registers the patient",
    d: "At the front desk, the receptionist enters the patient's details and adds them to today's queue — as a normal visit or, for someone who came only for a certificate, a quick certificate-only visit. This works great on a tablet or computer with a keyboard.",
  },
  {
    n: "2",
    t: "The doctor speaks — or types — the consultation",
    d: "In the room, the doctor opens the patient and, on the Pro plan, dictates naturally in their own clinical shorthand (Hindi, Marathi and English mixed is fine). On the Starter plan they type it fast with keyword shortcuts. Either way, the flow is the same.",
  },
  {
    n: "3",
    t: "It becomes a clean record",
    d: "MediReach organises the consultation into proper clinical fields and turns shorthand medicines into clear, plain-language instructions a patient can follow — with AI on Pro, and instant local abbreviation expansion on Starter.",
  },
  {
    n: "4",
    t: "Review, confirm, and send on WhatsApp",
    d: "Nothing is saved until the doctor reviews and presses Confirm. Then the prescription — or a medical certificate — goes to the patient on WhatsApp as a clean A4 PDF. No printer required.",
  },
];

/** How it works (spec §4.3): the 4-step flow, explained. */
export default function HowItWorksPage() {
  return (
    <div className="bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl font-bold text-ink">How MediReach works</h1>
        <p className="mt-3 text-ink-muted">A deliberate, doctor-controlled flow — voice on Pro or typing on Starter, no always-on recording, and always a human review before anything is finalised.</p>

        <ol className="mt-10 space-y-8">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand font-bold text-brand-fg">
                {s.n}
              </span>
              <div>
                <h2 className="font-semibold text-ink">{s.t}</h2>
                <p className="mt-1 text-sm text-ink-muted">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12">
          <a href={whatsappLink()} target="_blank" rel="noopener">
            <Button variant="primary" size="lg">Get a free demo</Button>
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

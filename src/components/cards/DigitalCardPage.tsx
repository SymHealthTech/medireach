import Link from "next/link";
import { ArrowLeft, Download, FileText, ImageIcon } from "lucide-react";
import { CardShare, PatientShare } from "@/components/cards/CardShare";
import { CardView } from "@/components/cards/CardView";
import { LogoWordmark } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";
import { absUrl } from "@/lib/site";
import type { ReadyTemplates } from "@/templates/registry";
import type { PublicDoctor } from "@/templates/types";

/**
 * Digital visiting card pages, in two views:
 *
 *  - Patient view (public card page, sample patient preview): the live card
 *    and one Share button. This is all patients ever see.
 *
 * The live card is the phone card of the doctor's website design (same
 * colours and style as the website), with working Call, WhatsApp,
 * Directions, Save and Website buttons, exactly as in the PNG and PDF.
 *  - Doctor view (doctor's account after login, sample doctor preview): the
 *    card plus the toolkit to send it: link, WhatsApp image, print-ready PDF
 *    and PNG files, and previews of the downloads.
 */

export interface CardViewToggleProps {
  current: "patient" | "doctor";
  patientHref: string;
  doctorHref: string;
}

/** "Patient preview / Doctor preview" switch for the card navbar. */
export function CardViewToggle({ current, patientHref, doctorHref }: CardViewToggleProps) {
  const item = (active: boolean) =>
    cn(
      "inline-flex min-h-9 items-center rounded-full px-3 text-xs font-semibold transition sm:px-4 sm:text-sm",
      active ? "bg-ink text-paper shadow-soft" : "text-body hover:text-ink",
    );
  return (
    <nav aria-label="Card view" className="flex shrink-0 items-center rounded-full bg-mist p-1 ring-1 ring-ink/10">
      <Link href={patientHref} scroll={false} aria-current={current === "patient" ? "page" : undefined} className={item(current === "patient")}>
        Patient<span className="hidden sm:inline">&nbsp;preview</span>
      </Link>
      <Link href={doctorHref} scroll={false} aria-current={current === "doctor" ? "page" : undefined} className={item(current === "doctor")}>
        Doctor<span className="hidden sm:inline">&nbsp;preview</span>
      </Link>
    </nav>
  );
}

/** Top bar: back link on the left; the view toggle (or the MediReach logo) on the right. */
export function CardPageHeader({ backHref, backLabel, toggle }: { backHref: string; backLabel: string; toggle?: CardViewToggleProps }) {
  return (
    <header className="border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-3 px-4 sm:px-6">
        <a href={backHref} className="inline-flex min-h-11 min-w-0 items-center gap-2 text-sm font-semibold text-ink hover:text-lagoon">
          <ArrowLeft className="size-4 shrink-0" strokeWidth={2} />
          <span className="truncate">{backLabel}</span>
        </a>
        {toggle ? (
          <CardViewToggle {...toggle} />
        ) : (
          <a href={absUrl("/")} aria-label="MediReach home" className="shrink-0">
            <LogoWordmark className="text-lg" />
          </a>
        )}
      </div>
    </header>
  );
}

export function CardPageFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("mt-auto px-4 pb-6 pt-2 text-center text-sm text-muted-foreground sm:pb-10", className)}>
      Information provided by the doctor. Card by{" "}
      <a href={absUrl("/")} className="underline underline-offset-2">
        MediReach
      </a>
      .
    </footer>
  );
}

/** The live card: the design's phone card with working buttons. */
function LiveCard({ doctor: d, ready }: { doctor: PublicDoctor; ready?: ReadyTemplates }) {
  return (
    <>
      <h1 className="sr-only">
        {d.fullName}
        {d.primarySpecialty ? `, ${d.primarySpecialty.name}` : ""} – digital visiting card
      </h1>
      <CardView doctor={d} variant="phone" ready={ready} links className="rounded-[28px] shadow-lift ring-ink/5" />
    </>
  );
}

/** What patients see: the card and one Share button. */
export function PatientCardView({ doctor: d, cardUrl, ready }: { doctor: PublicDoctor; cardUrl: string; ready?: ReadyTemplates }) {
  return (
    // The card as large as a phone screen allows, with Share underneath. The footer sits at the bottom of the screen.
    <main className="mx-auto flex w-full max-w-[460px] flex-col gap-4 px-4 pb-4 pt-5 sm:gap-5 sm:py-12">
      <LiveCard doctor={d} ready={ready} />
      <div>
        <PatientShare url={cardUrl} title={`${d.fullName}${d.primarySpecialty ? `, ${d.primarySpecialty.name}` : ""}`} />
      </div>
    </main>
  );
}

/** What the doctor sees after login: the card plus share, download and print tools. */
export function DoctorCardView({
  doctor: d,
  cardUrl,
  filesBase,
  version,
  ready,
}: {
  doctor: PublicDoctor;
  /** Link to share for this card page. */
  cardUrl: string;
  /** Base path of the card files (…/phone.png, …/print.pdf, …/print.png). */
  filesBase: string;
  /** Cache-busting version for the file links. */
  version?: string;
  ready?: ReadyTemplates;
}) {
  const v = version ? `v=${encodeURIComponent(version)}&` : "";
  const file = (name: string) => `${filesBase}/${name}?${v}download=1`;
  const downloads = [
    { href: file("phone.png"), icon: ImageIcon, title: "Card image", meta: "PNG · 1080 × 1920", note: "For WhatsApp status and sharing" },
    { href: file("phone.pdf"), icon: FileText, title: "Full card PDF", meta: "PDF · whole card", note: "The whole card as a PDF; its Call, WhatsApp, Directions, Save and Website buttons work" },
    { href: file("print.pdf"), icon: FileText, title: "Print-ready PDF", meta: "PDF · 85 × 55 mm", note: "Send to any printer" },
    { href: file("print.png"), icon: Download, title: "Print card image", meta: "PNG · 300 dpi", note: "For designers and printers" },
  ];

  return (
    <main className="mx-auto grid w-full max-w-content gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[420px_minmax(0,1fr)] lg:gap-14 lg:py-14">
      <div className="lg:sticky lg:top-8 lg:self-start">
        <LiveCard doctor={d} ready={ready} />
      </div>

      <div className="min-w-0 space-y-8">
        <div>
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-lagoon">
            <span aria-hidden className="h-px w-8 bg-marigold" />
            Visiting card
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">Share it, save it, print it</h2>
          <p className="mt-3 max-w-xl text-body/80">
            One card for every way patients reach you: a link to send, an image for WhatsApp, and a print-ready file for paper cards.
          </p>
        </div>

        <section aria-labelledby="share-title" className="rounded-[28px] bg-surface p-6 shadow-soft ring-1 ring-ink/5 sm:p-8">
          <h3 id="share-title" className="font-display text-xl font-semibold text-ink">
            Share the card
          </h3>
          <div className="mt-4">
            <CardShare url={cardUrl} title={`${d.fullName}${d.primarySpecialty ? `, ${d.primarySpecialty.name}` : ""}`} />
          </div>
        </section>

        <section aria-labelledby="download-title" className="rounded-[28px] bg-surface p-6 shadow-soft ring-1 ring-ink/5 sm:p-8">
          <h3 id="download-title" className="font-display text-xl font-semibold text-ink">
            Download
          </h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {downloads.map(({ href, icon: Icon, title, meta, note }) => (
              <li key={title}>
                <a
                  href={href}
                  download
                  className="group flex h-full items-start gap-4 rounded-2xl border border-line bg-paper p-4 transition hover:border-lagoon/40 hover:bg-mint"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-ink text-paper">
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">{title}</span>
                    <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-lagoon">{meta}</span>
                    <span className="mt-0.5 block text-sm text-body/75">{note}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="preview-title" className="space-y-4">
          <h3 id="preview-title" className="font-display text-xl font-semibold text-ink">
            What you download
          </h3>
          <div className="grid items-start gap-6 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
            <figure className="space-y-2">
              <div className="overflow-hidden rounded-2xl shadow-lift ring-1 ring-ink/5">
                <CardView doctor={d} variant="phone" ready={ready} />
              </div>
              <figcaption className="text-sm text-muted-foreground">Card image, for phones</figcaption>
            </figure>
            <figure className="space-y-2">
              <div className="overflow-hidden rounded-xl shadow-lift ring-1 ring-ink/5">
                <CardView doctor={d} variant="print" ready={ready} />
              </div>
              <figcaption className="text-sm text-muted-foreground">Printable card, 85 × 55 mm</figcaption>
            </figure>
          </div>
        </section>
      </div>
    </main>
  );
}

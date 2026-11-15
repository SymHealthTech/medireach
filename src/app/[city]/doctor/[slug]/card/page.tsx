import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download, ExternalLink, FileText, UserPlus } from "lucide-react";
import { CardView } from "@/components/cards/CardView";
import { ShareCardButton } from "@/components/cards/ShareCardButton";
import { PublicFooter, PublicHeader } from "@/components/public/PublicShell";
import { getPublishedDoctor } from "@/lib/public/data";
import { getReadyTemplates } from "@/lib/public/templates";
import { SLUG_RE } from "@/lib/slug";
import { absUrl, paths } from "@/lib/site";

/**
 * Public visiting-card page: /[city]/doctor/[slug]/card (also served as
 * {subdomain}.medireach.co.in/card). Meant for sharing a link, so it is
 * noindex; the profile page is what ranks.
 */

export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

type Params = { city: string; slug: string };

async function load(params: Promise<Params>) {
  const { city, slug } = await params;
  return SLUG_RE.test(city) && SLUG_RE.test(slug) ? getPublishedDoctor(city, slug) : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const d = await load(params);
  if (!d) return {};
  return {
    title: { absolute: `${d.fullName} – visiting card | MediReach` },
    description: `Visiting card of ${d.fullName}${d.primarySpecialty ? `, ${d.primarySpecialty.name}` : ""}. Scan or tap for timings, address and contact.`,
    robots: { index: false, follow: true },
    alternates: { canonical: absUrl(`${paths.doctor(d.citySlug, d.slug)}/card`) },
  };
}

export default async function CardPage({ params }: { params: Promise<Params> }) {
  const d = await load(params);
  if (!d) notFound();
  const ready = await getReadyTemplates();
  const base = absUrl(`${paths.doctor(d.citySlug, d.slug)}/card`);
  const v = encodeURIComponent(d.updatedAt);
  const btnBase = "inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border px-4 text-sm font-semibold active:scale-[.98]";
  const btn = `${btnBase} border-line bg-surface text-ink hover:border-ink/40`;
  const btnPrimary = `${btnBase} border-ink bg-ink text-paper hover:bg-ink-700`;

  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-6 sm:px-6">
        <header className="space-y-1">
          <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{d.fullName}</h1>
          <p className="text-body">Visiting card · scan the QR code for timings and directions.</p>
        </header>

        <div className="grid items-start gap-8 sm:grid-cols-[minmax(0,320px)_1fr]">
          <CardView doctor={d} variant="phone" ready={ready} className="mx-auto w-full max-w-[320px]" />
          <div className="min-w-0 space-y-4">
            <div className="grid gap-2">
              <ShareCardButton url={d.shareUrl} title={d.fullName} className={btnPrimary} />
              <a href={`${base}/phone.png?v=${v}&download=1`} className={btn}>
                <Download className="size-4" strokeWidth={1.75} /> Save card image
              </a>
              <a href={d.vcfUrl} className={btn} download>
                <UserPlus className="size-4" strokeWidth={1.75} /> Save contact
              </a>
              <a href={d.url} className={btn}>
                <ExternalLink className="size-4" strokeWidth={1.75} /> Open full page
              </a>
            </div>
            <p className="text-sm text-muted-foreground">Card link: {d.shareUrl.replace(/^https?:\/\//, "")}</p>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-ink">Printable card (85 × 55 mm)</h2>
          <CardView doctor={d} variant="print" ready={ready} />
          <div className="flex flex-wrap gap-2">
            <a href={`${base}/print.pdf?v=${v}&download=1`} className={btn}>
              <FileText className="size-4" strokeWidth={1.75} /> Download PDF for printing
            </a>
            <a href={`${base}/print.png?v=${v}&download=1`} className={btn}>
              <Download className="size-4" strokeWidth={1.75} /> Download PNG
            </a>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}

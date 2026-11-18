import "server-only";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CardFrame } from "@/components/cards/CardFrame";
import { PatientShare } from "@/components/cards/CardShare";
import { CardPageHeader } from "@/components/cards/DigitalCardPage";
import { CARD_FILES, resolveSiteCardTemplate, siteCardFileResponse, siteCardProps, type CardFile } from "@/lib/cards/render";
import { getLiveEstablishment } from "@/lib/public/establishments";
import { absUrl } from "@/lib/site";
import { SLUG_RE } from "@/lib/slug";
import { CARD_SIZE, type PublicEstablishment } from "@/templates/types";

/**
 * Clinic/hospital visiting card: the public card page (/[city]/clinic/[slug]/card,
 * also {subdomain}.medireach.co.in/card; noindex) and its downloads
 * (phone.png, print.png, print.pdf).
 */

type Params = { city: string; slug: string };

/** Card page link: on the subdomain when there is one, else on the folder URL. */
export const siteCardPageUrl = (s: PublicEstablishment) => (s.shareUrl !== s.url ? `${s.shareUrl.replace(/\/$/, "")}/card` : `${s.url}/card`);

export function siteCardRoute(kind: "clinic" | "hospital") {
  async function load(params: Promise<Params>) {
    const { city, slug } = await params;
    return SLUG_RE.test(city) && SLUG_RE.test(slug) ? getLiveEstablishment(kind, city, slug) : null;
  }

  async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const s = await load(params);
    if (!s) return {};
    return {
      title: { absolute: `${s.name} – visiting card | MediReach` },
      description: `Visiting card of ${s.name}, ${s.address.area.name}, ${s.address.city.name}. Scan or tap for timings, address and contact.`,
      robots: { index: false, follow: true },
      alternates: { canonical: `${s.url}/card` },
    };
  }

  async function Page({ params }: { params: Promise<Params> }) {
    const s = await load(params);
    if (!s) notFound();
    const Card = resolveSiteCardTemplate(s.cardTemplateId);
    const { width, height } = CARD_SIZE.phone;
    return (
      <div className="flex min-h-dvh flex-col bg-mist">
        <CardPageHeader backHref={s.url} backLabel="Back" />
        <main className="mx-auto flex w-full max-w-[420px] flex-col gap-4 px-4 pb-4 pt-5 sm:py-12">
          <h1 className="sr-only">{s.name} – visiting card</h1>
          <CardFrame width={width} height={height} label={`${s.name} – visiting card`} className="rounded-3xl">
            <Card {...siteCardProps(s, "phone", "html")} />
          </CardFrame>
          <PatientShare url={siteCardPageUrl(s)} title={s.name} />
        </main>
        <footer className="mt-auto px-4 pb-6 pt-2 text-center text-sm text-muted-foreground sm:pb-10">
          Information provided by {s.name}. Card by{" "}
          <a href={absUrl("/")} className="underline underline-offset-2">
            MediReach
          </a>
          .
        </footer>
      </div>
    );
  }

  /** Published sites only; long CDN cache (links carry ?v=updatedAt). ?download=1 saves as a file. */
  async function GET(req: Request, { params }: { params: Promise<Params & { file: string }> }) {
    const { city, slug, file } = await params;
    if (!(file in CARD_FILES)) return new Response("Not found", { status: 404 });
    const s = await load(Promise.resolve({ city, slug }));
    if (!s) return new Response("Not found", { status: 404 });
    return siteCardFileResponse(s, file as CardFile, {
      cacheControl: "public, max-age=3600, s-maxage=2592000, stale-while-revalidate=86400",
      download: new URL(req.url).searchParams.get("download") === "1",
    });
  }

  return { generateMetadata, Page, GET };
}

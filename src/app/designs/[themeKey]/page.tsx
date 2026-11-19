import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteView } from "@/components/public/SiteView";
import { WhatsAppLink } from "@/components/marketing/WhatsAppLink";
import { DESIGNS } from "@/content/marketing";
import { SAMPLE_SITES } from "@/fixtures/sample-sites";
import { getPublicSiteData, whatsappHref } from "@/lib/public/site-data";
import { absUrl } from "@/lib/site";
import { isThemeKey, SPECIALTY_THEMES, getTheme } from "@/themes/specialty";

/**
 * A full sample site in one specialty design (fictional data, noindex).
 * Lives outside the marketing layout because the sample has its own header
 * and footer, like a real clinic site.
 */

export const revalidate = 86400;
export function generateStaticParams() {
  return SPECIALTY_THEMES.map((t) => ({ themeKey: t.key }));
}

type Params = { themeKey: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { themeKey } = await params;
  if (!isThemeKey(themeKey)) return {};
  const theme = getTheme(themeKey);
  return {
    title: { absolute: `${theme.name} design – sample site | MediReach` },
    description: `A sample ${theme.kind === "hospital" ? "hospital" : "clinic"} website in the ${theme.name} design. All details are made up.`,
    robots: { index: false, follow: true },
    alternates: { canonical: absUrl(`/designs/${themeKey}`) },
  };
}

export default async function DesignSamplePage({ params }: { params: Promise<Params> }) {
  const { themeKey } = await params;
  if (!isThemeKey(themeKey)) notFound();
  const theme = getTheme(themeKey);
  const site = await getPublicSiteData();
  const wa = whatsappHref(site.whatsappNumber, DESIGNS.whatsapp.replace("{theme}", theme.name));

  return (
    <>
      <div className="relative z-[60] bg-marigold px-4 py-2 text-sm text-white">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <Link href="/designs" className="inline-flex items-center gap-1.5 font-semibold hover:underline">
            <ArrowLeft aria-hidden className="size-4" /> {DESIGNS.backToAll}
          </Link>
          <span className="font-medium">{DESIGNS.sampleBar.replace("{theme}", theme.name)}</span>
          <WhatsAppLink href={wa} placement={`design_${themeKey}`} className="rounded-full bg-[#0a3f3f] px-3 py-1 font-semibold text-[#f7f9fa]">
            {DESIGNS.cta}
          </WhatsAppLink>
        </div>
      </div>
      <SiteView site={SAMPLE_SITES[themeKey]} jsonLd={false} />
    </>
  );
}

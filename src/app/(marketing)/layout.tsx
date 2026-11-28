import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { GET_STARTED_DIALOG } from "@/content/marketing";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPublicSiteData, whatsappHref } from "@/lib/public/site-data";
import { siteJsonLd } from "@/lib/seo/profile";

/** Shell for the homepage and marketing pages (header + ink footer). */
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const site = await getPublicSiteData();
  return (
    <>
      <JsonLd data={siteJsonLd()} />
      <MarketingHeader waHref={whatsappHref(site.whatsappNumber, GET_STARTED_DIALOG.whatsappText)} />
      {children}
      <MarketingFooter />
    </>
  );
}

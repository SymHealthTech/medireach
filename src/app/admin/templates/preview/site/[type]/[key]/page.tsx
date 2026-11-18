import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { SiteView } from "@/components/public/SiteView";
import { SAMPLE_SITES } from "@/fixtures/sample-sites";
import { requireAdminPage } from "@/lib/auth/admin";
import { TEMPLATE_KEYS } from "@/lib/constants";
import { isThemeKey } from "@/themes/specialty";

export const metadata: Metadata = { title: "Design preview" };

/**
 * Preview a clinic/hospital design slot with a sample site:
 *   /admin/templates/preview/site/clinic/t2[?theme=dental]
 *   /admin/templates/preview/site/hospital/classic
 * Renders the slot even when it isn't ready (placeholders show Classic).
 */
export default async function SiteTemplatePreview({
  params,
  searchParams,
}: {
  params: Promise<{ type: string; key: string }>;
  searchParams: Promise<{ theme?: string }>;
}) {
  await requireAdminPage(["superadmin", "admin"]);
  const { type, key } = await params;
  const { theme } = await searchParams;
  if ((type !== "clinic" && type !== "hospital") || !(TEMPLATE_KEYS as readonly string[]).includes(key)) notFound();
  const themeKey = type === "hospital" ? "small-hospital" : isThemeKey(theme) && theme !== "small-hospital" ? theme : "general-opd";
  const site = { ...SAMPLE_SITES[themeKey], siteTemplateId: key };
  return (
    <>
      <div className="flex items-center justify-center gap-2 bg-marigold px-4 py-2 text-center text-sm font-semibold text-[#0e3b3c]">
        <Eye className="size-4" /> {type === "hospital" ? "Hospital" : "Clinic"} design preview: {key} · fictional sample site
      </div>
      <SiteView site={site} jsonLd={false} />
    </>
  );
}

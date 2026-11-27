import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { CardView } from "@/components/cards/CardView";
import { ProfileView } from "@/components/public/ProfileView";
import { requireAdminPage } from "@/lib/auth/admin";
import { TEMPLATE_KEYS } from "@/lib/constants";
import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";

export const metadata: Metadata = { title: "Design preview" };

/**
 * Preview any design slot with a fictional sample doctor:
 *   /admin/templates/preview/<key>            portfolio page
 *   /admin/templates/preview/<key>?type=card  print + phone cards of that design
 * Add &doctor=consultant for the consultant sample. Slots render even when not
 * ready (that's what the preview is for); placeholder slots show Classic.
 */
export default async function TemplatePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ doctor?: string; type?: string }>;
}) {
  await requireAdminPage(["superadmin", "admin"]);
  const { key } = await params;
  const { doctor, type } = await searchParams;
  if (!(TEMPLATE_KEYS as readonly string[]).includes(key)) notFound();
  const which = doctor === "consultant" ? "consultant" : "gp";
  const sample = SAMPLE_PUBLIC_DOCTORS[which];
  const isCard = type === "card";
  const other = which === "consultant" ? "gp" : "consultant";
  const switchHref = `?${new URLSearchParams({ ...(isCard ? { type: "card" } : {}), doctor: other }).toString()}`;

  const banner = (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-marigold px-4 py-2 text-sm font-semibold text-white">
      <span className="inline-flex items-center gap-2">
        <Eye className="size-4" /> {isCard ? "Card" : "Page"} design preview: {key} · fictional sample doctor
      </span>
      <a className="underline" href={switchHref}>
        Switch to {other === "gp" ? "GP" : "consultant"} sample
      </a>
    </div>
  );

  if (isCard) {
    const d = { ...sample, portfolioTemplateId: key };
    return (
      <>
        {banner}
        <main className="mx-auto grid max-w-5xl items-start gap-8 bg-paper px-4 py-8 md:grid-cols-[1fr_320px]">
          <section className="min-w-0 space-y-2">
            <h1 className="font-display text-xl font-semibold text-ink">Print (85 × 55 mm)</h1>
            <CardView doctor={d} variant="print" />
          </section>
          <section className="min-w-0 space-y-2">
            <h2 className="font-display text-xl font-semibold text-ink">Phone share</h2>
            <CardView doctor={d} variant="phone" />
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      {banner}
      <ProfileView doctor={{ ...sample, portfolioTemplateId: key }} />
    </>
  );
}

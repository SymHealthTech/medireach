import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { ProfileView } from "@/components/public/ProfileView";
import { requireAdminPage } from "@/lib/auth/admin";
import { TEMPLATE_KEYS, type TemplateKey } from "@/lib/constants";
import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";
import { portfolioTemplates } from "@/templates/registry";

export const metadata: Metadata = { title: "Design preview" };

/** Preview a portfolio design with the fictional sample doctor (?doctor=gp|consultant). */
export default async function TemplatePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ doctor?: string }>;
}) {
  await requireAdminPage(["superadmin", "admin"]);
  const { key } = await params;
  const { doctor } = await searchParams;
  if (!(TEMPLATE_KEYS as readonly string[]).includes(key) || !portfolioTemplates[key as TemplateKey]) notFound();
  const sample = SAMPLE_PUBLIC_DOCTORS[doctor === "consultant" ? "consultant" : "gp"];

  return (
    <>
      <div className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-marigold px-4 py-2 text-sm font-semibold text-[#0e3b3c]">
        <span className="inline-flex items-center gap-2">
          <Eye className="size-4" /> Design preview: {key} · fictional sample doctor
        </span>
        <a className="underline" href={`?doctor=${doctor === "consultant" ? "gp" : "consultant"}`}>
          Switch to {doctor === "consultant" ? "GP" : "consultant"} sample
        </a>
      </div>
      <ProfileView doctor={{ ...sample, portfolioTemplateId: key }} nearby={[]} />
    </>
  );
}

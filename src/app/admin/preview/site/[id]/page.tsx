import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { SiteView } from "@/components/public/SiteView";
import { requireAdminPage } from "@/lib/auth/admin";
import { isObjectId } from "@/lib/admin/list";
import { connectToDatabase } from "@/lib/db";
import { buildPublicEstablishment } from "@/lib/public/establishments";
import { getReadyTemplates } from "@/lib/public/templates";
import { Establishment } from "@/models/Establishment";

export const metadata: Metadata = { title: "Preview" };

/**
 * Admin-only preview of a clinic or hospital (any status), rendered exactly as
 * the public site will be. Never indexed (under /admin).
 */
export default async function SitePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!isObjectId(id)) notFound();
  await connectToDatabase();
  const doc = await Establishment.findById(id).lean();
  if (!doc) notFound();

  const site = await buildPublicEstablishment({ ...doc, citySlug: doc.citySlug || "pune", slug: doc.slug || "preview" });
  if (!site) {
    return (
      <p className="mx-auto max-w-xl p-8 text-center text-muted-foreground">
        Add the city, area and name (Location step) to see a preview.
      </p>
    );
  }

  return (
    <>
      <div className="flex items-center justify-center gap-2 bg-marigold px-4 py-2 text-center text-sm font-semibold text-[#0e3b3c]">
        <Eye className="size-4" /> Preview — {doc.status === "published" ? "this site is live" : `not published (${doc.status})`}
      </div>
      <SiteView site={site} ready={await getReadyTemplates()} jsonLd={false} />
    </>
  );
}

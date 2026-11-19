import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { ProfileView } from "@/components/public/ProfileView";
import { requireAdminPage } from "@/lib/auth/admin";
import { isObjectId } from "@/lib/admin/list";
import { getMasters, siteLinksFor, toPublicDoctor } from "@/lib/public/data";
import { getReadyTemplates } from "@/lib/public/templates";
import { DoctorProfile } from "@/models/DoctorProfile";

export const metadata: Metadata = { title: "Preview" };

/**
 * Admin-only preview of any doctor (draft or published) rendered exactly as
 * the public page will be. Never indexed (under /admin).
 */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!isObjectId(id)) notFound();
  const [doc, masters] = await Promise.all([DoctorProfile.findById(id).lean(), getMasters()]);
  if (!doc) notFound();

  const sites = await siteLinksFor(doc.clinics.map((c) => c.establishmentId));
  const doctor = toPublicDoctor({ ...doc, citySlug: doc.citySlug || "pune", slug: doc.slug || "preview" }, masters, sites);

  return (
    <>
      <div className="flex items-center justify-center gap-2 bg-marigold px-4 py-2 text-center text-sm font-semibold text-white">
        <Eye className="size-4" /> Preview — {doc.status === "published" ? "this page is live" : `not published (${doc.status})`}
      </div>
      <ProfileView doctor={doctor} nearby={[]} ready={await getReadyTemplates()} />
    </>
  );
}

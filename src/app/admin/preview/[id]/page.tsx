import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { ProfileView } from "@/components/public/ProfileView";
import { requireAdminPage } from "@/lib/auth/admin";
import { assertOwnedPage } from "@/lib/admin/scope";
import { isObjectId } from "@/lib/admin/list";
import { loadMasters, siteLinksFor, toPublicDoctor } from "@/lib/public/data";
import { getReadyTemplates } from "@/lib/public/templates";
import { DoctorProfile } from "@/models/DoctorProfile";

export const metadata: Metadata = { title: "Preview" };

/**
 * Admin-only preview of any doctor (draft or published) rendered exactly as
 * the public page will be. Never indexed (under /admin).
 */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage();
  const { id } = await params;
  if (!isObjectId(id)) notFound();
  const [found, masters] = await Promise.all([DoctorProfile.findById(id).lean(), loadMasters()]);
  // Sales executives: only their own doctors.
  assertOwnedPage(admin, found);
  const doc = found!;

  const sites = await siteLinksFor(doc.clinics.map((c) => c.establishmentId));
  const doctor = toPublicDoctor({ ...doc, citySlug: doc.citySlug || "pune", slug: doc.slug || "preview" }, masters, sites);

  return (
    <>
      <div className="flex items-center justify-center gap-2 bg-marigold px-4 py-2 text-center text-sm font-semibold text-white">
        <Eye className="size-4" /> Preview — {doc.status === "published" ? "this page is live" : `not published (${doc.status})`}
      </div>
      <ProfileView doctor={doctor} ready={await getReadyTemplates()} />
    </>
  );
}

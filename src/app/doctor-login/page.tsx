import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Types } from "mongoose";
import { DoctorLoginForm } from "@/components/account/DoctorLoginForm";
import { DoctorLoginShell } from "@/components/account/DoctorLoginShell";
import { getCurrentAccount } from "@/lib/auth/doctor";
import { connectToDatabase } from "@/lib/db";
import { PUBLISHED_ROUTABLE } from "@/lib/public/data";
import { paths } from "@/lib/site";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Specialty } from "@/models/Specialty";

export const metadata: Metadata = { title: { absolute: "Doctor login – Website dashboard" }, robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  Verification: "That login link has expired or was already used. Request a new code below.",
  AccessDenied: "We couldn't log you in with that link. Request a new code below.",
};

/**
 * Standalone login for a doctor's website dashboard, linked from the footer
 * of their website ("Doctor login"). No MediReach site navigation: it belongs
 * to the doctor's own website. `?d=<doctor id>` shows their name and photo.
 */
export default async function DoctorLoginPage({ searchParams }: { searchParams: Promise<{ d?: string; error?: string }> }) {
  if (await getCurrentAccount()) redirect("/account");
  const { d, error } = await searchParams;
  let doctor: { name: string; specialty?: string; photo?: string; siteUrl?: string } | undefined;
  if (d && Types.ObjectId.isValid(d)) {
    await connectToDatabase();
    const doc = await DoctorProfile.findOne({ _id: new Types.ObjectId(d), ...PUBLISHED_ROUTABLE })
      .select({ title: 1, firstName: 1, lastName: 1, displayName: 1, photo: 1, primarySpecialtyId: 1, citySlug: 1, slug: 1 })
      .lean();
    if (doc) {
      const spec = doc.primarySpecialtyId ? await Specialty.findById(doc.primarySpecialtyId).select({ name: 1 }).lean() : null;
      doctor = {
        name: doc.displayName || [doc.title || "Dr.", doc.firstName, doc.lastName].join(" "),
        ...(spec ? { specialty: spec.name } : {}),
        ...(doc.photo ? { photo: doc.photo.url } : {}),
        siteUrl: paths.doctor(doc.citySlug!, doc.slug!),
      };
    }
  }
  const message = error ? (ERRORS[error] ?? "Something went wrong. Please request a new login code.") : undefined;
  return (
    <DoctorLoginShell doctor={doctor}>
      <DoctorLoginForm linkError={message} eyebrow="Website dashboard" />
    </DoctorLoginShell>
  );
}

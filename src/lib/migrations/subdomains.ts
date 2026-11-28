import "server-only";
import { ensureSubdomain as ensureDoctorSubdomain } from "@/lib/doctors/server";
import { ensureSubdomain as ensureSiteSubdomain } from "@/lib/establishments/server";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";

const noSubdomain = {
  $and: [
    { $or: [{ status: "published" }, { slug: { $type: "string" } }] },
    { $or: [{ subdomain: { $exists: false } }, { subdomain: null }, { subdomain: "" }] },
  ],
};

/**
 * Give every doctor, clinic and hospital that is live (or has a page address)
 * and no website address (subdomain) one, picked the same way as on save. Safe to
 * re-run: sites that already have one are never touched.
 */
export async function assignMissingSubdomains(): Promise<{ doctors: string[]; sites: string[] }> {
  const doctors: string[] = [];
  for (const doc of await DoctorProfile.find(noSubdomain)) {
    await ensureDoctorSubdomain(doc);
    if (!doc.subdomain) continue;
    // Only this field: no timestamps or validation of unrelated old data.
    await DoctorProfile.collection.updateOne({ _id: doc._id }, { $set: { subdomain: doc.subdomain } });
    doctors.push(`${doc.firstName} ${doc.lastName}: ${doc.subdomain}`);
  }
  const sites: string[] = [];
  for (const doc of await Establishment.find(noSubdomain)) {
    await ensureSiteSubdomain(doc);
    if (!doc.subdomain) continue;
    await Establishment.collection.updateOne({ _id: doc._id }, { $set: { subdomain: doc.subdomain } });
    sites.push(`${doc.name}: ${doc.subdomain}`);
  }
  return { doctors, sites };
}

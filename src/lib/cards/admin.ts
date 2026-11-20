import "server-only";
import { connectToDatabase } from "@/lib/db";
import { loadMasters, toPublicDoctor } from "@/lib/public/data";
import { DoctorProfile } from "@/models/DoctorProfile";
import { buildPublicEstablishment } from "@/lib/public/establishments";
import { Establishment } from "@/models/Establishment";
import type { PublicDoctor, PublicEstablishment } from "@/templates/types";

/**
 * PublicDoctor for any doctor (drafts included) — for dashboard card previews
 * and downloads. Drafts without an address yet get placeholder URL keys.
 */
export async function loadDoctorForCard(id: string): Promise<PublicDoctor | null> {
  await connectToDatabase();
  const [doc, masters] = await Promise.all([DoctorProfile.findById(id).lean(), loadMasters()]);
  if (!doc) return null;
  return toPublicDoctor({ ...doc, citySlug: doc.citySlug || "pune", slug: doc.slug || "draft" }, masters);
}

/** PublicEstablishment for any clinic/hospital (drafts included), for dashboard cards. */
export async function loadSiteForCard(id: string): Promise<PublicEstablishment | null> {
  await connectToDatabase();
  const doc = await Establishment.findById(id).lean();
  if (!doc) return null;
  return buildPublicEstablishment({ ...doc, citySlug: doc.citySlug || "pune", slug: doc.slug || "draft" });
}

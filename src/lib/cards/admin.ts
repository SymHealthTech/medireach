import "server-only";
import { connectToDatabase } from "@/lib/db";
import { getMasters, toPublicDoctor } from "@/lib/public/data";
import { DoctorProfile } from "@/models/DoctorProfile";
import type { PublicDoctor } from "@/templates/types";

/**
 * PublicDoctor for any doctor (drafts included) — for dashboard card previews
 * and downloads. Drafts without an address yet get placeholder URL keys.
 */
export async function loadDoctorForCard(id: string): Promise<PublicDoctor | null> {
  await connectToDatabase();
  const [doc, masters] = await Promise.all([DoctorProfile.findById(id).lean(), getMasters()]);
  if (!doc) return null;
  return toPublicDoctor({ ...doc, citySlug: doc.citySlug || "pune", slug: doc.slug || "draft" }, masters);
}

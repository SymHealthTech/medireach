import "server-only";
import { VisitingCard, type VisitingCardDoc } from "@/models/VisitingCard";
import { Doctor } from "@/models/Doctor";
import { signedAssetUrl } from "@/lib/integrations/cloudinary";

/**
 * Server helpers for the Digital Visiting Card feature. Kept separate from the
 * API routes so both the doctor's in-app management screen and the PUBLIC
 * `/card/[slug]` page can build the exact same read-only view without
 * duplicating logic (and, crucially, without either path ever selecting a
 * non-card field off the Doctor document).
 */

/** Turn a doctor's name into a readable, URL-safe slug base, e.g. "dr-rajesh-sharma". */
export function slugifyName(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  const cleaned = base || "doctor";
  return cleaned.startsWith("dr-") ? cleaned : `dr-${cleaned}`;
}

/**
 * Generate a slug unique across all cards. On collision, append the smallest
 * numeric suffix that is free (`dr-rajesh-sharma-2`, `-3`, …). Generated ONCE at
 * card creation; never regenerated on edit so shared links stay valid.
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugifyName(name);
  // Pull every slug that could conflict in one query, then pick a free one.
  const existing = await VisitingCard.find({
    slug: { $regex: `^${base}(-\\d+)?$` },
  })
    .select("slug")
    .lean();
  const taken = new Set(existing.map((c) => c.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * The strictly public shape rendered on `/card/[slug]`. ONLY visiting-card
 * fields plus the handful of profile fields a patient-facing card needs — never
 * any clinical, patient, billing, auth, or verification data.
 */
export interface PublicCardData {
  slug: string;
  name: string;
  degree: string;
  clinicName: string;
  clinicAddress: string;
  clinicTimings: string;
  registrationNumber: string;
  designation: string;
  callNumber: string; // doctor's mobile, used for the tel: button
  tagline: string;
  services: string[];
  languages: string[];
  whatsappNumber: string;
  mapsLink: string;
  profilePhotoUrl: string | null; // short-lived signed delivery URL
  coverPhotoUrl: string | null; // short-lived signed delivery URL
}

/** Signed delivery URL for an authenticated Cloudinary asset (valid ~1h so a
 *  dynamically-rendered public page load never serves an already-expired link). */
function deliver(publicId?: string | null, maxWidth?: number): string | null {
  return publicId ? signedAssetUrl(publicId, 3600, maxWidth) : null;
}

/**
 * Build the public view for a published card. Reads the live Doctor profile
 * (selecting ONLY card-relevant fields) so profile edits reflect immediately.
 * Returns null when the card is missing or unpublished (deleted) — the caller
 * renders the graceful "no longer available" page.
 */
export async function loadPublicCard(slug: string): Promise<PublicCardData | null> {
  const card = await VisitingCard.findOne({ slug, isPublished: true }).lean<VisitingCardDoc | null>();
  if (!card) return null;

  const doctor = await Doctor.findById(card.doctorId)
    .select("name degree clinicName clinicAddress clinicTimings registrationNumber mobile")
    .lean();
  if (!doctor) return null;

  return {
    slug: card.slug,
    name: doctor.name ?? "",
    degree: doctor.degree ?? "",
    clinicName: doctor.clinicName ?? "",
    clinicAddress: doctor.clinicAddress ?? "",
    clinicTimings: doctor.clinicTimings ?? "",
    registrationNumber: doctor.registrationNumber ?? "",
    designation: card.designation ?? "",
    callNumber: doctor.mobile ?? "",
    tagline: card.tagline ?? "",
    services: card.services ?? [],
    languages: card.languages ?? [],
    whatsappNumber: card.whatsappNumber ?? doctor.mobile ?? "",
    mapsLink: card.mapsLink ?? "",
    profilePhotoUrl: deliver(card.profilePhotoUrl, 240),
    coverPhotoUrl: deliver(card.coverPhotoUrl, 1040),
  };
}

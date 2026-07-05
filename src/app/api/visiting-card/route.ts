import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { requireActiveDoctor } from "@/lib/api/account";
import { requireDoctorId } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";
import { VisitingCard } from "@/models/VisitingCard";
import { generateUniqueSlug } from "@/lib/visiting-card";
import { signedAssetUrl } from "@/lib/integrations/cloudinary";
import { env } from "@/lib/env";

/**
 * Digital Visiting Card management API (doctor-only). Everything here is tenant-
 * scoped by the doctor's own id. The PUBLIC card lives at `/card/[slug]` and
 * reads through a separate, field-limited path — this route never exposes it.
 *
 *   GET    → prefill data (live profile) + the doctor's card, if any
 *   POST   → create (or re-publish a previously deleted) card, minting a slug
 *   PATCH  → edit card fields; slug is preserved so shared links keep working
 *   DELETE → unpublish (soft delete); public page then shows "no longer available"
 */

const cardSchema = z.object({
  profilePhotoPublicId: z.string().trim().optional(),
  coverPhotoPublicId: z.string().trim().optional(),
  designation: z.string().trim().max(120).optional(),
  tagline: z.string().trim().max(160).optional(),
  services: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  languages: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  whatsappNumber: z.string().trim().max(20).optional(),
  mapsLink: z.string().trim().max(500).optional(),
});

function publicUrl(slug: string): string {
  return `${env.appUrl().replace(/\/$/, "")}/card/${slug}`;
}

function preview(publicId?: string | null): string | null {
  return publicId ? signedAssetUrl(publicId, 3600) : null;
}

export const GET = route({ roles: Roles.doctorOnly }, async (_req, ctx) => {
  const doctor = await requireActiveDoctor(ctx);
  const card = await VisitingCard.findOne({ doctorId: requireDoctorId(ctx) }).lean();

  // Live profile fields the card pre-fills from — the doctor never re-enters these.
  const profile = {
    name: doctor.name,
    degree: doctor.degree,
    clinicName: doctor.clinicName,
    clinicAddress: doctor.clinicAddress,
    clinicTimings: doctor.clinicTimings,
    registrationNumber: doctor.registrationNumber,
    mobile: doctor.mobile,
    photoPublicId: doctor.photoPublicId ?? null,
  };

  return jsonOk({
    profile,
    // Only surface the card as "existing" once it is published; a soft-deleted
    // doc is treated as no card (POST will re-publish it, keeping the slug).
    card:
      card && card.isPublished
        ? {
            slug: card.slug,
            publicUrl: publicUrl(card.slug),
            profilePhotoPublicId: card.profilePhotoUrl ?? null,
            coverPhotoPublicId: card.coverPhotoUrl ?? null,
            profilePhotoPreview: preview(card.profilePhotoUrl),
            coverPhotoPreview: preview(card.coverPhotoUrl),
            designation: card.designation ?? "",
            tagline: card.tagline ?? "",
            services: card.services ?? [],
            languages: card.languages ?? [],
            whatsappNumber: card.whatsappNumber ?? "",
            mapsLink: card.mapsLink ?? "",
          }
        : null,
  });
});

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const doctor = await requireActiveDoctor(ctx);
  const data = await parseBody(req, cardSchema);
  const doctorId = requireDoctorId(ctx);

  // Profile photo is required on the card — reuse the one already on the profile
  // if the doctor didn't upload a new one.
  const profilePhoto = data.profilePhotoPublicId || doctor.photoPublicId;
  if (!profilePhoto) {
    throw Errors.badRequest("A profile photo is required for your visiting card.");
  }

  const fields = {
    profilePhotoUrl: profilePhoto,
    coverPhotoUrl: data.coverPhotoPublicId || "",
    designation: data.designation ?? "",
    tagline: data.tagline ?? "",
    services: data.services ?? [],
    languages: data.languages ?? [],
    whatsappNumber: (data.whatsappNumber || doctor.mobile) ?? "",
    mapsLink: data.mapsLink ?? "",
    isPublished: true,
  };

  // One card per doctor. If a (possibly soft-deleted) card already exists, update
  // it in place and keep its slug so previously shared links stay valid.
  const existing = await VisitingCard.findOne({ doctorId });
  if (existing) {
    existing.set(fields);
    await existing.save();
    await audit(ctx, "visitingCard.update", { targetType: "VisitingCard", targetId: existing._id });
    return jsonOk({ slug: existing.slug, publicUrl: publicUrl(existing.slug) }, 200);
  }

  const slug = await generateUniqueSlug(doctor.name);
  const created = await VisitingCard.create({ doctorId, slug, ...fields });
  await audit(ctx, "visitingCard.create", { targetType: "VisitingCard", targetId: created._id });
  return jsonOk({ slug: created.slug, publicUrl: publicUrl(created.slug) }, 201);
});

export const PATCH = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const doctor = await requireActiveDoctor(ctx);
  const data = await parseBody(req, cardSchema);
  const doctorId = requireDoctorId(ctx);

  const card = await VisitingCard.findOne({ doctorId });
  if (!card || !card.isPublished) throw Errors.notFound("No visiting card to edit.");

  const profilePhoto = data.profilePhotoPublicId || card.profilePhotoUrl || doctor.photoPublicId;
  if (!profilePhoto) {
    throw Errors.badRequest("A profile photo is required for your visiting card.");
  }

  // Edit in place — slug is intentionally never changed so shared links & QR codes
  // keep resolving.
  card.set({
    profilePhotoUrl: profilePhoto,
    coverPhotoUrl: data.coverPhotoPublicId || "",
    designation: data.designation ?? "",
    tagline: data.tagline ?? "",
    services: data.services ?? [],
    languages: data.languages ?? [],
    whatsappNumber: (data.whatsappNumber || doctor.mobile) ?? "",
    mapsLink: data.mapsLink ?? "",
  });
  await card.save();
  await audit(ctx, "visitingCard.update", { targetType: "VisitingCard", targetId: card._id });
  return jsonOk({ slug: card.slug, publicUrl: publicUrl(card.slug) });
});

export const DELETE = route({ roles: Roles.doctorOnly }, async (_req, ctx) => {
  const doctorId = requireDoctorId(ctx);
  const card = await VisitingCard.findOne({ doctorId });
  if (!card) throw Errors.notFound("No visiting card to delete.");
  // Soft delete: keep the doc (and slug) so the public URL can show a graceful
  // "no longer available" page instead of a hard 404.
  card.isPublished = false;
  await card.save();
  await audit(ctx, "visitingCard.delete", { targetType: "VisitingCard", targetId: card._id });
  return jsonOk({ ok: true });
});

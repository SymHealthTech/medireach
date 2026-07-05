import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * VisitingCard — a doctor's public "Digital Visiting Card" (feature: shareable
 * one-page web presence sent to patients). Tenant-scoped by `doctorId` like
 * every other clinic collection.
 *
 * Deliberately stores ONLY the card-specific extras. Name, degree, clinic
 * details, timings and registration number are read LIVE from the Doctor
 * document at render time (never duplicated here) so a profile edit keeps the
 * public card in sync automatically.
 *
 * `slug` is the public identifier in `/card/[slug]`; it is generated once at
 * creation and kept stable across edits so shared links never break.
 * `isPublished` flips to false on delete — the public route then shows a clean
 * "no longer available" page instead of a broken error.
 */
export interface VisitingCardDoc {
  _id: Types.ObjectId;
  doctorId: Types.ObjectId;
  slug: string;
  profilePhotoUrl?: string; // Cloudinary public_id (authenticated asset)
  coverPhotoUrl?: string; // Cloudinary public_id (authenticated asset), optional
  designation?: string; // e.g. "Consultant Physician" — card-specific, not on the profile
  tagline?: string;
  services: string[];
  languages: string[];
  whatsappNumber: string;
  mapsLink?: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const visitingCardSchema = new Schema<VisitingCardDoc>(
  {
    // One card per doctor — unique so a doctor can't accidentally own two.
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      unique: true,
      index: true,
    },
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    profilePhotoUrl: { type: String },
    coverPhotoUrl: { type: String },
    designation: { type: String, trim: true, default: "" },
    tagline: { type: String, trim: true, default: "" },
    services: { type: [String], default: [] },
    languages: { type: [String], default: [] },
    whatsappNumber: { type: String, default: "", trim: true },
    mapsLink: { type: String, default: "", trim: true },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const VisitingCard: Model<VisitingCardDoc> =
  (mongoose.models.VisitingCard as Model<VisitingCardDoc>) ||
  mongoose.model<VisitingCardDoc>("VisitingCard", visitingCardSchema);

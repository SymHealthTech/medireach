import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Editable site content (spec §6.6) — Privacy Policy, Medical Disclaimer, User
 * Guide. Stored in the DB so admin can update them without a code deploy
 * (§6.6); the public/static pages read from here with hardcoded fallbacks.
 */
export type ContentSlug = "privacy-policy" | "medical-disclaimer" | "user-guide";

export interface ContentDoc {
  _id: Types.ObjectId;
  slug: ContentSlug;
  title: string;
  body: string; // markdown/plain text
  updatedAt: Date;
  createdAt: Date;
}

const contentSchema = new Schema<ContentDoc>(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
  },
  { timestamps: true },
);

export const Content: Model<ContentDoc> =
  (mongoose.models.Content as Model<ContentDoc>) ||
  mongoose.model<ContentDoc>("Content", contentSchema);

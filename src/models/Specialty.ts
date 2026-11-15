import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Specialty master. `name` is the singular used in page titles ("General
 * Physician"); `plural` is used in hub headings ("General Physicians in Kothrud").
 */
export interface SpecialtyDoc {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  plural: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const specialtySchema = new Schema<SpecialtyDoc>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    plural: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
  },
  { timestamps: true },
);

export const Specialty: Model<SpecialtyDoc> =
  (mongoose.models.Specialty as Model<SpecialtyDoc>) ||
  mongoose.model<SpecialtyDoc>("Specialty", specialtySchema);

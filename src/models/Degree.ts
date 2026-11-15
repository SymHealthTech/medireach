import mongoose, { Schema, type Model, type Types } from "mongoose";

/** Degree / diploma master (MBBS, MD, BAMS, …). */
export interface DegreeDoc {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

const degreeSchema = new Schema<DegreeDoc>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  { timestamps: true },
);

export const Degree: Model<DegreeDoc> =
  (mongoose.models.Degree as Model<DegreeDoc>) || mongoose.model<DegreeDoc>("Degree", degreeSchema);

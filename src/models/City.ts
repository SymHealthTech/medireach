import mongoose, { Schema, type Model, type Types } from "mongoose";

/** City master. Slug is the first URL segment: /pune/… */
export interface CityDoc {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  state: string;
  createdAt: Date;
  updatedAt: Date;
}

const citySchema = new Schema<CityDoc>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    state: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export const City: Model<CityDoc> =
  (mongoose.models.City as Model<CityDoc>) || mongoose.model<CityDoc>("City", citySchema);

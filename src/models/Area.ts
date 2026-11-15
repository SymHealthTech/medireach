import mongoose, { Schema, type Model, type Types } from "mongoose";

/** Area (locality) master. Slug is unique within its city. */
export interface AreaDoc {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  cityId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const areaSchema = new Schema<AreaDoc>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    cityId: { type: Schema.Types.ObjectId, ref: "City", required: true },
  },
  { timestamps: true },
);

areaSchema.index({ cityId: 1, slug: 1 }, { unique: true });
areaSchema.index({ cityId: 1, name: 1 });

export const Area: Model<AreaDoc> =
  (mongoose.models.Area as Model<AreaDoc>) || mongoose.model<AreaDoc>("Area", areaSchema);

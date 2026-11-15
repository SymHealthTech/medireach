import mongoose, { Schema, type Model, type Types } from "mongoose";

/** Hospital account: bulk pages for its visiting consultants. */
export interface HospitalDoc {
  _id: Types.ObjectId;
  name: string;
  cityId: Types.ObjectId;
  areaId?: Types.ObjectId;
  address?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  pricePerDoctor?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const hospitalSchema = new Schema<HospitalDoc>(
  {
    name: { type: String, required: true, trim: true },
    cityId: { type: Schema.Types.ObjectId, ref: "City", required: true },
    areaId: { type: Schema.Types.ObjectId, ref: "Area" },
    address: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    pricePerDoctor: { type: Number, min: 0 },
    notes: { type: String },
  },
  { timestamps: true },
);

hospitalSchema.index({ cityId: 1, name: 1 });

export const Hospital: Model<HospitalDoc> =
  (mongoose.models.Hospital as Model<HospitalDoc>) ||
  mongoose.model<HospitalDoc>("Hospital", hospitalSchema);

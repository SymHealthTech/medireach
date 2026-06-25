import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Medicine — per-doctor personal autocomplete list (spec §7.3, §13). New brand
 * names spoken during dictation are auto-added with `voiceLearned: true`.
 * Strictly personal — scoped by `doctorId`, never shared across doctors.
 */
export interface MedicineDoc {
  _id: Types.ObjectId;
  doctorId: Types.ObjectId;
  name: string;
  generic: string;
  voiceLearned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const medicineSchema = new Schema<MedicineDoc>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
    name: { type: String, required: true, trim: true },
    generic: { type: String, default: "" },
    voiceLearned: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// One entry per name per doctor (case-insensitive collation).
medicineSchema.index(
  { doctorId: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);

export const MedicineEntry: Model<MedicineDoc> =
  (mongoose.models.MedicineEntry as Model<MedicineDoc>) ||
  mongoose.model<MedicineDoc>("MedicineEntry", medicineSchema);

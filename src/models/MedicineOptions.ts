import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Per-doctor custom dropdown options for the medicine editor.
 * One document per doctor; arrays grow via $addToSet as the doctor adds values.
 */
export interface MedicineOptionsDoc {
  _id: Types.ObjectId;
  doctorId: Types.ObjectId;
  types: string[];
  doses: string[];
  frequencies: string[];
  timings: string[];
}

const schema = new Schema<MedicineOptionsDoc>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true, unique: true, index: true },
    types:       { type: [String], default: [] },
    doses:       { type: [String], default: [] },
    frequencies: { type: [String], default: [] },
    timings:     { type: [String], default: [] },
  },
  { timestamps: true },
);

export const MedicineOptions: Model<MedicineOptionsDoc> =
  (mongoose.models.MedicineOptions as Model<MedicineOptionsDoc>) ||
  mongoose.model<MedicineOptionsDoc>("MedicineOptions", schema);

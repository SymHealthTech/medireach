import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * CustomKeyword — doctor-personalized shorthand dictionary (spec §9.5, §13),
 * e.g. "p5" → "Tab. Paracetamol 500mg". Passed as context to the Claude
 * structuring layer so shorthand expands correctly. Strictly personal.
 */
export interface CustomKeywordDoc {
  _id: Types.ObjectId;
  doctorId: Types.ObjectId;
  keyword: string;
  expansion: string;
  createdAt: Date;
  updatedAt: Date;
}

const customKeywordSchema = new Schema<CustomKeywordDoc>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
    keyword: { type: String, required: true, trim: true },
    expansion: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

customKeywordSchema.index(
  { doctorId: 1, keyword: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);

export const CustomKeyword: Model<CustomKeywordDoc> =
  (mongoose.models.CustomKeyword as Model<CustomKeywordDoc>) ||
  mongoose.model<CustomKeywordDoc>("CustomKeyword", customKeywordSchema);

import mongoose, { Schema, type Model, type Types } from "mongoose";
import { KEYWORD_FIELD_KEYS, type KeywordField, type MedicineSource } from "@/lib/constants";

/**
 * CustomKeyword — doctor-personalized shorthand dictionary (spec §9.5, §13),
 * e.g. "p5" → "Tab. Paracetamol 500mg". Passed as context to the Claude
 * structuring layer so shorthand expands correctly. Strictly personal.
 *
 * Every keyword belongs to a `field` (see KEYWORD_FIELDS) so a shortcut expands
 * into the right consultation field. `medicine` keywords additionally carry a
 * structured payload that fills all medicine sub-fields at once; other fields
 * only use the free-text `expansion`.
 */
export interface KeywordMedicine {
  type?: string;
  name?: string;
  generic?: string;
  dose?: string;
  frequency?: string;
  timing?: string;
  source?: MedicineSource;
}

export interface CustomKeywordDoc {
  _id: Types.ObjectId;
  doctorId: Types.ObjectId;
  field: KeywordField;
  keyword: string;
  expansion: string;
  medicine?: KeywordMedicine;
  createdAt: Date;
  updatedAt: Date;
}

const medicineSchema = new Schema<KeywordMedicine>(
  {
    type: String,
    name: String,
    generic: String,
    dose: String,
    frequency: String,
    timing: String,
    source: { type: String, enum: ["clinic", "pharmacy"] },
  },
  { _id: false },
);

const customKeywordSchema = new Schema<CustomKeywordDoc>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
    field: { type: String, enum: KEYWORD_FIELD_KEYS, required: true, default: "medicine" },
    keyword: { type: String, required: true, trim: true },
    expansion: { type: String, required: true, trim: true },
    medicine: { type: medicineSchema, required: false },
  },
  { timestamps: true },
);

// A shortcut is unique per doctor (case-insensitive) across all fields — a given
// shorthand maps to exactly one expansion. Re-adding the same shortcut re-assigns
// it to the new field. This matches the index already present on existing
// databases, so no index migration is required.
customKeywordSchema.index(
  { doctorId: 1, keyword: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);

export const CustomKeyword: Model<CustomKeywordDoc> =
  (mongoose.models.CustomKeyword as Model<CustomKeywordDoc>) ||
  mongoose.model<CustomKeywordDoc>("CustomKeyword", customKeywordSchema);

import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * PrescriptionTemplate — per-doctor layout choice + sponsor footer content
 * (spec §8, §13). v1 is preset-plus-light-customization (Open Decision §16.3
 * default): a doctor picks one of 4–5 presets and adjusts clinic name/logo
 * placement. `presetKey` identifies the chosen preset; `footer` holds the
 * sponsoring medical store's details (the ad slot, §8).
 */
export interface PrescriptionTemplateDoc {
  _id: Types.ObjectId;
  doctorId: Types.ObjectId;
  presetKey: string; // TemplateId of the chosen A4 template (spec §8 redesign)
  clinicNameOverride?: string;
  logoPlacement: "left" | "center" | "right";
  signaturePublicId?: string; // Cloudinary public_id of the doctor's signature (§15.3)
  footer?: {
    storeName?: string;
    storeAddress?: string;
    storeContact?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const prescriptionTemplateSchema = new Schema<PrescriptionTemplateDoc>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
    presetKey: { type: String, required: true, default: "teal-classic" },
    clinicNameOverride: { type: String },
    logoPlacement: { type: String, enum: ["left", "center", "right"], default: "left" },
    signaturePublicId: { type: String },
    footer: {
      storeName: String,
      storeAddress: String,
      storeContact: String,
    },
  },
  { timestamps: true },
);

export const PrescriptionTemplate: Model<PrescriptionTemplateDoc> =
  (mongoose.models.PrescriptionTemplate as Model<PrescriptionTemplateDoc>) ||
  mongoose.model<PrescriptionTemplateDoc>(
    "PrescriptionTemplate",
    prescriptionTemplateSchema,
  );

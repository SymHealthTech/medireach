import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Sponsor — a medical store sponsoring a doctor's prescription footer (spec §8,
 * §13). The store can pay the doctor's subscription via a shared payment link
 * in exchange for the marketing placement. `paymentResponsibility` mirrors the
 * Invoice payer field; if the sponsor lapses, liability reverts to the doctor
 * (Open Decision §16.4 default) — handled in the billing layer.
 */
export interface SponsorDoc {
  _id: Types.ObjectId;
  doctorId: Types.ObjectId;
  storeName: string;
  contactNumber: string;
  footerContent: string;
  paymentResponsibility: "active" | "lapsed";
  contractStart?: Date;
  contractRenewal?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sponsorSchema = new Schema<SponsorDoc>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
    storeName: { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true, trim: true },
    footerContent: { type: String, default: "" },
    paymentResponsibility: { type: String, enum: ["active", "lapsed"], default: "active" },
    contractStart: { type: Date },
    contractRenewal: { type: Date },
  },
  { timestamps: true },
);

export const Sponsor: Model<SponsorDoc> =
  (mongoose.models.Sponsor as Model<SponsorDoc>) ||
  mongoose.model<SponsorDoc>("Sponsor", sponsorSchema);

import mongoose, { Schema, type Model, type Types } from "mongoose";
import { PAYMENT_MODES, PAYMENT_PURPOSES } from "@/lib/constants";

/** Manually recorded payment (no online payments in this phase). */
export interface PaymentDoc {
  _id: Types.ObjectId;
  doctorId?: Types.ObjectId;
  hospitalId?: Types.ObjectId;
  amount: number;
  gstIncluded: boolean;
  mode: (typeof PAYMENT_MODES)[number];
  date: Date;
  purpose: (typeof PAYMENT_PURPOSES)[number];
  invoiceNo?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<PaymentDoc>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "DoctorProfile", index: true },
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", index: true },
    amount: { type: Number, required: true, min: 0 },
    gstIncluded: { type: Boolean, default: true },
    mode: { type: String, enum: PAYMENT_MODES, required: true },
    date: { type: Date, required: true },
    purpose: { type: String, enum: PAYMENT_PURPOSES, required: true },
    invoiceNo: { type: String, trim: true },
    notes: { type: String },
  },
  { timestamps: true },
);

paymentSchema.index({ date: -1 });
paymentSchema.index(
  { invoiceNo: 1 },
  { unique: true, partialFilterExpression: { invoiceNo: { $type: "string" } } },
);

export const Payment: Model<PaymentDoc> =
  (mongoose.models.Payment as Model<PaymentDoc>) ||
  mongoose.model<PaymentDoc>("Payment", paymentSchema);

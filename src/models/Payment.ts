import mongoose, { Schema, type Model, type Types } from "mongoose";
import { PAYMENT_MODES, PAYMENT_PURPOSES, PAYMENT_PURPOSES_V2 } from "@/lib/constants";

/** v1 purposes (hospital_bulk) stay valid until payments move to v2 (step 5); migrate:v2 maps the data. */
const PURPOSE_VALUES = [...new Set([...PAYMENT_PURPOSES_V2, ...PAYMENT_PURPOSES])];

/** Manually recorded payment (no online payments in this phase). */
export interface PaymentDoc {
  _id: Types.ObjectId;
  doctorId?: Types.ObjectId;
  /** @deprecated v1; replaced by establishmentId (removed in step 5). */
  hospitalId?: Types.ObjectId;
  establishmentId?: Types.ObjectId;
  amount: number;
  gstIncluded: boolean;
  mode: (typeof PAYMENT_MODES)[number];
  date: Date;
  purpose: (typeof PAYMENT_PURPOSES)[number] | (typeof PAYMENT_PURPOSES_V2)[number];
  invoiceNo?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<PaymentDoc>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "DoctorProfile", index: true },
    hospitalId: { type: Schema.Types.ObjectId, ref: "Establishment", index: true },
    establishmentId: { type: Schema.Types.ObjectId, ref: "Establishment", index: true },
    amount: { type: Number, required: true, min: 0 },
    gstIncluded: { type: Boolean, default: true },
    mode: { type: String, enum: PAYMENT_MODES, required: true },
    date: { type: Date, required: true },
    purpose: { type: String, enum: PURPOSE_VALUES, required: true },
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

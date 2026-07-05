import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  INVOICE_STATUSES,
  PAYER_TYPES,
  type InvoiceStatus,
  type PayerType,
} from "@/lib/constants";

/**
 * Invoice — one per closed 30-day billing cycle (spec §11, §13). `amount` is
 * the output of the tested "greater of ₹299 or per-patient total" function.
 * `payer` records whether the doctor or a sponsoring store is responsible for
 * this period (§8). Cycle boundaries derive purely from the doctor's fixed
 * cycleStartDate and never drift with payment timing (§11).
 */
export interface InvoiceDoc {
  _id: Types.ObjectId;
  doctorId: Types.ObjectId;
  cycleNumber: number; // 1-based cycle index since signup
  periodStart: Date;
  periodEnd: Date;
  patientCount: number;
  amount: number; // INR — gross total (GST-inclusive when tax is enabled)
  // GST breakup captured at generation (spec §11, India). With inclusive pricing
  // `amount` is unchanged; these record the split for the tax invoice. All 0 when
  // tax is disabled (taxableValue then equals amount).
  taxRate: number; // %
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxInterState: boolean;
  status: InvoiceStatus;
  dueDate: Date; // = periodEnd (day 30)
  graceEndDate: Date; // day 40
  payer: PayerType;
  sponsorId?: Types.ObjectId;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paidAt?: Date;
  adminAdjustmentNote?: string; // manual mark-paid / credit (§6.2)
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<InvoiceDoc>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
    cycleNumber: { type: Number, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    patientCount: { type: Number, required: true, default: 0, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    taxableValue: { type: Number, default: 0, min: 0 },
    cgst: { type: Number, default: 0, min: 0 },
    sgst: { type: Number, default: 0, min: 0 },
    igst: { type: Number, default: 0, min: 0 },
    taxInterState: { type: Boolean, default: true },
    status: { type: String, enum: INVOICE_STATUSES, default: "pending", index: true },
    dueDate: { type: Date, required: true },
    graceEndDate: { type: Date, required: true },
    payer: { type: String, enum: PAYER_TYPES, default: "doctor" },
    sponsorId: { type: Schema.Types.ObjectId, ref: "Sponsor" },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    paidAt: { type: Date },
    adminAdjustmentNote: { type: String },
  },
  { timestamps: true },
);

// One invoice per doctor per cycle.
invoiceSchema.index({ doctorId: 1, cycleNumber: 1 }, { unique: true });

export const Invoice: Model<InvoiceDoc> =
  (mongoose.models.Invoice as Model<InvoiceDoc>) ||
  mongoose.model<InvoiceDoc>("Invoice", invoiceSchema);

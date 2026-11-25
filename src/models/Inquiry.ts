import mongoose, { Schema, type Model, type Types } from "mongoose";
import { INQUIRY_STATUSES, INQUIRY_TIMES, type InquiryStatus, type InquiryTime } from "@/lib/inquiries";

export { INQUIRY_STATUSES, INQUIRY_TIMES, type InquiryStatus, type InquiryTime };

/**
 * Inquiry — an appointment request or question sent from the contact form on a
 * doctor's page. The doctor sees it in their account (/account/inquiries) and
 * gets an email. Patients' details stay private: never shown on public pages,
 * and only the owning doctor (and the team's dashboard) can read them.
 *
 * NMC: this is a contact channel only. No reviews or ratings are collected.
 */

export interface InquiryDoc {
  _id: Types.ObjectId;
  doctorId: Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  /** The clinic picked on the form (DoctorProfile.clinics[]._id), with its name kept for history. */
  clinicId?: Types.ObjectId;
  clinicName?: string;
  preferredDate?: Date;
  preferredTime?: InquiryTime;
  message?: string;
  status: InquiryStatus;
  /** Private note the doctor keeps for themselves. */
  note?: string;
  /** The page it came from ("subdomain", "page", "demo"). */
  via?: string;
  emailedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const inquirySchema = new Schema<InquiryDoc>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "DoctorProfile", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    clinicId: { type: Schema.Types.ObjectId },
    clinicName: { type: String, trim: true, maxlength: 120 },
    preferredDate: { type: Date },
    preferredTime: { type: String, enum: INQUIRY_TIMES },
    message: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: INQUIRY_STATUSES, default: "new" },
    note: { type: String, trim: true, maxlength: 500 },
    via: { type: String, trim: true, maxlength: 20 },
    emailedAt: { type: Date },
  },
  { timestamps: true },
);

inquirySchema.index({ doctorId: 1, createdAt: -1 });
inquirySchema.index({ doctorId: 1, status: 1 });

export const Inquiry: Model<InquiryDoc> =
  (mongoose.models.Inquiry as Model<InquiryDoc>) || mongoose.model<InquiryDoc>("Inquiry", inquirySchema);

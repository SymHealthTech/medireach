import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  ACCOUNT_STATUSES,
  DOC_REVIEW_STATUSES,
  SOS_CONTACT_STATUSES,
  VERIFICATION_DOC_TYPES,
  MAX_SOS_CONTACTS,
  type AccountStatus,
  type DocReviewStatus,
  type SosContactStatus,
  type VerificationDocType,
} from "@/lib/constants";

/**
 * Doctor — the primary tenant of the system (spec §5.1, §13). Every other
 * clinic-scoped collection references this document's _id as `doctorId`.
 */

export interface EmergencyContact {
  contactDoctorId: Types.ObjectId; // ref Doctor — contacts are other doctors (§10)
  status: SosContactStatus; // must be accepted before alerts reach them
  addedAt: Date;
}

export interface VerificationDocument {
  publicId: string; // Cloudinary public_id (signed retrieval only, §15.3)
  type: VerificationDocType;
  reviewStatus: DocReviewStatus; // submitted → reviewed/flagged (admin, §6.1)
  submittedAt: Date;
  reviewedAt?: Date;
}

export interface TrustedDevice {
  tokenHash: string; // hashed trusted-device token (§15.1, new-device OTP model)
  label: string;
  lastSeenAt: Date;
}

export interface DoctorDoc {
  _id: Types.ObjectId;
  // identity / auth
  name: string;
  email: string;
  mobile: string;
  mobileVerified: boolean;
  passwordHash: string;
  appId: string; // "MR-00142" (§12), assigned on onboarding completion
  // profile
  photoPublicId?: string;
  registrationNumber: string;
  degree: string;
  clinicName: string;
  clinicAddress: string;
  clinicTimings: string;
  // preferences
  themePreference: "light" | "dark";
  defaultWhatsappTarget: "patient" | "clinic" | "receptionist" | "store";
  selectedTemplateId?: Types.ObjectId;
  // relations / verification
  emergencyContacts: EmergencyContact[];
  verificationDocument?: VerificationDocument;
  trustedDevices: TrustedDevice[];
  // lifecycle / billing
  accountStatus: AccountStatus;
  onboardingStep: number; // 0..7 (§5.3); 7 = complete
  cycleStartDate?: Date; // fixed at ₹99 payment; never recalculated (§11)
  // Unsubscribe takes effect at the end of the current paid cycle, not
  // immediately (§12) — these track that pending state.
  pendingUnsubscribe: boolean;
  unsubscribeEffectiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const emergencyContactSchema = new Schema<EmergencyContact>(
  {
    contactDoctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    status: { type: String, enum: SOS_CONTACT_STATUSES, default: "pending" },
    addedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const verificationDocumentSchema = new Schema<VerificationDocument>(
  {
    publicId: { type: String, required: true },
    type: { type: String, enum: VERIFICATION_DOC_TYPES, required: true },
    reviewStatus: { type: String, enum: DOC_REVIEW_STATUSES, default: "submitted" },
    submittedAt: { type: Date, default: () => new Date() },
    reviewedAt: { type: Date },
  },
  { _id: false },
);

const trustedDeviceSchema = new Schema<TrustedDevice>(
  {
    tokenHash: { type: String, required: true },
    label: { type: String, default: "" },
    lastSeenAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const doctorSchema = new Schema<DoctorDoc>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    mobileVerified: { type: Boolean, default: false },
    passwordHash: { type: String, required: true },
    appId: { type: String, unique: true, sparse: true },

    photoPublicId: { type: String },
    registrationNumber: { type: String, default: "" },
    degree: { type: String, default: "" },
    clinicName: { type: String, default: "" },
    clinicAddress: { type: String, default: "" },
    clinicTimings: { type: String, default: "" },

    themePreference: { type: String, enum: ["light", "dark"], default: "light" },
    defaultWhatsappTarget: {
      type: String,
      enum: ["patient", "clinic", "receptionist", "store"],
      default: "patient",
    },
    selectedTemplateId: { type: Schema.Types.ObjectId, ref: "PrescriptionTemplate" },

    emergencyContacts: {
      type: [emergencyContactSchema],
      default: [],
      validate: {
        validator: (v: EmergencyContact[]) => v.length <= MAX_SOS_CONTACTS,
        message: `A doctor may have at most ${MAX_SOS_CONTACTS} emergency contacts.`,
      },
    },
    verificationDocument: { type: verificationDocumentSchema },
    trustedDevices: { type: [trustedDeviceSchema], default: [] },

    accountStatus: {
      type: String,
      enum: ACCOUNT_STATUSES,
      default: "incomplete-onboarding",
    },
    onboardingStep: { type: Number, default: 0, min: 0, max: 7 },
    cycleStartDate: { type: Date },
    pendingUnsubscribe: { type: Boolean, default: false },
    unsubscribeEffectiveAt: { type: Date },
  },
  { timestamps: true },
);

export const Doctor: Model<DoctorDoc> =
  (mongoose.models.Doctor as Model<DoctorDoc>) ||
  mongoose.model<DoctorDoc>("Doctor", doctorSchema);

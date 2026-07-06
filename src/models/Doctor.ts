import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  ACCOUNT_STATUSES,
  DOC_REVIEW_STATUSES,
  SOS_CONTACT_STATUSES,
  VERIFICATION_DOC_TYPES,
  TIERS,
  DEFAULT_TIER,
  MAX_SOS_CONTACTS,
  type AccountStatus,
  type DocReviewStatus,
  type SosContactStatus,
  type VerificationDocType,
  type Tier,
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

/**
 * A tier change scheduled to apply at the next cycle boundary. Used for
 * DOWNGRADES (Pro → Starter): the doctor keeps voice/AI until the current paid
 * cycle ends, then the billing cron applies this at rollover. Null when no
 * change is pending. Upgrades (Starter → Pro) are immediate and never pending.
 */
export interface TierChangePending {
  toTier: Tier;
  effectiveAtCycleStart: Date; // == periodEnd of the cycle in effect when requested
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
  clinicStateCode: string; // 2-digit GST state code (India) — intra/inter-state tax split
  clinicTimings: string;
  // preferences
  themePreference: "light" | "dark";
  defaultWhatsappTarget: "patient" | "clinic" | "receptionist" | "store";
  selectedTemplateId?: Types.ObjectId;
  // whatsapp contact numbers (used when constructing wa.me links)
  clinicWhatsapp: string;
  receptionistWhatsapp: string;
  storeWhatsapp: string;
  // relations / verification
  emergencyContacts: EmergencyContact[];
  verificationDocument?: VerificationDocument;
  trustedDevices: TrustedDevice[];
  // lifecycle / billing
  accountStatus: AccountStatus;
  // Subscription tier (two-tier system). Gates voice/AI access: a `starter`
  // account can NEVER reach a paid API (enforced by requireProTier). Defaults to
  // `starter` for new and existing accounts.
  tier: Tier;
  // Scheduled downgrade to apply at the next cycle boundary; null when none.
  tierChangePending?: TierChangePending | null;
  // Tier the CURRENTLY-OPEN cycle is billed at. Snapshotted at each cycle
  // rollover (and captured on immediate upgrade so the current cycle is NOT
  // retro-billed as Pro). Invoicing reads this, not the live `tier`, so an
  // immediate upgrade unlocks voice now but the current cycle still bills as
  // Starter — Pro per-patient billing begins next cycle.
  currentCycleTier: Tier;
  onboardingStep: number; // 0..7 (§5.3); 7 = complete
  cycleStartDate?: Date; // fixed at ₹99 payment; never recalculated (§11)
  // Unsubscribe takes effect at the end of the current paid cycle, not
  // immediately (§12) — these track that pending state.
  pendingUnsubscribe: boolean;
  unsubscribeEffectiveAt?: Date;
  // Incremented on every successful login; sessions carrying an older value are
  // rejected, enforcing single-device access (§15.1).
  sessionVersion: number;
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
    clinicStateCode: { type: String, default: "" },
    clinicTimings: { type: String, default: "" },

    themePreference: { type: String, enum: ["light", "dark"], default: "light" },
    defaultWhatsappTarget: {
      type: String,
      enum: ["patient", "clinic", "receptionist", "store"],
      default: "patient",
    },
    selectedTemplateId: { type: Schema.Types.ObjectId, ref: "PrescriptionTemplate" },
    clinicWhatsapp: { type: String, default: "" },
    receptionistWhatsapp: { type: String, default: "" },
    storeWhatsapp: { type: String, default: "" },

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
    tier: { type: String, enum: TIERS, default: DEFAULT_TIER },
    tierChangePending: {
      type: new Schema<TierChangePending>(
        {
          toTier: { type: String, enum: TIERS, required: true },
          effectiveAtCycleStart: { type: Date, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
    currentCycleTier: { type: String, enum: TIERS, default: DEFAULT_TIER },
    onboardingStep: { type: Number, default: 0, min: 0, max: 7 },
    cycleStartDate: { type: Date },
    pendingUnsubscribe: { type: Boolean, default: false },
    unsubscribeEffectiveAt: { type: Date },
    sessionVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Doctor: Model<DoctorDoc> =
  (mongoose.models.Doctor as Model<DoctorDoc>) ||
  mongoose.model<DoctorDoc>("Doctor", doctorSchema);

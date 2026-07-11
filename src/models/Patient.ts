import mongoose, { Schema, type Model, type Types } from "mongoose";
import { RECORD } from "@/lib/constants";

/**
 * Patient — demographic + intake record, scoped to one doctor (spec §7.2,
 * §13). Vitals captured at registration live here; clinical history lives on
 * Visit. `doctorId` is indexed and required for multi-tenant isolation (§13).
 *
 * `consentAt` records the plain-language registration consent (§7.2, §15.8) —
 * a record should never be saved without it.
 */
export interface PatientDoc {
  _id: Types.ObjectId;
  doctorId: Types.ObjectId;
  // Human-facing patient ID, unique per clinic (e.g. "P-0001"), minted from a
  // per-doctor atomic sequence at registration. Searchable in Records alongside
  // name/mobile. Absent on patients created before this field existed.
  code?: string;
  name: string;
  gender: "male" | "female" | "other";
  dob?: Date;
  ageYears?: number; // captured when DOB unknown
  mobile: string;
  address: string;
  // intake vitals (receptionist-entered, §7.2)
  bp?: string;
  weightKg?: number;
  heightCm?: number;
  temp?: string;
  allergicTo?: string;
  referredBy?: string;
  emergencyContact?: string;
  consentAt: Date;
  registeredAt: Date;
  // retention: hard-deleted by the daily purge job after RETENTION_DAYS (§9.3)
  purgeAfter: Date;
  createdAt: Date;
  updatedAt: Date;
}

const patientSchema = new Schema<PatientDoc>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
    code: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    dob: { type: Date },
    ageYears: { type: Number, min: 0, max: 130 },
    mobile: { type: String, required: true, trim: true, index: true },
    address: { type: String, default: "" },
    bp: { type: String },
    weightKg: { type: Number, min: 0 },
    heightCm: { type: Number, min: 0 },
    temp: { type: String },
    allergicTo: { type: String },
    referredBy: { type: String },
    emergencyContact: { type: String },
    consentAt: { type: Date, required: true },
    registeredAt: { type: Date, default: () => new Date() },
    purgeAfter: {
      type: Date,
      default: () => new Date(Date.now() + RECORD.RETENTION_DAYS * 86_400_000),
      index: true,
    },
  },
  { timestamps: true },
);

// Receptionist lookup by mobile within a clinic; family members share a number.
patientSchema.index({ doctorId: 1, mobile: 1 });
// Records search by the human-facing patient ID within a clinic. Uniqueness is
// guaranteed by the per-doctor sequence, so a plain (non-unique) index suffices
// and avoids null-collisions on legacy patients that predate the field.
patientSchema.index({ doctorId: 1, code: 1 });

// In development, delete the cached model on every module evaluation so that
// schema changes (new fields, etc.) take effect across Next.js hot-reloads
// without needing a full dev-server restart.
if (process.env.NODE_ENV !== "production") {
  delete (mongoose.models as Record<string, unknown>).Patient;
}

export const Patient: Model<PatientDoc> =
  (mongoose.models.Patient as Model<PatientDoc>) ||
  mongoose.model<PatientDoc>("Patient", patientSchema);

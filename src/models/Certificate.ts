import mongoose, { Schema, type Model, type Types } from "mongoose";
import { RECORD } from "@/lib/constants";
import { CERTIFICATE_TYPES, type CertificateType } from "@/lib/certificate/types";

/**
 * Certificate — an issued medical/fitness certificate, scoped to one doctor
 * (spec: Medical Certificates feature; §13 multi-tenant isolation). This is a
 * clinical/legal document, so it is doctor-only — the receptionist never
 * creates or reads it (enforced at the API layer, §5.2).
 *
 * The generated PDF is stored on Cloudinary as an authenticated asset; we
 * persist only its `public_id` (`pdfAssetRef`) — signed, expiring delivery URLs
 * are minted on demand, never stored (§15.3). Records follow the same 1-year
 * retention as visits (`purgeAfter`, §9.3), and the daily purge job deletes the
 * associated Cloudinary asset.
 */
export interface CertificateDoc {
  _id: Types.ObjectId;
  doctorId: Types.ObjectId;
  patientId: Types.ObjectId;
  /** Denormalized at issue time so the legal records list stays searchable even
   *  after the patient row is purged on the ordinary 1-year schedule. */
  patientName: string;
  /** The originating queue visit, when issued via the certificate-only fast
   *  path — lets issuing the certificate complete that visit. */
  visitId?: Types.ObjectId;
  type: CertificateType;
  // Type-specific fields (only the relevant subset is set per type).
  diagnosis?: string;          // type 1: reason for unfitness
  fromDate?: Date;             // type 1: leave from
  toDate?: Date;               // type 1: leave to
  days?: number;               // type 1: inclusive leave days (auto-calculated)
  illness?: string;            // type 2: prior illness recovered from
  resumeDate?: Date;           // type 2: fit to resume from
  jobPurpose?: string;         // type 3: job / employment purpose
  examinationSummary?: string; // type 3: optional exam summary
  remarks?: string;            // type 1 & 2: optional remarks
  certificateDate: Date;
  pdfAssetRef?: string;        // Cloudinary public_id of the shared certificate PDF (§15.3)
  purgeAfter: Date;            // §9.3 retention
  createdAt: Date;
  updatedAt: Date;
}

const certificateSchema = new Schema<CertificateDoc>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    patientName: { type: String, default: "" },
    visitId: { type: Schema.Types.ObjectId, ref: "Visit" },
    type: { type: String, enum: CERTIFICATE_TYPES, required: true },

    diagnosis: { type: String },
    fromDate: { type: Date },
    toDate: { type: Date },
    days: { type: Number, min: 0 },
    illness: { type: String },
    resumeDate: { type: Date },
    jobPurpose: { type: String },
    examinationSummary: { type: String },
    remarks: { type: String },

    certificateDate: { type: Date, required: true, default: () => new Date() },
    pdfAssetRef: { type: String },
    // Longer retention than ordinary visit data: certificates are legal
    // instruments (§ certificate retention). Excluded from the 1-year purge.
    purgeAfter: {
      type: Date,
      default: () => new Date(Date.now() + RECORD.CERTIFICATE_RETENTION_DAYS * 86_400_000),
      index: true,
    },
  },
  { timestamps: true },
);

// A patient's certificate history, newest first, is the primary read.
certificateSchema.index({ doctorId: 1, patientId: 1, createdAt: -1 });

export const Certificate: Model<CertificateDoc> =
  (mongoose.models.Certificate as Model<CertificateDoc>) ||
  mongoose.model<CertificateDoc>("Certificate", certificateSchema);

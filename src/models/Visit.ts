import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  MEDICINE_SOURCES,
  VISIT_STATUSES,
  VISIT_TYPES,
  RECORD,
  type MedicineSource,
  type VisitStatus,
  type VisitType,
} from "@/lib/constants";

/**
 * Visit — a single consultation (spec §7.3, §13). This is the record whose
 * `status` drives the receptionist permission lock (§5.2): while `draft` the
 * receptionist may edit/delete the queued entry; the doctor's Confirm flips it
 * to `confirmed`, which locks the receptionist out — no separate flag (§5.2).
 *
 * Clinical fields here must NEVER be projected to the receptionist role
 * (field-level projection enforced at the data layer, §5.2/§15.2).
 *
 * Scanned reports store the Cloudinary `public_id` only — signed, expiring URLs
 * are generated on demand, never persisted (§15.3).
 */

export interface Medicine {
  type: string;         // Tab, Cap, Syr, Inj, etc.
  name: string;         // brand name
  generic: string;      // generic composition / contains
  dose: string;         // e.g. "1", "1/2", "5ml"
  dosage: string;       // legacy — kept for backward compat
  frequency: string;    // OD, BD, TDS, etc.
  timing: string;       // Before food, After breakfast, etc.
  source: MedicineSource; // self (clinic stock) | pharmacy (external) — §7.3
  clinicalText: string; // doctor's shorthand, e.g. "Tab. Paracetamol 500mg — 1 TDS"
  patientText: string;  // plain language, e.g. "Take 3 times a day after food"
}

export interface OnExamination {
  bp?: string;
  weight?: string;
  height?: string;
  pulse?: string;
  temp?: string;
  rr?: string;
  pa?: string; // P/A
  cvs?: string;
  cns?: string;
  bsl?: string;
}

export interface VisitDoc {
  _id: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  type: VisitType;
  status: VisitStatus;
  // clinical (doctor-only, §5.2 absolute restriction for receptionist)
  ho?: string; // history of present illness
  fh?: string; // family history
  co?: string; // complaints of
  oe: OnExamination;
  notes?: string;
  provisionalDiagnosis?: string;
  diagnosis?: string;
  followUp?: string;
  adviceGeneral?: string;
  adviceLabTest?: string;
  prescriptionLanguage?: "english" | "hindi" | "marathi";
  reportPublicIds: string[]; // Cloudinary public_id refs only (§15.3)
  medicines: Medicine[];
  fees?: number; // entered manually by doctor (§7.3)
  // lifecycle
  editLockAt?: Date; // createdAt + 3 days, set on confirm (§9.2)
  confirmedAt?: Date;
  purgeAfter: Date; // §9.3 retention
  createdAt: Date;
  updatedAt: Date;
}

const medicineSchema = new Schema<Medicine>(
  {
    type: { type: String, default: "Tab" },
    name: { type: String, required: true },
    generic: { type: String, default: "" },
    dose: { type: String, default: "" },
    dosage: { type: String, default: "" },
    frequency: { type: String, default: "" },
    timing: { type: String, default: "" },
    source: { type: String, enum: MEDICINE_SOURCES, required: true },
    clinicalText: { type: String, default: "" },
    patientText: { type: String, default: "" },
  },
  { _id: false },
);

const oeSchema = new Schema<OnExamination>(
  {
    bp: String,
    weight: String,
    height: String,
    pulse: String,
    temp: String,
    rr: String,
    pa: String,
    cvs: String,
    cns: String,
    bsl: String,
  },
  { _id: false },
);

const visitSchema = new Schema<VisitDoc>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
    type: { type: String, enum: VISIT_TYPES, required: true },
    status: { type: String, enum: VISIT_STATUSES, default: "draft", index: true },

    ho: String,
    fh: String,
    co: String,
    oe: { type: oeSchema, default: () => ({}) },
    notes: String,
    provisionalDiagnosis: String,
    diagnosis: String,
    followUp: String,
    adviceGeneral: String,
    adviceLabTest: String,
    prescriptionLanguage: { type: String, enum: ["english", "hindi", "marathi"] },
    reportPublicIds: { type: [String], default: [] },
    medicines: { type: [medicineSchema], default: [] },
    fees: { type: Number, min: 0 },

    editLockAt: { type: Date },
    confirmedAt: { type: Date },
    purgeAfter: {
      type: Date,
      default: () => new Date(Date.now() + RECORD.RETENTION_DAYS * 86_400_000),
      index: true,
    },
  },
  { timestamps: true },
);

// Today's-queue and history queries both scope by doctor + time.
visitSchema.index({ doctorId: 1, createdAt: -1 });
visitSchema.index({ doctorId: 1, status: 1, createdAt: -1 });

/** True once the 3-day edit window has elapsed (§9.2). */
visitSchema.methods.isEditLocked = function isEditLocked(this: VisitDoc): boolean {
  return !!this.editLockAt && Date.now() > this.editLockAt.getTime();
};

export const Visit: Model<VisitDoc> =
  (mongoose.models.Visit as Model<VisitDoc>) ||
  mongoose.model<VisitDoc>("Visit", visitSchema);

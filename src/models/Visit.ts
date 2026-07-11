import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  MEDICINE_SOURCES,
  VISIT_STATUSES,
  VISIT_TYPES,
  VISIT_MODES,
  DEFAULT_VISIT_MODE,
  DUES_STATUSES,
  RECORD,
  type MedicineSource,
  type VisitStatus,
  type VisitType,
  type VisitMode,
  type DuesStatus,
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

/**
 * A single payment event against a visit's dues — the money collected, when, and
 * an optional note. Kept as a small append-only history so a fee dispute can be
 * reconstructed ("₹200 on the 3rd, ₹100 on the 10th"). This is the clinic's own
 * patient-fee bookkeeping and is COMPLETELY SEPARATE from MediReach subscription
 * billing (the ₹299/₹499 tier logic) — see the Patient Dues feature.
 */
export interface DuesPayment {
  amount: number;
  at: Date;
  note?: string;
}

/**
 * Dues (outstanding patient fee) on a single visit. `feeAmount` is the fee the
 * doctor charged; `amountPaid` is what has actually been collected across all
 * `payments`; `dueAmount` = feeAmount − amountPaid (never negative). `status` is
 * derived: paid (nothing owed), partial (some collected), unpaid (nothing yet).
 * Set once payment is captured in the post-prescription modal, then reduced as
 * the due is settled on the Dues page. Doctor-only, tenant-scoped via the visit.
 */
export interface Dues {
  feeAmount: number;
  amountPaid: number;
  dueAmount: number;
  status: DuesStatus;
  recordedAt: Date;
  payments: DuesPayment[];
}

/**
 * Procedure-specific fields for quick-service visits (nebulisation, dressing,
 * BP checkup, outside injection). Each purpose captures its own form; only the
 * relevant sub-fields are set. Kept in a nested doc so the main consultation
 * schema stays uncluttered.
 */
export interface Procedure {
  nebuliserAgent?: string;    // nebulisation: the drug/solution nebulised
  injectionDetails?: string;  // outside injection: injection name & details
  woundSpec?: string;         // dressing: wound specifications
  mechanismOfInjury?: string; // dressing: how the wound was caused
  dressingNotes?: string;     // dressing: dressing notes
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
  visitMode: VisitMode; // visit purpose: consultation (default) | followup | certificate | nebulisation | dressing | bp_checkup | outside_injection (legacy: certificate_only)
  status: VisitStatus;
  // clinical (doctor-only, §5.2 absolute restriction for receptionist)
  ho?: string; // history of present illness
  fh?: string; // family history
  co?: string; // complaints of
  oe: OnExamination;
  procedure?: Procedure;
  notes?: string;
  provisionalDiagnosis?: string;
  diagnosis?: string;
  followUp?: string;
  adviceGeneral?: string;
  adviceLabTest?: string;
  prescriptionLanguage?: "english" | "hindi" | "marathi";
  reportPublicIds: string[]; // Cloudinary public_id refs only (§15.3)
  prescriptionPdfPublicId?: string; // Cloudinary public_id of the shared prescription PDF (§15.3)
  medicines: Medicine[];
  fees?: number; // entered manually by doctor (§7.3)
  // Outstanding fee bookkeeping (Patient Dues feature) — set when the doctor
  // captures payment in the post-prescription modal. Absent until then.
  dues?: Dues;
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

const duesPaymentSchema = new Schema<DuesPayment>(
  {
    amount: { type: Number, required: true, min: 0 },
    at: { type: Date, required: true, default: () => new Date() },
    note: { type: String },
  },
  { _id: false },
);

const duesSchema = new Schema<Dues>(
  {
    feeAmount: { type: Number, required: true, min: 0, default: 0 },
    amountPaid: { type: Number, required: true, min: 0, default: 0 },
    dueAmount: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: DUES_STATUSES, required: true, default: "unpaid" },
    recordedAt: { type: Date, required: true, default: () => new Date() },
    payments: { type: [duesPaymentSchema], default: [] },
  },
  { _id: false },
);

const procedureSchema = new Schema<Procedure>(
  {
    nebuliserAgent: String,
    injectionDetails: String,
    woundSpec: String,
    mechanismOfInjury: String,
    dressingNotes: String,
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
    visitMode: { type: String, enum: VISIT_MODES, default: DEFAULT_VISIT_MODE, index: true },
    status: { type: String, enum: VISIT_STATUSES, default: "draft", index: true },

    ho: String,
    fh: String,
    co: String,
    oe: { type: oeSchema, default: () => ({}) },
    procedure: { type: procedureSchema, default: undefined },
    notes: String,
    provisionalDiagnosis: String,
    diagnosis: String,
    followUp: String,
    adviceGeneral: String,
    adviceLabTest: String,
    prescriptionLanguage: { type: String, enum: ["english", "hindi", "marathi"] },
    reportPublicIds: { type: [String], default: [] },
    prescriptionPdfPublicId: { type: String },
    medicines: { type: [medicineSchema], default: [] },
    fees: { type: Number, min: 0 },
    dues: { type: duesSchema, default: undefined },

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
// Records (day-grouped) and the receptionist's "recent" list both filter
// {doctorId, status} and sort/range on confirmedAt — without this the sort ran
// in memory over the whole confirmed set.
visitSchema.index({ doctorId: 1, status: 1, confirmedAt: -1 });
// Patient Dues: the outstanding list filters {doctorId, dues.dueAmount > 0} and
// sorts most-recent-first, and the per-patient detail filters {doctorId, patientId}.
visitSchema.index({ doctorId: 1, "dues.dueAmount": 1, createdAt: -1 });

/** True once the 3-day edit window has elapsed (§9.2). */
visitSchema.methods.isEditLocked = function isEditLocked(this: VisitDoc): boolean {
  return !!this.editLockAt && Date.now() > this.editLockAt.getTime();
};

export const Visit: Model<VisitDoc> =
  (mongoose.models.Visit as Model<VisitDoc>) ||
  mongoose.model<VisitDoc>("Visit", visitSchema);

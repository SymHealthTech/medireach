import mongoose, { Schema, type Model, type Types } from "mongoose";
import { INTAKE_KINDS, VISIT_OUTCOMES, type IntakeKind, type VisitOutcome } from "@/lib/constants";

/**
 * A field visit: one line of a sales executive's daily work list (whom they
 * met, the reply, a follow-up). Three confirming fields identify the doctor
 * or clinic later: the doctor's name, the clinic / hospital name and the
 * mobile number. When that doctor or clinic sends the website form, the form
 * is matched to the visit on any of them (`matchKeys`, see lib/visits/match.ts)
 * and joins the sales executive's work.
 */
export interface VisitDoc {
  _id: Types.ObjectId;
  salesAdminId: Types.ObjectId;
  /** Kept for history (the user may be deleted later). */
  salesName: string;
  staffId?: string;
  /** The visit day in India, "YYYY-MM-DD". */
  day: string;
  kind: IntakeKind;
  doctorName?: string;
  clinicName?: string;
  /** 10 digits. */
  mobile?: string;
  area?: string;
  outcome: VisitOutcome;
  /** "YYYY-MM-DD". */
  followUpOn?: string;
  notes?: string;
  /** "m:9876543210", "n:amit kulkarni", "c:shah clinic". */
  matchKeys: string[];
  /** The website form this visit turned into. */
  intakeId?: Types.ObjectId;
  /** Which confirming fields matched ("mobile", "doctor name", "clinic name"), or "assigned by super admin". */
  matchedOn?: string[];
  matchedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const visitSchema = new Schema<VisitDoc>(
  {
    salesAdminId: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    salesName: { type: String, required: true, trim: true },
    staffId: { type: String, trim: true },
    day: { type: String, required: true },
    kind: { type: String, enum: INTAKE_KINDS, required: true },
    doctorName: { type: String, trim: true },
    clinicName: { type: String, trim: true },
    mobile: { type: String, trim: true },
    area: { type: String, trim: true },
    outcome: { type: String, enum: VISIT_OUTCOMES, required: true },
    followUpOn: { type: String },
    notes: { type: String, trim: true },
    matchKeys: { type: [String], default: [] },
    intakeId: { type: Schema.Types.ObjectId, ref: "Intake" },
    matchedOn: { type: [String], default: undefined },
    matchedAt: { type: Date },
  },
  { timestamps: true },
);

visitSchema.index({ salesAdminId: 1, day: -1 });
visitSchema.index({ day: -1 });
visitSchema.index({ matchKeys: 1 });
visitSchema.index({ intakeId: 1 });

export const Visit: Model<VisitDoc> = (mongoose.models.Visit as Model<VisitDoc>) || mongoose.model<VisitDoc>("Visit", visitSchema);

import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Grievance — DPDP data-related complaint/request (spec §6.4, §15.8). Required
 * even without a formal DPO at this scale: complaints must LAND somewhere a
 * human tracks (the admin grievance queue), not vanish into an inbox.
 */
export interface GrievanceDoc {
  _id: Types.ObjectId;
  // May be filed by a logged-in doctor or an anonymous patient/visitor.
  doctorId?: Types.ObjectId;
  contactEmail: string;
  contactName?: string;
  kind: "access" | "erasure" | "correction" | "consent-withdrawal" | "other";
  message: string;
  status: "open" | "in-progress" | "resolved";
  resolutionNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const grievanceSchema = new Schema<GrievanceDoc>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", index: true },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    contactName: { type: String },
    kind: {
      type: String,
      enum: ["access", "erasure", "correction", "consent-withdrawal", "other"],
      default: "other",
    },
    message: { type: String, required: true },
    status: { type: String, enum: ["open", "in-progress", "resolved"], default: "open", index: true },
    resolutionNote: { type: String },
  },
  { timestamps: true },
);

export const Grievance: Model<GrievanceDoc> =
  (mongoose.models.Grievance as Model<GrievanceDoc>) ||
  mongoose.model<GrievanceDoc>("Grievance", grievanceSchema);

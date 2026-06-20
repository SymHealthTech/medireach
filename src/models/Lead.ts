import mongoose, { Schema, type Model, type Types } from "mongoose";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/constants";

/**
 * Lead — public-website lead capture (spec §4, §6.5). Not an automated funnel:
 * a simple list a human works from lead → demo → converted doctor. Note this
 * is the ONLY collection not scoped by doctorId — it predates any doctor
 * account and is read solely from the admin panel.
 */
export interface LeadDoc {
  _id: Types.ObjectId;
  name: string;
  clinicName: string;
  phone: string;
  source: string; // "wa-deeplink" | "form" | ...
  status: LeadStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<LeadDoc>(
  {
    name: { type: String, required: true, trim: true },
    clinicName: { type: String, default: "", trim: true },
    phone: { type: String, required: true, trim: true },
    source: { type: String, default: "form" },
    status: { type: String, enum: LEAD_STATUSES, default: "new", index: true },
    notes: { type: String },
  },
  { timestamps: true },
);

export const Lead: Model<LeadDoc> =
  (mongoose.models.Lead as Model<LeadDoc>) ||
  mongoose.model<LeadDoc>("Lead", leadSchema);

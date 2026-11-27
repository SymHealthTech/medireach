import mongoose, { Schema, type Model, type Types } from "mongoose";
import { LEAD_SOURCES, LEAD_STATUSES, type LeadStatus } from "@/lib/constants";

/**
 * Lead — homepage form submissions, WhatsApp-click beacons and sales leads.
 * `whatsapp_click` events carry no personal data.
 */
export interface LeadDoc {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  city?: string;
  specialty?: string;
  message?: string;
  source: (typeof LEAD_SOURCES)[number];
  status: LeadStatus;
  /** The dashboard user who added it (sales executives see only their own leads). Unset for website leads. */
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<LeadDoc>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    specialty: { type: String, trim: true },
    message: { type: String, trim: true },
    source: { type: String, enum: LEAD_SOURCES, required: true },
    status: { type: String, enum: LEAD_STATUSES, default: "new", index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin", index: true },
  },
  { timestamps: true },
);

leadSchema.index({ createdAt: -1 });

export const Lead: Model<LeadDoc> =
  (mongoose.models.Lead as Model<LeadDoc>) || mongoose.model<LeadDoc>("Lead", leadSchema);

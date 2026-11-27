import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  SITE_TEMPLATE_TYPES,
  TEMPLATE_KEYS,
  TEMPLATE_STATUSES,
  type SiteTemplateType,
  type TemplateKey,
  type TemplateStatus,
} from "@/lib/constants";

/**
 * One of the 5 design slots per type (doctor portfolio, clinic site, hospital
 * site). Only `ready` slots are selectable; the renderer falls back to classic
 * otherwise. The visiting card has no slots: it follows the website design.
 */
export interface TemplateSlotDoc {
  _id: Types.ObjectId;
  type: SiteTemplateType;
  key: TemplateKey;
  name: string;
  status: TemplateStatus;
  previewImage?: { publicId: string; url: string };
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const templateSlotSchema = new Schema<TemplateSlotDoc>(
  {
    type: { type: String, enum: SITE_TEMPLATE_TYPES, required: true },
    key: { type: String, enum: TEMPLATE_KEYS, required: true },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: TEMPLATE_STATUSES, default: "coming_soon" },
    previewImage: {
      type: new Schema({ publicId: String, url: String }, { _id: false }),
      default: undefined,
    },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

templateSlotSchema.index({ type: 1, key: 1 }, { unique: true });
// At most one default per type.
templateSlotSchema.index(
  { type: 1 },
  { unique: true, partialFilterExpression: { isDefault: true }, name: "one_default_per_type" },
);

export const TemplateSlot: Model<TemplateSlotDoc> =
  (mongoose.models.TemplateSlot as Model<TemplateSlotDoc>) ||
  mongoose.model<TemplateSlotDoc>("TemplateSlot", templateSlotSchema);

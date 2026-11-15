import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  TEMPLATE_KEYS,
  TEMPLATE_STATUSES,
  TEMPLATE_TYPES,
  type TemplateKey,
  type TemplateStatus,
  type TemplateType,
} from "@/lib/constants";

/**
 * One of the 5 portfolio / 5 card design slots. Only `ready` slots are
 * selectable on a doctor; the renderer falls back to classic otherwise.
 */
export interface TemplateSlotDoc {
  _id: Types.ObjectId;
  type: TemplateType;
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
    type: { type: String, enum: TEMPLATE_TYPES, required: true },
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

import mongoose, { Schema, type Model, type Types } from "mongoose";
import { DEFAULT_UPDATE_PRICE, UPDATE_REQUEST_STATUSES } from "@/lib/constants";

/** Done-for-you page update request (₹299 by default; the first one per doctor is free). */
export interface UpdateRequestDoc {
  _id: Types.ObjectId;
  doctorId: Types.ObjectId;
  description: string;
  status: (typeof UPDATE_REQUEST_STATUSES)[number];
  price: number;
  paid: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const updateRequestSchema = new Schema<UpdateRequestDoc>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "DoctorProfile", required: true, index: true },
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: UPDATE_REQUEST_STATUSES, default: "new", index: true },
    price: { type: Number, default: DEFAULT_UPDATE_PRICE, min: 0 },
    paid: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

export const UpdateRequest: Model<UpdateRequestDoc> =
  (mongoose.models.UpdateRequest as Model<UpdateRequestDoc>) ||
  mongoose.model<UpdateRequestDoc>("UpdateRequest", updateRequestSchema);

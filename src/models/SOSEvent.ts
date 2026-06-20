import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * SOSEvent — a triggered doctor-safety alert (spec §10, §13; Change 4). Alerts
 * go out as VAPID web push only (no SMS). Location is a one-time GPS capture at
 * trigger time (clinic address as fallback). Records per-recipient push delivery
 * status. `cancelledAt` stays null unless the alert was cancelled.
 */
export interface PushDeliveryStatus {
  doctorId: Types.ObjectId;
  delivered: boolean;
}

export interface SOSEventDoc {
  _id: Types.ObjectId;
  doctorId: Types.ObjectId;
  triggeredAt: Date;
  cancelledAt: Date | null;
  gpsCoordinate?: { lat: number; lng: number };
  clinicAddress: string; // fallback location text
  contactsNotified: Types.ObjectId[]; // Doctor refs
  pushDeliveryStatus: PushDeliveryStatus[];
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pushDeliveryStatusSchema = new Schema<PushDeliveryStatus>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    delivered: { type: Boolean, default: false },
  },
  { _id: false },
);

const sosEventSchema = new Schema<SOSEventDoc>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
    triggeredAt: { type: Date, required: true, default: () => new Date() },
    cancelledAt: { type: Date, default: null },
    gpsCoordinate: {
      lat: Number,
      lng: Number,
    },
    clinicAddress: { type: String, default: "" },
    contactsNotified: [{ type: Schema.Types.ObjectId, ref: "Doctor" }],
    pushDeliveryStatus: { type: [pushDeliveryStatusSchema], default: [] },
    resolved: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const SOSEvent: Model<SOSEventDoc> =
  (mongoose.models.SOSEvent as Model<SOSEventDoc>) ||
  mongoose.model<SOSEventDoc>("SOSEvent", sosEventSchema);

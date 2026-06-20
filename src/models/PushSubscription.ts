import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Web Push subscription for a doctor's device (spec §10, §14). A doctor may have
 * several (phone, desktop). Used to deliver high-priority SOS alerts. Dead
 * subscriptions (410/404 on send) are pruned by the push integration.
 */
export interface PushSubscriptionDoc {
  _id: Types.ObjectId;
  doctorId: Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: Date;
}

const pushSubscriptionSchema = new Schema<PushSubscriptionDoc>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const PushSubscription: Model<PushSubscriptionDoc> =
  (mongoose.models.PushSubscription as Model<PushSubscriptionDoc>) ||
  mongoose.model<PushSubscriptionDoc>("PushSubscription", pushSubscriptionSchema);

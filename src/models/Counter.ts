import mongoose, { Schema, type Model } from "mongoose";

/** Named sequence counters (e.g. "founding": one numbering across doctors, clinics and hospitals). */
export interface CounterDoc {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<CounterDoc>({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

export const Counter: Model<CounterDoc> =
  (mongoose.models.Counter as Model<CounterDoc>) || mongoose.model<CounterDoc>("Counter", counterSchema);

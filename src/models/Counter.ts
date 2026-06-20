import mongoose, { Schema, type Model } from "mongoose";

/**
 * Atomic sequence counter, used to mint the doctor's human-facing app ID
 * (e.g. "MR-00142", spec §12). A dedicated collection lets us increment with
 * a single atomic findOneAndUpdate, avoiding race conditions under concurrent
 * onboarding completions.
 */
export interface CounterDoc {
  _id: string; // sequence name, e.g. "doctorAppId"
  seq: number;
}

const counterSchema = new Schema<CounterDoc>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false },
);

export const Counter: Model<CounterDoc> =
  (mongoose.models.Counter as Model<CounterDoc>) ||
  mongoose.model<CounterDoc>("Counter", counterSchema);

/** Returns the next sequence value for `name`, creating it if absent. */
export async function nextSequence(name: string): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  ).lean();
  return doc!.seq;
}

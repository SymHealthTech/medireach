import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Fixed-window rate-limit counters shared by every serverless instance
 * (an in-memory limiter would reset per lambda). Each window is its own
 * document, removed by the TTL index once the window ends.
 */
export interface RateLimitDoc {
  _id: Types.ObjectId;
  key: string; // e.g. "admin-login:ip:1.2.3.4:5913412"
  count: number;
  expiresAt: Date;
}

const rateLimitSchema = new Schema<RateLimitDoc>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
});

rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit: Model<RateLimitDoc> =
  (mongoose.models.RateLimit as Model<RateLimitDoc>) ||
  mongoose.model<RateLimitDoc>("RateLimit", rateLimitSchema);

import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * OtpChallenge — short-lived one-time-passcode store backing three flows
 * (spec §5.3, §15.1): signup EMAIL verification, login from a new/unrecognized
 * device, and forgot-password recovery. Codes are delivered by email only
 * (Change 3 — no SMS/WhatsApp). Only a hash of the code is stored, and a TTL
 * index auto-expires rows so codes can't be replayed indefinitely.
 */
export interface OtpChallengeDoc {
  _id: Types.ObjectId;
  purpose: "signup-verify" | "new-device" | "password-reset";
  // Whom the OTP is for — the destination email. For signup the account may not
  // exist yet, so we key on the email rather than a user id.
  email: string;
  codeHash: string;
  attempts: number;
  consumed: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const otpChallengeSchema = new Schema<OtpChallengeDoc>(
  {
    purpose: {
      type: String,
      enum: ["signup-verify", "new-device", "password-reset"],
      required: true,
    },
    email: { type: String, required: true, index: true, lowercase: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    consumed: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// TTL: MongoDB purges the doc once expiresAt passes.
otpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpChallenge: Model<OtpChallengeDoc> =
  (mongoose.models.OtpChallenge as Model<OtpChallengeDoc>) ||
  mongoose.model<OtpChallengeDoc>("OtpChallenge", otpChallengeSchema);

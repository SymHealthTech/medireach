import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Admin — founder/operator role (spec §6, §13). The single highest-value
 * target in the system, so: mandatory MFA on EVERY login (no trusted-device
 * exception, §6.7). `mfaSecret` stores the TOTP secret; `mfaEnrolled` gates
 * login until enrollment is complete.
 */
export interface AdminDoc {
  _id: Types.ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  mfaEnrolled: boolean;
  mfaSecret?: string; // base32 TOTP secret — server-side only
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<AdminDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    mfaEnrolled: { type: Boolean, default: false },
    mfaSecret: { type: String },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

export const Admin: Model<AdminDoc> =
  (mongoose.models.Admin as Model<AdminDoc>) ||
  mongoose.model<AdminDoc>("Admin", adminSchema);

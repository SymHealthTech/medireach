import mongoose, { Schema, type Model, type Types } from "mongoose";
import { ADMIN_ROLES, type AdminRole } from "@/lib/constants";

/**
 * Dashboard user. Roles:
 *  - superadmin: everything, including managing admin users
 *  - admin:      everything except admin users
 *  - sales:      create drafts and leads; cannot publish or see payment totals
 *
 * The role is always re-read from here on every request (never trusted from
 * the session token), so demoting or deactivating someone takes effect at once.
 */
export interface AdminDoc {
  _id: Types.ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  role: AdminRole;
  active: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<AdminDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ADMIN_ROLES, required: true, default: "sales" },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

export const Admin: Model<AdminDoc> =
  (mongoose.models.Admin as Model<AdminDoc>) || mongoose.model<AdminDoc>("Admin", adminSchema);

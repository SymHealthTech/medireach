import mongoose, { Schema, type Model, type Types } from "mongoose";
import { STORED_ADMIN_ROLES, type AdminRole } from "@/lib/constants";

/**
 * Dashboard user. Roles:
 *  - superadmin: everything, including managing dashboard users and payments
 *  - sales:      a sales executive: only their own doctors, clinics and
 *                hospitals, up to "review"; no payments, no publishing
 *
 * Sales executives log in with their staff ID ("MRS-1001") and a password set
 * by the super admin (email optional). Super admins log in with their email.
 * They cannot change their own password; only a super admin can reset it.
 *
 * The role is always re-read from here on every request (never trusted from
 * the session token), so demoting or deactivating someone takes effect at once.
 * A stored "admin" (the retired middle role) is read as superadmin.
 */
export interface AdminDoc {
  _id: Types.ObjectId;
  email?: string;
  /** Login ID for sales executives, e.g. "MRS-1001". */
  staffId?: string;
  name: string;
  mobile?: string;
  passwordHash: string;
  role: AdminRole | "admin";
  active: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<AdminDoc>(
  {
    email: { type: String, lowercase: true, trim: true },
    staffId: { type: String, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: STORED_ADMIN_ROLES, required: true, default: "sales" },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

// Unique when present (sales executives may have no email).
adminSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } });
adminSchema.index({ staffId: 1 }, { unique: true, partialFilterExpression: { staffId: { $type: "string" } } });

export const Admin: Model<AdminDoc> =
  (mongoose.models.Admin as Model<AdminDoc>) || mongoose.model<AdminDoc>("Admin", adminSchema);

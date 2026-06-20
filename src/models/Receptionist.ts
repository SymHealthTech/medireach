import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { TrustedDevice } from "@/models/Doctor";

/**
 * Receptionist — front-desk role, linked to exactly one doctor (spec §5.2,
 * §13). Scope is enforced server-side; this model only stores identity. The
 * doctorId here is what scopes every receptionist query to a single clinic.
 */
export interface ReceptionistDoc {
  _id: Types.ObjectId;
  doctorId: Types.ObjectId;
  name: string;
  // Login identifier: receptionists log in with a username/mobile under their
  // doctor. Email kept optional since not every front-desk hire has one.
  username: string;
  mobile?: string;
  passwordHash: string;
  trustedDevices: TrustedDevice[];
  active: boolean;
  // Bumped whenever the doctor changes the password (or the account is
  // re-created), so any session minted under the old value is invalidated
  // immediately (the value is embedded in the session JWT and checked per
  // request). Deleting the account invalidates it too (the doc no longer exists).
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const trustedDeviceSchema = new Schema(
  {
    tokenHash: { type: String, required: true },
    label: { type: String, default: "" },
    lastSeenAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const receptionistSchema = new Schema<ReceptionistDoc>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    mobile: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    trustedDevices: { type: [trustedDeviceSchema], default: [] },
    active: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Receptionist: Model<ReceptionistDoc> =
  (mongoose.models.Receptionist as Model<ReceptionistDoc>) ||
  mongoose.model<ReceptionistDoc>("Receptionist", receptionistSchema);

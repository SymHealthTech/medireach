import mongoose, { Schema, type Model, type Types } from "mongoose";
import { ROLES, type Role } from "@/lib/constants";

/**
 * AuditLog — legally required access/change trail (spec §15.4). Retained ≥1
 * year to detect and investigate unauthorized access. Every role's actions —
 * including admin's own (§6.7) — are logged here; nothing acts without a trace.
 *
 * Stored append-only: nothing in the app updates or deletes audit entries.
 */
export interface AuditLogDoc {
  _id: Types.ObjectId;
  actorId: Types.ObjectId;
  actorRole: Role;
  // For clinic-scoped actions, the doctor tenant the action touched (lets the
  // admin audit viewer filter by clinic; null for cross-clinic admin actions).
  doctorScope?: Types.ObjectId;
  action: string; // e.g. "visit.confirm", "patient.create", "admin.suspend"
  targetType?: string; // e.g. "Visit", "Patient", "Doctor"
  targetId?: Types.ObjectId;
  ip?: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLogDoc>(
  {
    actorId: { type: Schema.Types.ObjectId, required: true, index: true },
    actorRole: { type: String, enum: ROLES, required: true },
    doctorScope: { type: Schema.Types.ObjectId, ref: "Doctor", index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String },
    targetId: { type: Schema.Types.ObjectId },
    ip: { type: String },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog: Model<AuditLogDoc> =
  (mongoose.models.AuditLog as Model<AuditLogDoc>) ||
  mongoose.model<AuditLogDoc>("AuditLog", auditLogSchema);

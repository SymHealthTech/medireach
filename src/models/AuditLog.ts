import mongoose, { Schema, type Model, type Types } from "mongoose";
import { ROLES, type Role } from "@/lib/constants";

/**
 * AuditLog — append-only trail of every mutation (dashboard and doctor
 * self-edit). Nothing in the app updates or deletes audit entries.
 */
export interface AuditLogDoc {
  _id: Types.ObjectId;
  actor: { id: string; role: Role; name?: string };
  action: string; // e.g. "doctor.publish", "lead.update", "settings.update"
  entity?: string; // e.g. "DoctorProfile", "Lead"
  entityId?: Types.ObjectId;
  at: Date;
  diff?: Record<string, unknown>;
}

const auditLogSchema = new Schema<AuditLogDoc>(
  {
    actor: {
      id: { type: String, required: true },
      role: { type: String, enum: ROLES, required: true },
      name: { type: String },
    },
    action: { type: String, required: true, index: true },
    entity: { type: String },
    entityId: { type: Schema.Types.ObjectId },
    diff: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: "at", updatedAt: false } },
);

auditLogSchema.index({ at: -1 });
auditLogSchema.index({ entity: 1, entityId: 1, at: -1 });

export const AuditLog: Model<AuditLogDoc> =
  (mongoose.models.AuditLog as Model<AuditLogDoc>) ||
  mongoose.model<AuditLogDoc>("AuditLog", auditLogSchema);

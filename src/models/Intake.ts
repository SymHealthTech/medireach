import mongoose, { Schema, type Model, type Types } from "mongoose";
import { INTAKE_KINDS, INTAKE_STATUSES, type IntakeKind, type IntakeStatus } from "@/lib/constants";
import type { IntakeData, IntakePhoto } from "@/lib/intake/form";

/**
 * Intake: a website form a doctor, clinic or hospital fills in themselves
 * ("Get started" on the homepage). One form per email and kind; the applicant
 * returns to it by verifying the same email with a one-time code.
 *
 * `data` is free text validated by lib/intake/form.ts before every write (the
 * shape depends on the kind). Photos are public Cloudinary images in
 * medireach-portfolio/intake. NMC: no patient or before/after photos.
 */
export interface IntakeDoc {
  _id: Types.ObjectId;
  kind: IntakeKind;
  /** The applicant's login for this form (lowercase). */
  email: string;
  /** Short reference for WhatsApp ("MR-7K3QPA"). */
  ref: string;
  status: IntakeStatus;
  /** Denormalised for lists and search. */
  name?: string;
  phone?: string;
  data: IntakeData;
  photos: {
    profile?: IntakePhoto;
    logo?: IntakePhoto;
    cover?: IntakePhoto;
    /** Doctors: the photo for their "Beyond medicine" story. */
    beyond?: IntakePhoto;
    /** Doctors: one photo per award, captioned with the award title. */
    awards?: IntakePhoto[];
    gallery: IntakePhoto[];
    viaWhatsapp: boolean;
  };
  /** Required fields still empty at the last save. */
  missingCount: number;
  submittedAt?: Date;
  /** Applicant changed the form after sending it. */
  updatedAfterSubmitAt?: Date;
  lastSavedAt: Date;
  adminNotes?: string;
  /** The draft site made from this form. */
  convertedTo?: { kind: IntakeKind; id: Types.ObjectId };
  /** Identity keys for matching sales executives' field visits (lib/visits/match.ts). */
  matchKeys?: string[];
  /** The sales executive this form belongs to (they then see it; its website draft becomes theirs). */
  salesAdminId?: Types.ObjectId;
  /** How it was linked: the form's own staff ID, a matching field visit, or the super admin. */
  salesMatch?: { by: "form" | "visit" | "admin"; on: string[]; visitId?: Types.ObjectId; at: Date };
  /** Several sales executives visited them: the super admin picks one. */
  salesCandidates?: { salesAdminId: Types.ObjectId; name: string; staffId?: string; on: string[]; visitId?: Types.ObjectId; day?: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const photoSchema = new Schema<IntakePhoto>(
  { publicId: { type: String, required: true }, url: { type: String, required: true }, caption: { type: String, trim: true } },
  { _id: false },
);

const intakeSchema = new Schema<IntakeDoc>(
  {
    kind: { type: String, enum: INTAKE_KINDS, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    ref: { type: String, required: true, unique: true },
    status: { type: String, enum: INTAKE_STATUSES, default: "draft" },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    data: { type: Schema.Types.Mixed, default: {} },
    photos: {
      profile: { type: photoSchema, default: undefined },
      logo: { type: photoSchema, default: undefined },
      cover: { type: photoSchema, default: undefined },
      beyond: { type: photoSchema, default: undefined },
      awards: { type: [photoSchema], default: undefined },
      gallery: { type: [photoSchema], default: [] },
      viaWhatsapp: { type: Boolean, default: false },
    },
    missingCount: { type: Number, default: 0 },
    submittedAt: { type: Date },
    updatedAfterSubmitAt: { type: Date },
    lastSavedAt: { type: Date, default: () => new Date() },
    adminNotes: { type: String, trim: true },
    matchKeys: { type: [String], default: undefined, index: true },
    salesAdminId: { type: Schema.Types.ObjectId, ref: "Admin", index: true },
    salesMatch: {
      type: new Schema(
        { by: { type: String, enum: ["form", "visit", "admin"], required: true }, on: { type: [String], default: [] }, visitId: { type: Schema.Types.ObjectId }, at: { type: Date, required: true } },
        { _id: false },
      ),
      default: undefined,
    },
    salesCandidates: {
      type: [
        new Schema(
          { salesAdminId: { type: Schema.Types.ObjectId, required: true }, name: { type: String, required: true }, staffId: String, on: { type: [String], default: [] }, visitId: Schema.Types.ObjectId, day: String },
          { _id: false },
        ),
      ],
      default: undefined,
    },
    convertedTo: {
      type: new Schema({ kind: { type: String, enum: INTAKE_KINDS, required: true }, id: { type: Schema.Types.ObjectId, required: true } }, { _id: false }),
      default: undefined,
    },
  },
  { timestamps: true, minimize: false },
);

intakeSchema.index({ email: 1, kind: 1 }, { unique: true });
intakeSchema.index({ status: 1, lastSavedAt: -1 });

export const Intake: Model<IntakeDoc> = (mongoose.models.Intake as Model<IntakeDoc>) || mongoose.model<IntakeDoc>("Intake", intakeSchema);

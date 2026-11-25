import mongoose, { Schema, type Model, type Types } from "mongoose";
import { DOCTOR_CARD_STYLE_CODES } from "@/lib/cards/styles";
import {
  APPROVAL_CHANNELS,
  CLINIC_TYPES,
  DEFAULT_TEMPLATE_KEY,
  DOCTOR_SOURCES,
  DOCTOR_STATUSES,
  DOCTOR_PLANS,
  DOMAIN_STATUSES,
  GENDERS,
  LIMITS,
  PLANS,
  PRACTITIONER_TYPES,
  RENEWAL_STATUSES,
  SYSTEMS_OF_MEDICINE,
  TEMPLATE_KEYS,
  type DoctorPlan,
  type DoctorStatus,
  type Plan,
  type RenewalStatus,
  type SystemOfMedicine,
  type TemplateKey,
} from "@/lib/constants";
import { SLUG_RE, SUBDOMAIN_RE } from "@/lib/slug";
import { nextUid } from "@/lib/uid";
import {
  complianceIssueSchema,
  currentYear,
  dayTimingsSchema,
  galleryItemSchema,
  geoSchema,
  hasString,
  imageSchema,
  type DayTimings,
  type GalleryItem,
  type ImageRef,
} from "@/models/shared";

export type { DayTimings, ImageRef, TimeSlot } from "@/models/shared";

/**
 * The app only writes DOCTOR_PLANS. v1 values stay valid so documents not yet
 * migrated can still be saved; they go with migrate:v2 --drop-legacy (step 7).
 */
const PLAN_VALUES = [...DOCTOR_PLANS, ...PLANS] as const;

/**
 * DoctorProfile — one doctor's portfolio page + visiting card.
 *
 * NMC: there are deliberately NO fields for reviews, ratings, testimonials,
 * success stories or patient photos. Don't add them.
 *
 * Drafts can be saved incomplete, so publish requirements (registration
 * number, compliance scan, doctor approval) are enforced by the publish
 * action, not by `required` here. URL keys are optional on drafts and covered
 * by partial unique indexes.
 */

export interface ClinicEntry {
  _id: Types.ObjectId;
  name: string;
  type: (typeof CLINIC_TYPES)[number];
  addressLine1: string;
  addressLine2?: string;
  areaId: Types.ObjectId;
  cityId: Types.ObjectId;
  state: string;
  pincode: string;
  mapsUrl?: string;
  geo?: { lat: number; lng: number };
  phone?: string;
  timings: DayTimings[];
  appointmentNote?: string;
  fee?: number;
  showFee: boolean;
  /** @deprecated v1 link to Hospital; replaced by establishmentId (removed in step 3). */
  hospitalId?: Types.ObjectId;
  /** Link to the clinic/hospital's MediReach site, if it has one. */
  establishmentId?: Types.ObjectId;
}

export interface DoctorProfileDoc {
  _id: Types.ObjectId;
  /** Permanent website reference ("MRD-100001", lib/uid.ts). Set once, never editable. */
  uid?: string;
  status: DoctorStatus;
  slug?: string;
  shortSlug?: string;
  citySlug?: string;
  subdomain?: string;

  // Identity
  title: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName?: string;
  gender?: (typeof GENDERS)[number];
  photo?: ImageRef;
  languages: string[];
  practiceSinceYear?: number;

  // Registration
  systemOfMedicine: SystemOfMedicine;
  /** The system in their own words, when systemOfMedicine is "other". */
  systemOther?: string;
  registration: {
    councilId?: Types.ObjectId;
    number?: string;
    year?: number;
    nmrId?: string;
  };

  qualifications: {
    degreeId: Types.ObjectId;
    specialization?: string;
    institute: string;
    year?: number;
  }[];

  // Practice
  practitionerType: (typeof PRACTITIONER_TYPES)[number];
  primarySpecialtyId?: Types.ObjectId;
  secondarySpecialtyIds: Types.ObjectId[];
  services: { name: string; description?: string }[];
  conditionsTreated: string[];

  clinics: ClinicEntry[];

  // Contact
  mobile?: string;
  whatsapp?: string;
  email?: string;
  links: {
    googleBusiness?: string;
    practo?: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    youtube?: string;
    website?: string;
  };

  // About
  shortBio?: string;
  fullBio?: string; // sanitised HTML: bold / italic / lists only

  // Recognition
  awards: { title: string; awardingBody: string; year: number; photo?: ImageRef }[];
  memberships: { name: string; since?: number }[];
  publications: { title: string; journal?: string; year?: number; url?: string }[];
  interests: string[];
  /** One photo for "Beyond medicine" (hobbies). Doesn't count toward the gallery limit. */
  interestsPhoto?: ImageRef & { caption?: string };
  /** A personal story for "Beyond medicine" (achievements, hobbies). Plain text; blank lines split paragraphs. */
  interestsStory?: { title: string; body?: string };
  gallery: GalleryItem[];
  /** Show the "Health tips" section (general articles, content/health-tips.ts) in designs that have one. */
  showHealthTips: boolean;
  /** Tips the doctor chose; empty = picked automatically from their specialty. */
  healthTipSlugs: string[];

  // Templates
  portfolioTemplateId: TemplateKey;
  cardTemplateId: TemplateKey;
  /** Visiting card colour style code ("DOC-…", lib/cards/styles.ts). */
  cardStyle?: string;

  seo: { titleOverride?: string; descriptionOverride?: string; noindex: boolean };

  // Business (never exposed publicly)
  plan: DoctorPlan | Plan;
  /** Founding customer: lifetime discounted renewal. Number comes from the shared counter (lib/founding.ts). */
  founding: boolean;
  foundingNumber?: number;
  /** @deprecated v1; replaced by `founding` (removed in step 3). */
  foundingDoctor: boolean;
  /** @deprecated v1 "free hosting until" (null = forever); replaced by the renewal fields (removed in step 3). */
  hostingFreeUntil?: Date | null;
  setupPaidAt?: Date;
  /** Yearly renewal from year 2 (normal or founding price from Settings at the time it was set). */
  renewalPrice?: number;
  renewalDueDate?: Date;
  renewalStatus: RenewalStatus;
  /** Reminder emails already sent, as "<due date YYYY-MM-DD>:<days before>" (lib/renewals-job.ts). */
  renewalRemindersSent: string[];
  freeUpdateUsed: boolean;
  ownDomain?: {
    name: string;
    status: (typeof DOMAIN_STATUSES)[number];
    cost?: number;
    renewalDate?: Date;
  };
  /** @deprecated v1; replaced by establishmentIds (removed in step 3). */
  hospitalAccountId?: Types.ObjectId;
  /** Clinics/hospitals this doctor belongs to (two-way with Establishment.doctors). */
  establishmentIds: Types.ObjectId[];
  salesExecutive?: string;
  /** The sales executive's staff ID. */
  salesExecutiveId?: string;
  source?: (typeof DOCTOR_SOURCES)[number];
  internalNotes?: string;

  compliance: {
    lastScanAt?: Date;
    issues: { field: string; phrase: string }[];
    doctorApprovedAt?: Date;
    approvedVia?: (typeof APPROVAL_CHANNELS)[number];
  };

  ownerEmail?: string;

  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

const yearField = { type: Number, min: 1900, validate: { validator: (y: number) => y <= currentYear() + 1, message: "Year is in the future." } };

const clinicSchema = new Schema<ClinicEntry>({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: CLINIC_TYPES, default: "own_clinic" },
  addressLine1: { type: String, required: true, trim: true },
  addressLine2: { type: String, trim: true },
  areaId: { type: Schema.Types.ObjectId, ref: "Area", required: true },
  cityId: { type: Schema.Types.ObjectId, ref: "City", required: true },
  state: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, match: /^\d{6}$/ },
  mapsUrl: { type: String, trim: true },
  geo: { type: geoSchema, default: undefined },
  phone: { type: String, trim: true },
  timings: { type: [dayTimingsSchema], default: [] },
  appointmentNote: { type: String, trim: true },
  fee: { type: Number, min: 0 },
  showFee: { type: Boolean, default: false },
  hospitalId: { type: Schema.Types.ObjectId, ref: "Establishment" },
  establishmentId: { type: Schema.Types.ObjectId, ref: "Establishment" },
});

const doctorProfileSchema = new Schema<DoctorProfileDoc>(
  {
    uid: { type: String, immutable: true, trim: true },
    status: { type: String, enum: DOCTOR_STATUSES, default: "draft" },
    slug: { type: String, lowercase: true, trim: true, match: SLUG_RE },
    shortSlug: { type: String, lowercase: true, trim: true, match: SLUG_RE },
    citySlug: { type: String, lowercase: true, trim: true },
    subdomain: {
      type: String,
      lowercase: true,
      trim: true,
      minlength: LIMITS.subdomainMin,
      maxlength: LIMITS.subdomainMax,
      match: SUBDOMAIN_RE,
    },

    title: { type: String, default: "Dr.", trim: true },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, required: true, trim: true },
    displayName: { type: String, trim: true },
    gender: { type: String, enum: GENDERS },
    photo: { type: imageSchema, default: undefined },
    languages: { type: [String], default: [] },
    practiceSinceYear: yearField,

    systemOfMedicine: { type: String, enum: SYSTEMS_OF_MEDICINE, default: "allopathy" },
    systemOther: { type: String, trim: true, maxlength: 80 },
    registration: {
      councilId: { type: Schema.Types.ObjectId, ref: "Council" },
      number: { type: String, trim: true },
      year: yearField,
      nmrId: { type: String, trim: true },
    },

    qualifications: {
      type: [
        new Schema(
          {
            degreeId: { type: Schema.Types.ObjectId, ref: "Degree", required: true },
            specialization: { type: String, trim: true },
            institute: { type: String, trim: true, default: "" },
            year: yearField,
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    practitionerType: { type: String, enum: PRACTITIONER_TYPES, default: "gp" },
    primarySpecialtyId: { type: Schema.Types.ObjectId, ref: "Specialty" },
    secondarySpecialtyIds: { type: [{ type: Schema.Types.ObjectId, ref: "Specialty" }], default: [] },
    services: {
      type: [
        new Schema(
          { name: { type: String, required: true, trim: true }, description: { type: String, trim: true } },
          { _id: false },
        ),
      ],
      default: [],
    },
    conditionsTreated: { type: [String], default: [] },

    clinics: { type: [clinicSchema], default: [] },

    mobile: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    links: {
      googleBusiness: { type: String, trim: true },
      practo: { type: String, trim: true },
      instagram: { type: String, trim: true },
      facebook: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      youtube: { type: String, trim: true },
      website: { type: String, trim: true },
    },

    shortBio: { type: String, trim: true, maxlength: LIMITS.shortBio },
    fullBio: { type: String },

    awards: {
      type: [
        new Schema(
          {
            title: { type: String, required: true, trim: true },
            awardingBody: { type: String, required: true, trim: true },
            year: { ...yearField, required: true },
            photo: { type: imageSchema, default: undefined },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    memberships: {
      type: [new Schema({ name: { type: String, required: true, trim: true }, since: yearField }, { _id: false })],
      default: [],
    },
    publications: {
      type: [
        new Schema(
          {
            title: { type: String, required: true, trim: true },
            journal: { type: String, trim: true },
            year: yearField,
            url: { type: String, trim: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    interests: { type: [String], default: [] },
    interestsPhoto: {
      type: new Schema(
        {
          publicId: { type: String, required: true },
          url: { type: String, required: true },
          alt: { type: String, trim: true },
          caption: { type: String, trim: true },
        },
        { _id: false },
      ),
      default: undefined,
    },
    interestsStory: {
      type: new Schema({ title: { type: String, required: true, trim: true }, body: { type: String, trim: true } }, { _id: false }),
      default: undefined,
    },
    gallery: { type: [galleryItemSchema], default: [] },
    showHealthTips: { type: Boolean, default: true },
    healthTipSlugs: { type: [String], default: [] },

    portfolioTemplateId: { type: String, enum: TEMPLATE_KEYS, default: DEFAULT_TEMPLATE_KEY },
    cardTemplateId: { type: String, enum: TEMPLATE_KEYS, default: DEFAULT_TEMPLATE_KEY },
    cardStyle: { type: String, enum: DOCTOR_CARD_STYLE_CODES },

    seo: {
      titleOverride: { type: String, trim: true },
      descriptionOverride: { type: String, trim: true },
      noindex: { type: Boolean, default: false },
    },

    plan: { type: String, enum: PLAN_VALUES, default: "doctor" },
    founding: { type: Boolean, default: false },
    foundingNumber: { type: Number, min: 1 },
    foundingDoctor: { type: Boolean, default: false },
    hostingFreeUntil: { type: Date, default: undefined },
    setupPaidAt: { type: Date },
    renewalPrice: { type: Number, min: 0 },
    renewalDueDate: { type: Date },
    renewalStatus: { type: String, enum: RENEWAL_STATUSES, default: "active" },
    renewalRemindersSent: { type: [String], default: [] },
    freeUpdateUsed: { type: Boolean, default: false },
    ownDomain: {
      type: new Schema(
        {
          name: { type: String, required: true, lowercase: true, trim: true },
          status: { type: String, enum: DOMAIN_STATUSES, default: "requested" },
          cost: { type: Number, min: 0 },
          renewalDate: { type: Date },
        },
        { _id: false },
      ),
      default: undefined,
    },
    hospitalAccountId: { type: Schema.Types.ObjectId, ref: "Establishment" },
    establishmentIds: { type: [{ type: Schema.Types.ObjectId, ref: "Establishment" }], default: [] },
    salesExecutive: { type: String, trim: true },
    salesExecutiveId: { type: String, trim: true },
    source: { type: String, enum: DOCTOR_SOURCES },
    internalNotes: { type: String },

    compliance: {
      lastScanAt: { type: Date },
      issues: { type: [complianceIssueSchema], default: [] },
      doctorApprovedAt: { type: Date },
      approvedVia: { type: String, enum: APPROVAL_CHANNELS },
    },

    ownerEmail: { type: String, trim: true, lowercase: true },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

/**
 * Gallery holds at most 5 photos, and award photos count toward that limit
 * (MEDIREACH_BUILD_PROMPT.md, DoctorProfile.gallery).
 */
doctorProfileSchema.pre("validate", function (next) {
  // Partial documents (loaded with a projection) may not have these paths.
  const awardPhotos = (this.awards ?? []).filter((a) => a.photo).length;
  if ((this.gallery ?? []).length + awardPhotos > LIMITS.galleryMax) {
    this.invalidate(
      "gallery",
      `At most ${LIMITS.galleryMax} photos in total (gallery + award photos).`,
    );
  }
  next();
});

/** A permanent UID on first save (lib/uid.ts). */
doctorProfileSchema.pre("save", async function () {
  // Immutable paths can only be set on new documents; older ones get theirs from backfillUids().
  if (this.isNew && !this.uid) this.uid = await nextUid("doctor");
});

// --- Indexes ---
doctorProfileSchema.index({ uid: 1 }, { unique: true, ...hasString("uid") });
doctorProfileSchema.index({ citySlug: 1, slug: 1 }, { unique: true, ...hasString("slug") });
doctorProfileSchema.index({ shortSlug: 1 }, { unique: true, ...hasString("shortSlug") });
doctorProfileSchema.index({ subdomain: 1 }, { unique: true, ...hasString("subdomain") });
doctorProfileSchema.index({ ownerEmail: 1 }, { unique: true, ...hasString("ownerEmail") });
doctorProfileSchema.index(
  { foundingNumber: 1 },
  { unique: true, partialFilterExpression: { foundingNumber: { $type: "number" } } },
);
doctorProfileSchema.index({ status: 1 });
doctorProfileSchema.index({ primarySpecialtyId: 1 });
doctorProfileSchema.index({ "clinics.areaId": 1 });
doctorProfileSchema.index({ hospitalAccountId: 1 });
doctorProfileSchema.index({ establishmentIds: 1 });
doctorProfileSchema.index({ renewalDueDate: 1 });
doctorProfileSchema.index(
  { firstName: "text", middleName: "text", lastName: "text", displayName: "text" },
  { name: "doctor_name_text" },
);

export const DoctorProfile: Model<DoctorProfileDoc> =
  (mongoose.models.DoctorProfile as Model<DoctorProfileDoc>) ||
  mongoose.model<DoctorProfileDoc>("DoctorProfile", doctorProfileSchema);

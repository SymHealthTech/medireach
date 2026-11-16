import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  APPROVAL_CHANNELS,
  CLINIC_TYPES,
  DEFAULT_TEMPLATE_KEY,
  DOCTOR_SOURCES,
  DOCTOR_STATUSES,
  DOMAIN_STATUSES,
  GENDERS,
  LIMITS,
  PLANS,
  PRACTITIONER_TYPES,
  SYSTEMS_OF_MEDICINE,
  TEMPLATE_KEYS,
  type DoctorStatus,
  type Plan,
  type SystemOfMedicine,
  type TemplateKey,
} from "@/lib/constants";
import { SLUG_RE, SUBDOMAIN_RE } from "@/lib/slug";

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

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface ImageRef {
  publicId: string;
  url: string;
  alt?: string;
}

export interface TimeSlot {
  open: string; // "HH:mm"
  close: string; // "HH:mm"
}

export interface DayTimings {
  day: number; // 0 = Sunday … 6 = Saturday
  slots: TimeSlot[];
}

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
  hospitalId?: Types.ObjectId;
}

export interface DoctorProfileDoc {
  _id: Types.ObjectId;
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
  gallery: (ImageRef & { caption: string })[];

  // Templates
  portfolioTemplateId: TemplateKey;
  cardTemplateId: TemplateKey;

  seo: { titleOverride?: string; descriptionOverride?: string; noindex: boolean };

  // Business (never exposed publicly)
  plan: Plan;
  foundingDoctor: boolean;
  foundingNumber?: number;
  hostingFreeUntil?: Date | null; // null = forever (founding)
  freeUpdateUsed: boolean;
  ownDomain?: {
    name: string;
    status: (typeof DOMAIN_STATUSES)[number];
    cost?: number;
    renewalDate?: Date;
  };
  hospitalAccountId?: Types.ObjectId;
  salesExecutive?: string;
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

const currentYear = () => new Date().getFullYear();
const yearField = { type: Number, min: 1900, validate: { validator: (y: number) => y <= currentYear() + 1, message: "Year is in the future." } };

const imageSchema = new Schema<ImageRef>(
  {
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    alt: { type: String, trim: true },
  },
  { _id: false },
);

const slotSchema = new Schema<TimeSlot>(
  {
    open: { type: String, required: true, match: HHMM },
    close: { type: String, required: true, match: HHMM },
  },
  { _id: false },
);

const dayTimingsSchema = new Schema<DayTimings>(
  {
    day: { type: Number, required: true, min: 0, max: 6 },
    slots: { type: [slotSchema], default: [] },
  },
  { _id: false },
);

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
  geo: {
    type: new Schema(
      { lat: { type: Number, min: -90, max: 90 }, lng: { type: Number, min: -180, max: 180 } },
      { _id: false },
    ),
    default: undefined,
  },
  phone: { type: String, trim: true },
  timings: { type: [dayTimingsSchema], default: [] },
  appointmentNote: { type: String, trim: true },
  fee: { type: Number, min: 0 },
  showFee: { type: Boolean, default: false },
  hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital" },
});

const doctorProfileSchema = new Schema<DoctorProfileDoc>(
  {
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
            institute: { type: String, required: true, trim: true },
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
    gallery: {
      type: [
        new Schema(
          {
            publicId: { type: String, required: true },
            url: { type: String, required: true },
            caption: { type: String, default: "", trim: true },
            alt: { type: String, trim: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    portfolioTemplateId: { type: String, enum: TEMPLATE_KEYS, default: DEFAULT_TEMPLATE_KEY },
    cardTemplateId: { type: String, enum: TEMPLATE_KEYS, default: DEFAULT_TEMPLATE_KEY },

    seo: {
      titleOverride: { type: String, trim: true },
      descriptionOverride: { type: String, trim: true },
      noindex: { type: Boolean, default: false },
    },

    plan: { type: String, enum: PLANS, default: "gp" },
    foundingDoctor: { type: Boolean, default: false },
    foundingNumber: { type: Number, min: 1 },
    hostingFreeUntil: { type: Date, default: undefined },
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
    hospitalAccountId: { type: Schema.Types.ObjectId, ref: "Hospital" },
    salesExecutive: { type: String, trim: true },
    source: { type: String, enum: DOCTOR_SOURCES },
    internalNotes: { type: String },

    compliance: {
      lastScanAt: { type: Date },
      issues: {
        type: [new Schema({ field: String, phrase: String }, { _id: false })],
        default: [],
      },
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

// --- Indexes ---
const hasString = (field: string) => ({ partialFilterExpression: { [field]: { $type: "string" } } });

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
doctorProfileSchema.index(
  { firstName: "text", middleName: "text", lastName: "text", displayName: "text" },
  { name: "doctor_name_text" },
);

export const DoctorProfile: Model<DoctorProfileDoc> =
  (mongoose.models.DoctorProfile as Model<DoctorProfileDoc>) ||
  mongoose.model<DoctorProfileDoc>("DoctorProfile", doctorProfileSchema);

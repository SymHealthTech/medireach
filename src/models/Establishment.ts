import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  APPROVAL_CHANNELS,
  DEFAULT_TEMPLATE_KEY,
  DOMAIN_STATUSES,
  ESTABLISHMENT_KINDS,
  ESTABLISHMENT_PLANS,
  ESTABLISHMENT_SOURCES,
  ESTABLISHMENT_STATUSES,
  LIMITS,
  RENEWAL_STATUSES,
  TEMPLATE_KEYS,
  type DoctorStatus,
  type EstablishmentKind,
  type RenewalStatus,
  type TemplateKey,
} from "@/lib/constants";
import { SLUG_RE, SUBDOMAIN_RE } from "@/lib/slug";
import {
  complianceIssueSchema,
  dayTimingsSchema,
  galleryItemSchema,
  geoSchema,
  hasString,
  imageSchema,
  type DayTimings,
  type GalleryItem,
  type ImageRef,
} from "@/models/shared";
import { nextUid } from "@/lib/uid";
import { THEME_KEYS, type ThemeKey } from "@/themes/specialty";

/**
 * Establishment: a clinic or a small hospital (≤ 10 beds) with its own
 * MediReach site and visiting card.
 *
 * NMC: factual establishment information only. There are deliberately NO
 * fields for reviews, ratings, testimonials, success stories, before/after or
 * patient photos. Don't add them.
 *
 * Like DoctorProfile, drafts can be incomplete: publish requirements
 * (address, compliance scan, owner approval, and for hospitals the
 * registration/licence number) are enforced by the publish action. Hard
 * limits (bed count, gallery size) are enforced here.
 */

export interface NamedItem {
  name: string;
  description?: string;
}

export interface EstablishmentDoc {
  _id: Types.ObjectId;
  /** Permanent website reference ("MRC-100001" / "MRH-100001", lib/uid.ts). Set once, never editable. */
  uid?: string;
  kind: EstablishmentKind;
  status: DoctorStatus;
  name: string;
  slug?: string; // e.g. shree-skin-clinic-baner, unique per city
  shortSlug?: string;
  subdomain?: string; // shares one namespace with doctors (checked in app code)
  citySlug?: string;
  categoryId?: Types.ObjectId;
  themeKey: ThemeKey;
  logo?: ImageRef;
  coverPhoto?: ImageRef;
  tagline?: string;
  about?: string; // sanitised HTML
  shortDescription?: string;
  registration?: { authority?: string; number?: string };

  address: {
    line1?: string;
    line2?: string;
    areaId?: Types.ObjectId;
    cityId?: Types.ObjectId;
    state?: string;
    pincode?: string;
    landmark?: string;
    parkingNote?: string;
  };
  mapsUrl?: string;
  geo?: { lat: number; lng: number };
  contact: { phones: string[]; whatsapp?: string; email?: string; emergencyPhone?: string };

  timings: DayTimings[];
  is24x7: boolean;
  appointmentNote?: string;
  visitingHours?: string;

  services: (NamedItem & { group?: string })[];
  facilities: NamedItem[];
  equipment: NamedItem[];
  /** `doctorIds`: doctors with a MediReach portfolio. `doctorKeys`: doctors without one (their `doctors[].key`). */
  departments: (NamedItem & { doctorIds: Types.ObjectId[]; doctorKeys: string[] })[];
  beds?: { total: number; types: { type: string; count: number }[] };
  insurance?: { cashless: boolean; providers: string[] };
  doctors: {
    doctorProfileId?: Types.ObjectId;
    /** Doctors without a portfolio: a short id so departments can list them. */
    key?: string;
    name?: string;
    qualifications?: string;
    specialty?: string;
    role?: string;
    /** Doctors without a linked portfolio: their own photo and an outside profile link (Practo, own website). */
    photo?: ImageRef;
    profileUrl?: string;
  }[];
  languages: string[];
  gallery: GalleryItem[];
  links: {
    googleBusiness?: string;
    practo?: string;
    instagram?: string;
    facebook?: string;
    youtube?: string;
    website?: string;
  };

  /** Page layout. The visiting card follows the site's design (theme colours); there is no separate card choice. */
  siteTemplateId: TemplateKey;
  seo: { titleOverride?: string; descriptionOverride?: string; noindex: boolean };

  // Business (never exposed publicly)
  plan: EstablishmentKind;
  founding: boolean;
  foundingNumber?: number;
  setupPaidAt?: Date;
  renewalPrice?: number;
  renewalDueDate?: Date;
  renewalStatus: RenewalStatus;
  /** Reminder emails already sent, as "<due date YYYY-MM-DD>:<days before>" (lib/renewals-job.ts). */
  renewalRemindersSent: string[];
  ownDomain?: { name: string; status: (typeof DOMAIN_STATUSES)[number]; cost?: number; renewalDate?: Date };
  salesExecutive?: string;
  /** The sales executive's staff ID. */
  salesExecutiveId?: string;
  /** The sales executive (dashboard user) who owns this website: they alone, and the super admin, can see and edit it. */
  salesAdminId?: Types.ObjectId;
  source?: (typeof ESTABLISHMENT_SOURCES)[number];
  contactPerson?: { name?: string; phone?: string; email?: string };
  internalNotes?: string;

  compliance: {
    lastScanAt?: Date;
    issues: { field: string; phrase: string }[];
    ownerApprovedAt?: Date;
    approvedVia?: (typeof APPROVAL_CHANNELS)[number];
  };

  /** Self-edit login (email magic link). Not unique: one owner may have several sites. */
  ownerEmail?: string;

  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

const str = { type: String, trim: true };
const namedItem = (extra: Record<string, unknown> = {}) =>
  new Schema({ name: { type: String, required: true, trim: true }, description: str, ...extra }, { _id: false });

const establishmentSchema = new Schema<EstablishmentDoc>(
  {
    uid: { type: String, immutable: true, trim: true },
    kind: { type: String, enum: ESTABLISHMENT_KINDS, required: true },
    status: { type: String, enum: ESTABLISHMENT_STATUSES, default: "draft" },
    name: { type: String, required: true, trim: true },
    slug: { type: String, lowercase: true, trim: true, match: SLUG_RE },
    shortSlug: { type: String, lowercase: true, trim: true, match: SLUG_RE },
    subdomain: {
      type: String,
      lowercase: true,
      trim: true,
      minlength: LIMITS.subdomainMin,
      maxlength: LIMITS.subdomainMax,
      match: SUBDOMAIN_RE,
    },
    citySlug: { type: String, lowercase: true, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "ClinicCategory" },
    themeKey: { type: String, enum: THEME_KEYS, default: "general-opd" },
    logo: { type: imageSchema, default: undefined },
    coverPhoto: { type: imageSchema, default: undefined },
    tagline: str,
    about: { type: String },
    shortDescription: { type: String, trim: true, maxlength: LIMITS.shortBio },
    registration: {
      type: new Schema({ authority: str, number: str }, { _id: false }),
      default: undefined,
    },

    address: {
      line1: str,
      line2: str,
      areaId: { type: Schema.Types.ObjectId, ref: "Area" },
      cityId: { type: Schema.Types.ObjectId, ref: "City" },
      state: str,
      pincode: { type: String, trim: true, match: /^\d{6}$/ },
      landmark: str,
      parkingNote: str,
    },
    mapsUrl: str,
    geo: { type: geoSchema, default: undefined },
    contact: {
      phones: { type: [String], default: [] },
      whatsapp: str,
      email: { type: String, trim: true, lowercase: true },
      emergencyPhone: str,
    },

    timings: { type: [dayTimingsSchema], default: [] },
    is24x7: { type: Boolean, default: false },
    appointmentNote: str,
    visitingHours: str,

    services: { type: [namedItem({ group: str })], default: [] },
    facilities: { type: [namedItem()], default: [] },
    equipment: { type: [namedItem()], default: [] },
    departments: {
      type: [namedItem({ doctorIds: { type: [{ type: Schema.Types.ObjectId, ref: "DoctorProfile" }], default: [] }, doctorKeys: { type: [String], default: [] } })],
      default: [],
    },
    beds: {
      type: new Schema(
        {
          total: { type: Number, required: true, min: 0, max: LIMITS.hospitalBedsMax },
          types: {
            type: [new Schema({ type: { type: String, required: true, trim: true }, count: { type: Number, required: true, min: 0 } }, { _id: false })],
            default: [],
          },
        },
        { _id: false },
      ),
      default: undefined,
    },
    insurance: {
      type: new Schema({ cashless: { type: Boolean, default: false }, providers: { type: [String], default: [] } }, { _id: false }),
      default: undefined,
    },
    doctors: {
      type: [
        new Schema(
          {
            doctorProfileId: { type: Schema.Types.ObjectId, ref: "DoctorProfile" },
            key: str,
            name: str,
            qualifications: str,
            specialty: str,
            role: str,
            photo: { type: imageSchema, default: undefined },
            profileUrl: str,
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    languages: { type: [String], default: [] },
    gallery: { type: [galleryItemSchema], default: [] },
    links: {
      googleBusiness: str,
      practo: str,
      instagram: str,
      facebook: str,
      youtube: str,
      website: str,
    },

    siteTemplateId: { type: String, enum: TEMPLATE_KEYS, default: DEFAULT_TEMPLATE_KEY },
    seo: {
      titleOverride: str,
      descriptionOverride: str,
      noindex: { type: Boolean, default: false },
    },

    plan: { type: String, enum: ESTABLISHMENT_PLANS, required: true },
    founding: { type: Boolean, default: false },
    foundingNumber: { type: Number, min: 1 },
    setupPaidAt: { type: Date },
    renewalPrice: { type: Number, min: 0 },
    renewalDueDate: { type: Date },
    renewalStatus: { type: String, enum: RENEWAL_STATUSES, default: "active" },
    renewalRemindersSent: { type: [String], default: [] },
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
    salesExecutive: str,
    salesExecutiveId: str,
    salesAdminId: { type: Schema.Types.ObjectId, ref: "Admin", index: true },
    source: { type: String, enum: ESTABLISHMENT_SOURCES },
    contactPerson: {
      type: new Schema({ name: str, phone: str, email: { type: String, trim: true, lowercase: true } }, { _id: false }),
      default: undefined,
    },
    internalNotes: { type: String },

    compliance: {
      lastScanAt: { type: Date },
      issues: { type: [complianceIssueSchema], default: [] },
      ownerApprovedAt: { type: Date },
      approvedVia: { type: String, enum: APPROVAL_CHANNELS },
    },

    ownerEmail: { type: String, trim: true, lowercase: true },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

/** Gallery size per kind; bed types can't add up to more than the total. */
establishmentSchema.pre("validate", function (next) {
  const max = this.kind === "hospital" ? LIMITS.hospitalGalleryMax : LIMITS.clinicGalleryMax;
  if ((this.gallery ?? []).length > max) this.invalidate("gallery", `At most ${max} photos for a ${this.kind}.`);
  if (this.beds) {
    const sum = (this.beds.types ?? []).reduce((n, t) => n + (t.count ?? 0), 0);
    if (sum > this.beds.total) this.invalidate("beds", `Bed types add up to ${sum}, more than the total of ${this.beds.total}.`);
  }
  next();
});

// --- Indexes ---
/** A permanent UID on first save (lib/uid.ts): MRC- for clinics, MRH- for hospitals. */
establishmentSchema.pre("save", async function () {
  // Immutable paths can only be set on new documents; older ones get theirs from backfillUids().
  if (this.isNew && !this.uid) this.uid = await nextUid(this.kind === "hospital" ? "hospital" : "clinic");
});

establishmentSchema.index({ uid: 1 }, { unique: true, ...hasString("uid") });
establishmentSchema.index({ citySlug: 1, slug: 1 }, { unique: true, ...hasString("slug") });
establishmentSchema.index({ shortSlug: 1 }, { unique: true, ...hasString("shortSlug") });
establishmentSchema.index({ subdomain: 1 }, { unique: true, ...hasString("subdomain") });
establishmentSchema.index(
  { foundingNumber: 1 },
  { unique: true, partialFilterExpression: { foundingNumber: { $type: "number" } } },
);
establishmentSchema.index({ ownerEmail: 1 });
establishmentSchema.index({ kind: 1, status: 1 });
establishmentSchema.index({ categoryId: 1 });
establishmentSchema.index({ "address.areaId": 1 });
establishmentSchema.index({ "doctors.doctorProfileId": 1 });
establishmentSchema.index({ renewalDueDate: 1 });
establishmentSchema.index({ name: "text" }, { name: "establishment_name_text" });

export const Establishment: Model<EstablishmentDoc> =
  (mongoose.models.Establishment as Model<EstablishmentDoc>) ||
  mongoose.model<EstablishmentDoc>("Establishment", establishmentSchema);

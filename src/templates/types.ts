import type { ReactNode } from "react";

/**
 * PublicDoctor — the sanitised, JSON-serialisable view of a DoctorProfile that
 * public pages and templates render. It deliberately excludes every business /
 * internal field (plan, payments, notes, sales, compliance, owner email).
 * Master-list ids are already resolved to names + slugs.
 */

export interface PublicImage {
  url: string;
  alt: string;
  caption?: string;
}

export interface PublicNamed {
  name: string;
  slug: string;
}

export interface PublicSlot {
  open: string; // "HH:mm"
  close: string;
}

export interface PublicDayTimings {
  day: number; // 0 = Sunday … 6 = Saturday
  slots: PublicSlot[];
}

export interface PublicClinic {
  id: string;
  name: string;
  type: "own_clinic" | "hospital_visiting" | "other";
  addressLine1: string;
  addressLine2?: string;
  area: PublicNamed;
  city: PublicNamed;
  state: string;
  pincode: string;
  /** Single-line address for display and schema. */
  fullAddress: string;
  directionsUrl: string;
  geo?: { lat: number; lng: number };
  phone?: string;
  timings: PublicDayTimings[];
  appointmentNote?: string;
  /** Only present when the doctor chose to show it. */
  fee?: number;
}

export interface PublicDoctor {
  id: string;
  citySlug: string;
  slug: string;
  shortSlug?: string;
  subdomain?: string;
  /** Canonical folder URL on the apex domain. */
  url: string;
  /** What QR codes and cards point to: subdomain URL, else short link, else canonical. */
  shareUrl: string;
  vcfUrl: string;

  title: string;
  firstName: string;
  lastName: string;
  /** "Dr. Amit Shah" (displayName override if set). */
  fullName: string;
  photo?: PublicImage;
  languages: string[];
  practiceSinceYear?: number;

  systemOfMedicine: string;
  registration: { council?: string; number?: string; year?: number; nmrId?: string };
  qualifications: { degree: string; specialization?: string; institute: string; year?: number }[];
  /** "MBBS, MD (Medicine)". */
  degreesLine: string;

  practitionerType: "gp" | "consultant";
  primarySpecialty?: PublicNamed & { plural: string };
  secondarySpecialties: (PublicNamed & { plural: string })[];
  services: { name: string; description?: string }[];
  conditionsTreated: string[];

  clinics: PublicClinic[];

  /** Digits only, with country code (for tel: and wa.me). */
  phone?: string;
  whatsapp?: string;
  email?: string;
  links: Partial<Record<"googleBusiness" | "practo" | "instagram" | "facebook" | "linkedin" | "youtube" | "website", string>>;

  shortBio?: string;
  /** Sanitised HTML (p / strong / em / lists). */
  fullBioHtml?: string;

  awards: { title: string; awardingBody: string; year: number }[];
  memberships: { name: string; since?: number }[];
  publications: { title: string; journal?: string; year?: number; url?: string }[];
  interests: string[];
  /** Gallery photos plus award photos (max 5 in total). */
  gallery: PublicImage[];

  portfolioTemplateId: string;
  cardTemplateId: string;
  seo: { titleOverride?: string; descriptionOverride?: string; noindex: boolean };

  updatedAt: string; // ISO
  publishedAt?: string;
}

/** Small card used on hubs and "Other doctors nearby". */
export interface DoctorCardData {
  id: string;
  url: string;
  fullName: string;
  sortName: string;
  photo?: PublicImage;
  degreesLine: string;
  primarySpecialty?: PublicNamed & { plural: string };
  specialtySlugs: string[];
  areaSlugs: string[];
  /** Primary clinic's area. */
  area?: PublicNamed;
  clinicName?: string;
  updatedAt: string;
}

/**
 * SEO markup rendered by the shared wrapper, never by a template, so every
 * design produces identical headings and intro text. Templates only decide
 * where to place these nodes.
 */
export interface ProfileSeoSlots {
  /** <h1> full name + the "{Specialty} · {Area}, {City}" subheading. */
  heading: ReactNode;
  /** The auto-generated factual intro sentence. */
  intro: ReactNode;
}

export interface PortfolioTemplateProps {
  doctor: PublicDoctor;
  seo: ProfileSeoSlots;
}

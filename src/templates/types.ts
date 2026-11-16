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
  /** Digital visiting card page; defaults to `${url}/card` (sample pages set their own). */
  cardUrl?: string;

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
  /** Photo for "Beyond medicine" (hobbies). Not editable in the dashboard yet. */
  interestsPhoto?: PublicImage;
  /** Personal story beside that photo (achievements, hobbies), split into paragraphs. */
  interestsStory?: { title: string; paragraphs: string[] };
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
  /** "Other doctors nearby" (internal links); templates place it before their footer. */
  nearby?: ReactNode;
}

export interface PortfolioTemplateProps {
  doctor: PublicDoctor;
  seo: ProfileSeoSlots;
}

// ---------------------------------------------------------------------------
// Visiting cards
// ---------------------------------------------------------------------------

export type CardVariant = "print" | "phone";

/**
 * Pixel sizes cards are designed at. Print is 85 × 55 mm at 300 dpi
 * (1004 × 650); phone-share is 1080 × 1920.
 */
export const CARD_SIZE: Record<CardVariant, { width: number; height: number }> = {
  print: { width: 1004, height: 650 },
  phone: { width: 1080, height: 1920 },
};

/** QR code as an SVG path over a `size` × `size` module grid (quiet zone excluded). */
export interface CardQr {
  size: number;
  path: string;
  /** What the code opens (subdomain URL, else short link). */
  url: string;
}

/**
 * Card templates are written once and rendered two ways: as HTML (card page,
 * dashboard) and as an image (PNG/PDF via Satori). So they may only use inline
 * styles, flexbox (every multi-child element sets display:flex), <img> and
 * inline <svg> — no classes or grid, and no CSS variables beyond `fonts`.
 */
export interface CardTemplateProps {
  doctor: PublicDoctor;
  variant: CardVariant;
  qr: CardQr;
  /** Font-family values: CSS variables in HTML, registered font names in images. */
  fonts: { display: string; body: string };
  /** Photo URL safe for both renderers (JPEG); undefined when there's no photo. */
  photoUrl?: string;
  /** Show the dev-only "not designed yet" banner (placeholder slots). */
  devBanner?: string;
}

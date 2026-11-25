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
  /** Google Maps embed of the pin, else of the address. Optional so sample data needs none. */
  mapEmbedUrl?: string;
  geo?: { lat: number; lng: number };
  phone?: string;
  timings: PublicDayTimings[];
  appointmentNote?: string;
  /** Only present when the doctor chose to show it. */
  fee?: number;
  /** The clinic/hospital's own MediReach site, when it has a published one ("Practises at"). */
  site?: { name: string; url: string };
}

/** A general health tip (content/health-tips.ts). No author: never attributed to the doctor. */
export interface PublicHealthTip {
  slug: string;
  title: string;
  excerpt: string;
  paragraphs: string[];
  cover: PublicImage;
  topic: string;
  readMinutes: number;
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
  /** The system in words for anything but allopathy ("Ayurveda", or their own words for Other); absent for allopathy. */
  systemLabel?: string;
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
  /** General health tips for the "Health tips" section (absent when the doctor turned it off). */
  healthTips?: PublicHealthTip[];
  /** Where "Doctor login" in the footer goes (demo pages have their own); defaults to the standalone login. */
  loginUrl?: string;

  portfolioTemplateId: string;
  cardTemplateId: string;
  /** Visiting card colour style code, e.g. "DOC-AMBER" (lib/cards/styles.ts); absent = Lagoon. */
  cardStyle?: string;
  seo: { titleOverride?: string; descriptionOverride?: string; noindex: boolean };
  /** Renewal not paid after the grace period: the page shows a "temporarily unavailable" notice instead. */
  lapsed?: boolean;

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

// ---------------------------------------------------------------------------
// Clinic and hospital sites
// ---------------------------------------------------------------------------

/** A doctor listed on a clinic/hospital site. `url` only when they have a published portfolio. */
export interface PublicSiteDoctor {
  /** DoctorProfile id when linked to a published portfolio. */
  id?: string;
  name: string;
  qualifications?: string;
  specialty?: string;
  role?: string;
  url?: string;
  /** `url` is an outside profile (Practo, own website), not a MediReach page. */
  external?: boolean;
  photo?: PublicImage;
}

/**
 * PublicEstablishment — the sanitised, serialisable view of a clinic or small
 * hospital that public pages and templates render. No business, contact-person,
 * owner or compliance fields; master ids resolved to names + slugs. Only
 * doctors with a published portfolio are linked (others appear by name only).
 */
export interface PublicEstablishment {
  id: string;
  kind: "clinic" | "hospital";
  citySlug: string;
  slug: string;
  url: string;
  shareUrl: string;
  /** Visiting-card page; absent for sample sites. */
  cardUrl?: string;
  name: string;
  category?: PublicNamed & { plural: string };
  themeKey: string;
  logo?: PublicImage;
  coverPhoto?: PublicImage;
  tagline?: string;
  shortDescription?: string;
  aboutHtml?: string;
  registration?: { authority?: string; number?: string };

  address: {
    line1: string;
    line2?: string;
    area: PublicNamed;
    city: PublicNamed;
    state: string;
    pincode: string;
    landmark?: string;
    parkingNote?: string;
    fullAddress: string;
  };
  directionsUrl: string;
  mapEmbedUrl: string;
  geo?: { lat: number; lng: number };
  /** Digits with country code. */
  phones: string[];
  whatsapp?: string;
  email?: string;
  emergencyPhone?: string;

  is24x7: boolean;
  timings: PublicDayTimings[];
  appointmentNote?: string;
  visitingHours?: string;

  services: { name: string; description?: string; group?: string }[];
  facilities: { name: string; description?: string }[];
  equipment: { name: string; description?: string }[];
  doctors: PublicSiteDoctor[];
  departments: { name: string; description?: string; doctors: PublicSiteDoctor[] }[];
  /** `total` is the sum of the types when no total was entered; a type may have no count. */
  beds?: { total: number; types: { type: string; count?: number }[] };
  insurance?: { cashless: boolean; providers: string[] };
  languages: string[];
  gallery: PublicImage[];
  links: Partial<Record<"googleBusiness" | "practo" | "instagram" | "facebook" | "youtube" | "website", string>>;

  siteTemplateId: string;
  cardTemplateId: string;
  /** Visiting card colour style code, e.g. "CLN-OCEAN" (lib/cards/styles.ts); absent = specialty theme colours. */
  cardStyle?: string;
  seo: { titleOverride?: string; descriptionOverride?: string; noindex: boolean };
  /** Renewal not paid after the grace period: the page shows a "temporarily unavailable" notice instead. */
  lapsed?: boolean;
  updatedAt: string;
  publishedAt?: string;
}

/** SEO markup from the shared wrapper; templates only place it. */
export interface SiteSeoSlots {
  /** <h1> name + "{Category} · {Area}, {City}". */
  heading: ReactNode;
  /** "{Name} is a {category} in {Area}, {City}, with {n} doctors." */
  intro: ReactNode;
  /** Visible breadcrumb trail. */
  breadcrumbs: ReactNode;
  /** Quick facts Q&A block. */
  quickFacts: ReactNode;
}

export interface SiteTemplateProps {
  site: PublicEstablishment;
  seo: SiteSeoSlots;
}

/** Small card for clinics/hospitals on hubs (neutral alphabetical order). */
export interface SiteCardData {
  id: string;
  kind: "clinic" | "hospital";
  url: string;
  name: string;
  sortName: string;
  logo?: PublicImage;
  /** Theme primary colour, for the initials tile when there's no logo. */
  color: string;
  category?: PublicNamed & { plural: string };
  area: PublicNamed;
  is24x7: boolean;
  doctorCount: number;
  updatedAt: string;
}

/** Props for clinic/hospital visiting cards (same renderer rules as CardTemplateProps). */
export interface SiteCardTemplateProps {
  site: PublicEstablishment;
  variant: CardVariant;
  qr: CardQr;
  fonts: { display: string; body: string };
  /** Logo URL safe for both renderers (JPEG); undefined when there's no logo. */
  logoUrl?: string;
  devBanner?: string;
}

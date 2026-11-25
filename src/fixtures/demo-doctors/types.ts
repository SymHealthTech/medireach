import type { TemplateKey } from "@/lib/constants";
import type { InquiryStatus, InquiryTime } from "@/lib/inquiries";

/**
 * A FICTIONAL demo doctor: everything needed to show a complete, realistic
 * website without a database (the /sample/{key} pages and design gallery), and
 * to seed the same doctor into a database (`npm run seed:demo`) so the doctor
 * login, inquiries and blog editor can be demonstrated.
 *
 * Master lists are referenced by slug (resolved when seeding) and also carry
 * their display names, so the page renders without the database.
 * Registration numbers start with "DEMO-" and phone numbers are in the unused
 * 98000 001xx range, so nothing can be mistaken for a real practice.
 */

export interface DemoNamed {
  slug: string;
  name: string;
}

export interface DemoClinic {
  name: string;
  type: "own_clinic" | "hospital_visiting";
  addressLine1: string;
  addressLine2?: string;
  area: DemoNamed;
  pincode: string;
  geo: { lat: number; lng: number };
  /** 10-digit number. */
  phone: string;
  timings: { day: number; slots: { open: string; close: string }[] }[];
  appointmentNote?: string;
  fee?: number;
  showFee: boolean;
}

export interface DemoBlogPost {
  slug: string;
  title: string;
  excerpt: string;
  /** Plain text; blank lines split paragraphs. */
  body: string;
  cover: { url: string; alt: string };
  tags: string[];
  /** YYYY-MM-DD. */
  publishedAt: string;
}

export interface DemoInquiry {
  name: string;
  phone: string;
  email?: string;
  daysAgo: number;
  preferredInDays?: number;
  preferredTime?: InquiryTime;
  /** Index into `clinics`. */
  clinic?: number;
  message: string;
  status: InquiryStatus;
}

export interface DemoDoctor {
  /** URL key: /sample/{key}. */
  key: string;
  /** Subdomain shown on the visiting card (also reserved, see config/reserved.ts). */
  subdomain: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: "male" | "female";
  /** Square JPEG (works on the website and in visiting-card images). */
  photo: { url: string; alt: string };
  languages: string[];
  practiceSinceYear: number;
  city: DemoNamed & { state: string };
  council: DemoNamed;
  registration: { number: string; year: number };
  qualifications: { degree: DemoNamed; specialization?: string; institute: string; year: number }[];
  practitionerType: "gp" | "consultant";
  primarySpecialty: DemoNamed & { plural: string };
  secondarySpecialties: (DemoNamed & { plural: string })[];
  services: { name: string; description: string }[];
  conditionsTreated: string[];
  clinics: DemoClinic[];
  mobile: string;
  whatsapp: string;
  email: string;
  links: Partial<Record<"googleBusiness" | "instagram" | "facebook" | "linkedin" | "youtube", string>>;
  shortBio: string;
  /** Simple HTML: p / strong / em / ul / li. */
  fullBio: string;
  awards: { title: string; awardingBody: string; year: number }[];
  memberships: { name: string; since?: number }[];
  publications: { title: string; journal?: string; year?: number }[];
  interests: string[];
  interestsPhoto: { url: string; alt: string; caption: string };
  interestsStory: { title: string; body: string };
  gallery: { url: string; alt: string; caption: string }[];
  blog: DemoBlogPost[];
  /** Appointment requests seeded with the doctor, so the account page has something to show. */
  inquiries: DemoInquiry[];
  portfolioTemplateId: TemplateKey;
  cardTemplateId: TemplateKey;
}

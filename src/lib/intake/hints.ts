import { SEED_CLINIC_CATEGORIES } from "@/data/masters";
import { DESIGN_GROUPS, doctorEntries, doctorRoleLabel, hospitalCategoryFor, str, splitLines, type IntakeData, type RepeatItem } from "./form";

/**
 * What a website form ("Get started") said, for fields the admin editor keeps
 * as master-list dropdowns (council, degrees, specialty, area, category). The
 * editors show these under an empty dropdown with "Use this".
 *
 * Pure module: built on the server, passed to the client editors.
 */

export interface ParsedQualification {
  degree: string;
  specialization: string;
  institute: string;
  year?: number;
}

export interface DoctorFormHints {
  ref: string;
  /** The website form, for the "Open website form" link. */
  intakeId?: string;
  council?: string;
  specialty?: string;
  /** System of medicine in their words (when they chose Other). */
  systemOther?: string;
  /** The applicant's lines, as typed. */
  qualificationLines: string[];
  qualifications: ParsedQualification[];
  /** Per clinic, in form order; hospitals they visit as a consultant come last (type "visiting"). */
  clinics: FormClinic[];
  /** Design choices: website design key, card style code, "final" / "discuss". */
  websiteDesign?: string;
  cardStyle?: string;
  designDecision?: string;
}

export interface FormClinic {
  /** "visiting": a hospital where they are a visiting consultant. */
  type?: "visiting";
  name: string;
  address: string;
  area: string;
  city: string;
  pincode: string;
  phone: string;
  location: string;
  mapsUrl: string;
  appointmentNote: string;
  fee: string;
  timings: string;
}

/** A doctor from a clinic or hospital website form. */
export interface FormSiteDoctor {
  name: string;
  qualifications: string;
  specialty: string;
  role: string;
  profileUrl: string;
  photo?: { publicId: string; url: string };
  department?: string;
}

export interface SiteFormHints {
  ref: string;
  intakeId?: string;
  category?: string;
  area?: string;
  city?: string;
  /** Answers the editor offers to copy in ("Use this"), as typed. */
  tagline?: string;
  yearStarted?: string;
  awards: string[];
  timings?: string;
  appointmentNote?: string;
  visitingHours?: string;
  services: string[];
  facilities: string[];
  equipment: string[];
  insurance: string[];
  doctors: FormSiteDoctor[];
  departments: string[];
  websiteName?: string;
  notes?: string;
  websiteDesign?: string;
  cardStyle?: string;
  designDecision?: string;
}

const YEAR = /\b(19[4-9]\d|20\d{2})\b/g;

/**
 * "MBBS – BJ Medical College, Pune – 2008" → MBBS / BJ Medical College, Pune / 2008.
 * "MD (Medicine) – KEM Hospital – 2012" → MD / Medicine / KEM Hospital / 2012.
 * Also handles "MBBS, BJMC, 2008", "MBBS from BJMC (2008)" and a bare "MBBS".
 */
export function parseQualificationLine(line: string): ParsedQualification | null {
  let s = line.replace(/\s+/g, " ").trim();
  if (!s) return null;
  const years = [...s.matchAll(YEAR)].map((m) => Number(m[1]));
  const year = years.length ? years[years.length - 1] : undefined;
  if (year !== undefined) {
    s = s
      .replace(new RegExp(`[(\\[]?\\s*${year}\\s*[)\\]]?`), "")
      .replace(/\s*[–—|,-]\s*$/, "")
      .trim();
  }
  let parts = s
    .split(/\s+[–—-]\s+|\s*\|\s*|\s+from\s+|\s+at\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 1 && parts[0]!.includes(",")) {
    const [first, ...rest] = parts[0]!.split(",").map((p) => p.trim());
    parts = [first!, rest.join(", ")].filter(Boolean);
  }
  let degree = parts[0] ?? "";
  let specialization = "";
  const paren = degree.match(/^(.+?)\s*\((.+)\)$/);
  if (paren) {
    degree = paren[1]!.trim();
    specialization = paren[2]!.trim();
  }
  if (!degree) return null;
  return {
    degree: degree.slice(0, 120),
    specialization: specialization.slice(0, 80),
    institute: parts.slice(1).join(", ").slice(0, 150),
    ...(year !== undefined && year <= new Date().getFullYear() ? { year } : {}),
  };
}

export function doctorHints(ref: string, data: IntakeData, intakeId?: string): DoctorFormHints {
  const lines = splitLines(data.qualifications);
  const clinics = Array.isArray(data.clinics) ? (data.clinics as RepeatItem[]) : [];
  const visiting = Array.isArray(data.visiting) ? (data.visiting as RepeatItem[]) : [];
  const asClinic = (c: RepeatItem) => ({
    name: str(c.name),
    address: str(c.address),
    area: str(c.area),
    city: str(c.city),
    pincode: str(c.pincode),
    phone: str(c.phone),
    location: str(c.location),
    mapsUrl: str(c.mapsUrl),
    appointmentNote: str(c.appointmentNote),
    fee: str(c.fee),
    timings: str(c.timings),
  });
  return {
    ref,
    ...(intakeId ? { intakeId } : {}),
    ...(str(data.council) ? { council: str(data.council) } : {}),
    ...(str(data.specialty) ? { specialty: str(data.specialty) } : {}),
    ...(str(data.systemOfMedicine) === "other" && str(data.systemOther) ? { systemOther: str(data.systemOther) } : {}),
    ...(str(data.websiteDesign) ? { websiteDesign: str(data.websiteDesign) } : {}),
    ...(str(data.cardStyle) ? { cardStyle: str(data.cardStyle).toUpperCase() } : {}),
    ...(str(data.designDecision) ? { designDecision: str(data.designDecision) } : {}),
    qualificationLines: lines,
    qualifications: lines.map(parseQualificationLine).filter((q): q is ParsedQualification => q !== null),
    clinics: [...clinics.map(asClinic), ...visiting.map((c) => ({ type: "visiting" as const, ...asClinic(c) }))].filter((c) => c.name || c.address || c.area),
  };
}

export function siteHints(ref: string, kind: "clinic" | "hospital", data: IntakeData, intakeId?: string): SiteFormHints {
  const typeKey = kind === "clinic" ? "clinicType" : "hospitalType";
  const type = str(data[typeKey]);
  const hospitalCategory = kind === "hospital" ? SEED_CLINIC_CATEGORIES.find((c) => c.slug === hospitalCategoryFor(type))?.name : undefined;
  const category = type === "other" ? str(data[`${typeKey}Other`]) : (hospitalCategory ?? DESIGN_GROUPS[kind].find((g) => g.value === type)?.label ?? type);
  const opt = (k: string, v: unknown) => (str(v) ? { [k]: str(v) } : {});
  return {
    ref,
    ...(intakeId ? { intakeId } : {}),
    ...(category ? { category } : {}),
    ...opt("area", data.area),
    ...opt("city", data.city),
    ...opt("tagline", data.tagline),
    ...opt("yearStarted", data.yearStarted),
    ...opt("timings", data.timings),
    ...opt("appointmentNote", data.appointmentNote),
    ...opt("visitingHours", data.visitingHours),
    ...opt("websiteName", data.websiteName),
    ...opt("notes", data.notes),
    ...opt("websiteDesign", data.websiteDesign),
    ...(str(data.cardStyle) ? { cardStyle: str(data.cardStyle).toUpperCase() } : {}),
    ...opt("designDecision", data.designDecision),
    awards: splitLines(data.awards),
    services: splitLines(data.services),
    facilities: splitLines(data.facilities),
    equipment: splitLines(data.equipment),
    insurance: splitLines(data.insurance),
    doctors: doctorEntries(kind, data).map(({ doctor: e, department }) => ({
      name: str(e.name),
      qualifications: str(e.education),
      specialty: str(e.designation),
      role: doctorRoleLabel(e),
      profileUrl: str(e.portfolioUrl),
      ...(e.photo ? { photo: { publicId: e.photo.publicId, url: e.photo.url } } : {}),
      ...(department ? { department } : {}),
    })),
    departments: (Array.isArray(data.departments) ? (data.departments as RepeatItem[]) : []).map((d) => str(d.name)).filter(Boolean),
  };
}

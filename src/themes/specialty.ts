/**
 * Specialty themes for clinic and hospital sites (DESIGN_BRIEF.md §5).
 *
 * A theme is configuration, not code: one Classic clinic layout and one Classic
 * hospital layout are skinned by these values (colours via CSS variables,
 * icon, hero illustration, suggested services, section order and labels).
 * Publicly these are "specialty designs", never "templates".
 *
 * Edit here, not in the database. Theme keys match ClinicCategory
 * `defaultThemeKey` values and are stored on Establishment.themeKey, so never
 * rename a key that is in use.
 *
 * NMC: suggested services, labels and points are factual and pass the phrase
 * scanner (test/themes.test.ts). No before/after, no outcome claims.
 */

/** lucide-react icon names used by themes; mapped to components in ./icons.ts. */
export const THEME_ICON_KEYS = [
  "stethoscope",
  "sparkles",
  "smile",
  "eye",
  "ear",
  "heart-pulse",
  "leaf",
  "droplets",
  "activity",
  "baby",
  "flower-2",
  "bone",
  "hospital",
] as const;
export type ThemeIconKey = (typeof THEME_ICON_KEYS)[number];

/** Line illustrations for the hero band (built with the Classic clinic design). */
export const HERO_ILLUSTRATIONS = [
  "stethoscope",
  "skin-care",
  "tooth",
  "eye",
  "ear",
  "heart",
  "leaf",
  "remedy-bottle",
  "spine",
  "child",
  "mother",
  "joint",
  "hospital",
] as const;
export type HeroIllustration = (typeof HERO_ILLUSTRATIONS)[number];

/** Body sections of the Classic clinic/hospital page (header, hero and footer are fixed). */
export const CLINIC_SECTIONS = ["about", "services", "doctors", "timings", "facilities", "gallery", "location", "faq"] as const;
export const HOSPITAL_SECTIONS = ["departments", "beds", "insurance", "visitingHours"] as const;
export const SITE_SECTIONS = [...CLINIC_SECTIONS, ...HOSPITAL_SECTIONS] as const;
export type SiteSection = (typeof SITE_SECTIONS)[number];

export const DEFAULT_SECTION_LABELS: Record<SiteSection, string> = {
  about: "About the clinic",
  services: "Services",
  doctors: "Our doctors",
  timings: "Timings",
  facilities: "Facilities and equipment",
  gallery: "Photos",
  location: "Location",
  faq: "Quick facts",
  departments: "Departments",
  beds: "Beds",
  insurance: "Insurance and cashless",
  visitingHours: "Visiting hours",
};

export interface ThemePalette {
  primary: string;
  accent: string;
  soft: string;
}

export interface SuggestedService {
  name: string;
  /** One of the theme's `serviceGroups` (services are grouped by it on the page). */
  group?: string;
}

export interface SpecialtyTheme {
  key: string;
  name: string;
  /** "clinic" themes can also be picked for hospitals and vice versa; this is the default use. */
  kind: "clinic" | "hospital";
  icon: ThemeIconKey;
  palette: ThemePalette;
  heroIllustration: HeroIllustration;
  /** Group headings for services, in display order. Empty = one flat list. */
  serviceGroups: string[];
  /** Pre-filled in the admin form; the admin edits or removes them. */
  suggestedServices: SuggestedService[];
  sectionOrder: SiteSection[];
  /** Overrides of DEFAULT_SECTION_LABELS. */
  sectionLabels: Partial<Record<SiteSection, string>>;
  /** What this design puts first (DESIGN_BRIEF.md §5, "Emphasis"). Internal. */
  emphasis: string;
  /** Three "built for this specialty" points (homepage specialty design section). */
  points: [string, string, string];
}

const CLINIC_ORDER: SiteSection[] = ["about", "services", "doctors", "timings", "facilities", "gallery", "location", "faq"];
const TIMINGS_FIRST: SiteSection[] = ["timings", "services", "about", "doctors", "facilities", "gallery", "location", "faq"];
const FACILITIES_EARLY: SiteSection[] = ["about", "services", "facilities", "doctors", "timings", "gallery", "location", "faq"];
const HOSPITAL_ORDER: SiteSection[] = [
  "about",
  "services",
  "departments",
  "doctors",
  "facilities",
  "beds",
  "insurance",
  "timings",
  "visitingHours",
  "gallery",
  "location",
  "faq",
];

const s = (group: string, ...names: string[]): SuggestedService[] => names.map((name) => ({ name, group }));

export const SPECIALTY_THEMES = [
  {
    key: "general-opd",
    name: "General OPD",
    kind: "clinic",
    icon: "stethoscope",
    palette: { primary: "#0E3B3C", accent: "#E3A23B", soft: "#DCE8E2" },
    heroIllustration: "stethoscope",
    serviceGroups: [],
    suggestedServices: [
      { name: "General consultation" },
      { name: "Fever and infections" },
      { name: "Diabetes and blood pressure follow-up" },
      { name: "Health check-ups" },
      { name: "Vaccinations" },
      { name: "Minor dressings" },
    ],
    sectionOrder: TIMINGS_FIRST,
    sectionLabels: { timings: "Timings and walk-in" },
    emphasis: "Timings, walk-in info, services",
    points: ["Timings and walk-in hours up front", "Services in plain words", "One-tap call and directions"],
  },
  {
    key: "skin",
    name: "Skin & Hair",
    kind: "clinic",
    icon: "sparkles",
    palette: { primary: "#5B3A4A", accent: "#D9A38B", soft: "#F4E6E0" },
    heroIllustration: "skin-care",
    serviceGroups: ["Skin", "Hair", "Nails", "Procedures"],
    suggestedServices: [
      ...s("Skin", "Acne", "Pigmentation", "Eczema and psoriasis", "Skin allergies"),
      ...s("Hair", "Hair fall", "Dandruff and scalp conditions"),
      ...s("Nails", "Nail infections"),
      ...s("Procedures", "Chemical peels", "Laser procedures", "Skin biopsy"),
    ],
    sectionOrder: CLINIC_ORDER,
    sectionLabels: { services: "Treatments by concern", facilities: "Equipment" },
    emphasis: "Treatments by concern, equipment (no before/after)",
    points: ["Treatments grouped by concern", "Equipment section, no before/after photos", "Calm, soft colours"],
  },
  {
    key: "dental",
    name: "Dental",
    kind: "clinic",
    icon: "smile",
    palette: { primary: "#1F4E6B", accent: "#7FC8D6", soft: "#E3F2F5" },
    heroIllustration: "tooth",
    serviceGroups: ["General dentistry", "Restorative", "Orthodontics", "Surgical"],
    suggestedServices: [
      ...s("General dentistry", "Check-up and cleaning", "Fillings"),
      ...s("Restorative", "Root canal treatment", "Crowns and bridges", "Dentures", "Dental implants"),
      ...s("Orthodontics", "Braces", "Clear aligners"),
      ...s("Surgical", "Tooth extraction", "Wisdom tooth removal"),
    ],
    sectionOrder: FACILITIES_EARLY,
    sectionLabels: { services: "Procedures", facilities: "Chairs and equipment" },
    emphasis: "Procedures list, chairs/equipment, fees",
    points: ["Procedures listed clearly", "Chairs and equipment section", "Fees shown if you choose"],
  },
  {
    key: "eye",
    name: "Eye",
    kind: "clinic",
    icon: "eye",
    palette: { primary: "#203A5C", accent: "#6BA6D6", soft: "#E4EEF7" },
    heroIllustration: "eye",
    serviceGroups: ["Conditions", "Diagnostics", "Surgery", "Optical counter"],
    suggestedServices: [
      ...s("Conditions", "Cataract", "Glaucoma", "Diabetic eye care", "Squint"),
      ...s("Diagnostics", "Eye check-up", "Retina scan", "Visual field test"),
      ...s("Surgery", "Cataract surgery", "LASIK"),
      ...s("Optical counter", "Spectacles", "Contact lenses"),
    ],
    sectionOrder: CLINIC_ORDER,
    sectionLabels: { services: "Services by condition", facilities: "Equipment and diagnostics" },
    emphasis: "Conditions, diagnostics, optical counter",
    points: ["Services grouped by condition", "Equipment and diagnostics section", "Spectacle/lens counter timings"],
  },
  {
    key: "ent",
    name: "ENT",
    kind: "clinic",
    icon: "ear",
    palette: { primary: "#2E4A3F", accent: "#C9A34A", soft: "#E9EFE6" },
    heroIllustration: "ear",
    serviceGroups: ["Ear", "Nose and sinus", "Throat", "Diagnostics"],
    suggestedServices: [
      ...s("Ear", "Ear infections", "Hearing loss", "Ear wax removal"),
      ...s("Nose and sinus", "Sinusitis", "Allergic rhinitis"),
      ...s("Throat", "Tonsillitis", "Voice problems"),
      ...s("Diagnostics", "Audiometry", "Endoscopy"),
    ],
    sectionOrder: CLINIC_ORDER,
    sectionLabels: { facilities: "Audiology and diagnostics" },
    emphasis: "Procedures, audiology/diagnostics",
    points: ["Ear, nose and throat services grouped", "Audiology and diagnostics section", "Clear procedure list"],
  },
  {
    key: "cardiology",
    name: "Cardiology",
    kind: "clinic",
    icon: "heart-pulse",
    palette: { primary: "#5A1F2B", accent: "#E07A6B", soft: "#F6E5E3" },
    heroIllustration: "heart",
    serviceGroups: ["Consultation", "Tests"],
    suggestedServices: [
      ...s("Consultation", "Heart consultation", "Blood pressure management", "Cholesterol management"),
      ...s("Tests", "ECG", "2D Echo", "TMT (stress test)", "Holter monitoring"),
    ],
    sectionOrder: ["about", "services", "timings", "doctors", "facilities", "gallery", "location", "faq"],
    sectionLabels: { services: "Consultation and tests", timings: "Consultation hours" },
    emphasis: "Tests (ECG, Echo, TMT), consultation hours",
    points: ["Tests like ECG, Echo and TMT listed", "Consultation hours up front", "Doctors with registration shown"],
  },
  {
    key: "ayurveda",
    name: "Ayurveda",
    kind: "clinic",
    icon: "leaf",
    palette: { primary: "#4A5A23", accent: "#C88A2C", soft: "#F1EEDC" },
    heroIllustration: "leaf",
    serviceGroups: ["Consultation", "Therapies"],
    suggestedServices: [
      ...s("Consultation", "Ayurvedic consultation", "Diet and lifestyle advice"),
      ...s("Therapies", "Panchakarma", "Abhyanga", "Shirodhara", "Basti", "Nasya"),
    ],
    sectionOrder: CLINIC_ORDER,
    sectionLabels: { services: "Consultation and therapies" },
    emphasis: "Therapies (Panchakarma etc.), consultation",
    points: ["Therapies like Panchakarma explained", "Consultation process shown", "Warm, earthy colours"],
  },
  {
    key: "homeopathy",
    name: "Homeopathy",
    kind: "clinic",
    icon: "droplets",
    palette: { primary: "#2F5D50", accent: "#9DBF7A", soft: "#EAF2E3" },
    heroIllustration: "remedy-bottle",
    serviceGroups: [],
    suggestedServices: [
      { name: "First consultation" },
      { name: "Follow-up consultation" },
      { name: "Allergies" },
      { name: "Skin conditions" },
      { name: "Respiratory conditions" },
      { name: "Digestive conditions" },
    ],
    sectionOrder: CLINIC_ORDER,
    sectionLabels: { about: "About the clinic and consultation", services: "Conditions treated" },
    emphasis: "Consultation process, conditions treated",
    points: ["How a consultation works", "Conditions treated, listed factually", "Gentle, light colours"],
  },
  {
    key: "physiotherapy",
    name: "Physiotherapy",
    kind: "clinic",
    icon: "activity",
    palette: { primary: "#174A5C", accent: "#F08A4B", soft: "#E2EFF2" },
    heroIllustration: "spine",
    serviceGroups: ["Therapy types", "Home visits"],
    suggestedServices: [
      ...s("Therapy types", "Back and neck pain", "Sports injuries", "Post-surgery rehabilitation", "Neuro rehabilitation", "Electrotherapy"),
      ...s("Home visits", "Home physiotherapy"),
    ],
    sectionOrder: FACILITIES_EARLY,
    sectionLabels: { services: "Therapy types", facilities: "Equipment" },
    emphasis: "Therapy types, equipment, home visits",
    points: ["Therapy types grouped", "Equipment section", "Home visit information"],
  },
  {
    key: "paediatrics",
    name: "Paediatrics",
    kind: "clinic",
    icon: "baby",
    palette: { primary: "#2B4C7E", accent: "#F2B84B", soft: "#EAF0FA" },
    heroIllustration: "child",
    serviceGroups: ["Consultation", "Vaccination", "Growth and development"],
    suggestedServices: [
      ...s("Consultation", "Child consultation", "Newborn care"),
      ...s("Vaccination", "Vaccination as per IAP schedule"),
      ...s("Growth and development", "Growth monitoring", "Nutrition advice"),
    ],
    sectionOrder: TIMINGS_FIRST,
    sectionLabels: { services: "Services and vaccination" },
    emphasis: "Vaccination schedule info, timings",
    points: ["Vaccination information", "Timings up front", "Friendly, bright colours"],
  },
  {
    key: "gynaecology",
    name: "Gynaecology",
    kind: "clinic",
    icon: "flower-2",
    palette: { primary: "#5C2E55", accent: "#E39AB1", soft: "#F6E8EF" },
    heroIllustration: "mother",
    serviceGroups: ["Pregnancy care", "Gynaecology"],
    suggestedServices: [
      ...s("Pregnancy care", "Antenatal care", "Postnatal care", "High-risk pregnancy care"),
      ...s("Gynaecology", "Menstrual problems", "PCOS", "Menopause care", "Family planning"),
    ],
    sectionOrder: CLINIC_ORDER,
    sectionLabels: {},
    emphasis: "Services, antenatal care info",
    points: ["Antenatal care information", "Services listed clearly", "Calm, private feel"],
  },
  {
    key: "orthopaedics",
    name: "Orthopaedics",
    kind: "clinic",
    icon: "bone",
    palette: { primary: "#2C3E50", accent: "#E3A23B", soft: "#E8ECEF" },
    heroIllustration: "joint",
    serviceGroups: ["Conditions", "Procedures", "Physiotherapy"],
    suggestedServices: [
      ...s("Conditions", "Fractures", "Joint pain", "Back pain", "Sports injuries"),
      ...s("Procedures", "Joint replacement", "Arthroscopy"),
      ...s("Physiotherapy", "Physiotherapy and rehabilitation"),
    ],
    sectionOrder: CLINIC_ORDER,
    sectionLabels: { services: "Conditions and procedures" },
    emphasis: "Procedures, physiotherapy link",
    points: ["Procedures listed clearly", "Physiotherapy linked", "Strong, steady colours"],
  },
  {
    key: "small-hospital",
    name: "Small hospital",
    kind: "hospital",
    icon: "hospital",
    palette: { primary: "#0E3B3C", accent: "#C8664B", soft: "#E6EFEC" },
    heroIllustration: "hospital",
    serviceGroups: [],
    suggestedServices: [
      { name: "24×7 emergency" },
      { name: "OPD consultation" },
      { name: "Inpatient care" },
      { name: "Day-care procedures" },
      { name: "Laboratory" },
      { name: "Pharmacy" },
    ],
    sectionOrder: HOSPITAL_ORDER,
    sectionLabels: { about: "About the hospital" },
    emphasis: "24×7 bar, departments, beds, insurance",
    points: ["24×7 contact bar", "Departments and doctors by department", "Beds and insurance/TPA list"],
  },
] as const satisfies readonly SpecialtyTheme[];

export type ThemeKey = (typeof SPECIALTY_THEMES)[number]["key"];
export const THEME_KEYS = SPECIALTY_THEMES.map((t) => t.key) as ThemeKey[];
export const DEFAULT_CLINIC_THEME: ThemeKey = "general-opd";
export const DEFAULT_HOSPITAL_THEME: ThemeKey = "small-hospital";

const BY_KEY = new Map<string, SpecialtyTheme>(SPECIALTY_THEMES.map((t) => [t.key, t]));

export function isThemeKey(key: unknown): key is ThemeKey {
  return typeof key === "string" && BY_KEY.has(key);
}

/** Theme by key; unknown keys fall back to the kind's default so a page never breaks. */
export function getTheme(key: string | undefined, kind: "clinic" | "hospital" = "clinic"): SpecialtyTheme {
  return BY_KEY.get(key ?? "") ?? BY_KEY.get(kind === "hospital" ? DEFAULT_HOSPITAL_THEME : DEFAULT_CLINIC_THEME)!;
}

/** Section label for a theme (theme override, else the default). */
export function sectionLabel(theme: SpecialtyTheme, section: SiteSection): string {
  return theme.sectionLabels[section] ?? DEFAULT_SECTION_LABELS[section];
}

/**
 * Sections to render for a kind: the theme's order, minus hospital-only
 * sections on clinic sites, plus any sections the theme left out appended at
 * the end so a hospital on a clinic theme still shows beds/departments.
 */
export function sectionsFor(theme: SpecialtyTheme, kind: "clinic" | "hospital"): SiteSection[] {
  const allowed: readonly SiteSection[] = kind === "hospital" ? SITE_SECTIONS : CLINIC_SECTIONS;
  const ordered = theme.sectionOrder.filter((x) => allowed.includes(x));
  return [...ordered, ...allowed.filter((x) => !ordered.includes(x))];
}

/** CSS custom properties for a theme; set on the site wrapper's `style`. */
export function themeCssVars(theme: SpecialtyTheme): Record<`--theme-${string}`, string> {
  return {
    "--theme-primary": theme.palette.primary,
    "--theme-accent": theme.palette.accent,
    "--theme-soft": theme.palette.soft,
  };
}

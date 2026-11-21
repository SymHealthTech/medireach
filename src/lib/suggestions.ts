import { SEED_CLINIC_CATEGORIES, SEED_COUNCILS, SEED_DEGREES, SEED_SPECIALTIES } from "@/data/masters";
import { getTheme, isThemeKey } from "@/themes/specialty";

/**
 * Suggestions shown as one-tap chips (or a type-ahead list) in every form:
 * the website forms ("Get started") and the admin editors. One list per
 * topic, so both sides always offer the same choices. Everything stays
 * editable and "Other" / free text is always allowed.
 *
 * NMC: factual items only (what is offered, never how good it is).
 *
 * Pure module: used by the browser and the server.
 */

const uniq = (list: string[]) => {
  const seen = new Set<string>();
  return list.filter((x) => {
    const k = x.trim().toLowerCase();
    return k && !seen.has(k) && seen.add(k);
  });
};

export const LANGUAGE_SUGGESTIONS = ["English", "Hindi", "Marathi", "Gujarati", "Kannada", "Telugu", "Tamil", "Bengali", "Urdu", "Konkani", "Malayalam", "Punjabi"];

export const CONTACT_ROLE_SUGGESTIONS = ["Owner", "Doctor", "Medical director", "Clinic manager", "Hospital administrator", "Receptionist"];

export const APPOINTMENT_NOTE_SUGGESTIONS = [
  "Walk-ins welcome",
  "Appointments preferred. Walk-ins welcome.",
  "By appointment only",
  "Call ahead for procedures",
  "Online and phone appointments",
];

export const VISITING_HOURS_SUGGESTIONS = ["11 am – 1 pm and 5 pm – 7 pm", "4 pm – 7 pm", "10 am – 12 pm and 5 pm – 8 pm"];

export const REG_AUTHORITY_SUGGESTIONS = [
  "Pune Municipal Corporation",
  "Pimpri Chinchwad Municipal Corporation",
  "Maharashtra Nursing Homes Act (Bombay Nursing Homes Registration Act)",
  "Clinical Establishments Act",
  "Pune Cantonment Board",
];

export const INSURANCE_SUGGESTIONS = [
  "Star Health",
  "HDFC ERGO",
  "ICICI Lombard",
  "Niva Bupa",
  "Care Health",
  "Bajaj Allianz",
  "Tata AIG",
  "New India Assurance",
  "United India Insurance",
  "National Insurance",
  "Oriental Insurance",
  "Aditya Birla Health",
  "MediAssist (TPA)",
  "Paramount (TPA)",
  "Raksha (TPA)",
  "Vidal Health (TPA)",
  "MD India (TPA)",
  "CGHS",
  "ECHS",
  "Mahatma Jyotiba Phule Jan Arogya Yojana",
  "Ayushman Bharat (PM-JAY)",
];

export const BED_TYPE_SUGGESTIONS = ["General ward", "Semi-private", "Private room", "Deluxe room", "ICU", "NICU", "HDU", "Day care", "Labour room"];

export const DEPARTMENT_SUGGESTIONS = [
  "General Medicine",
  "General Surgery",
  "Orthopaedics",
  "Obstetrics and Gynaecology",
  "Paediatrics",
  "Neonatology",
  "Cardiology",
  "ENT",
  "Ophthalmology",
  "Dermatology",
  "Urology",
  "Gastroenterology",
  "Nephrology",
  "Neurology",
  "Pulmonology",
  "Anaesthesiology",
  "Radiology",
  "Pathology",
  "Physiotherapy",
  "Dental",
  "Emergency and Trauma",
  "Critical Care (ICU)",
];

export const MEMBERSHIP_SUGGESTIONS = [
  "Indian Medical Association (IMA)",
  "Indian Academy of Pediatrics (IAP)",
  "Federation of Obstetric and Gynaecological Societies of India (FOGSI)",
  "Indian Dental Association (IDA)",
  "Indian Orthopaedic Association (IOA)",
  "Association of Physicians of India (API)",
  "Indian Association of Dermatologists, Venereologists and Leprologists (IADVL)",
  "All India Ophthalmological Society (AIOS)",
  "Association of Otolaryngologists of India (AOI)",
  "Cardiological Society of India (CSI)",
  "Indian Association of Physiotherapists (IAP)",
];

export const INTEREST_SUGGESTIONS = ["Running", "Trekking", "Cycling", "Yoga", "Music", "Reading", "Travel", "Photography", "Cricket", "Social work", "Cooking"];

/** Specialty names, degree names and council names: the master lists, as type-ahead suggestions. */
export const SPECIALTY_SUGGESTIONS = SEED_SPECIALTIES.map((s) => s.name);
export const DEGREE_SUGGESTIONS = SEED_DEGREES.map((d) => d.name);
export const COUNCIL_SUGGESTIONS = SEED_COUNCILS.map((c) => c.name);

/** Designations for doctors at a clinic or hospital ("Consultant Dermatologist"), A–Z for the dropdown. */
export const DESIGNATION_SUGGESTIONS = uniq([
  "General Physician",
  "Consultant Physician",
  "Consultant Surgeon",
  "Consultant Dermatologist",
  "Consultant Paediatrician",
  "Consultant Gynaecologist",
  "Consultant Orthopaedic Surgeon",
  "Consultant Cardiologist",
  "Consultant ENT Surgeon",
  "Consultant Ophthalmologist",
  "Dental Surgeon",
  "Orthodontist",
  "Physiotherapist",
  "Anaesthetist",
  "Radiologist",
  "Pathologist",
  "Dietitian",
  ...SPECIALTY_SUGGESTIONS,
]).sort((a, b) => a.localeCompare(b, "en"));

// --- Facilities and equipment -------------------------------------------------

const COMMON_FACILITIES = ["Wheelchair access", "Lift", "Parking", "Two-wheeler parking", "Waiting area", "Drinking water", "Washroom", "Air-conditioned", "Card and UPI payments", "Online appointments"];
const CLINIC_FACILITIES = [...COMMON_FACILITIES, "Pharmacy", "Lab sample collection", "Home visits", "Teleconsultation"];
const HOSPITAL_FACILITIES = [
  "24×7 emergency",
  "Ambulance",
  "In-house pharmacy (24×7)",
  "Pathology lab",
  "Radiology (X-ray, sonography)",
  "Operation theatre",
  "ICU",
  "Labour room",
  "Blood storage",
  "Cafeteria",
  "Cashless insurance desk",
  "Power backup",
  "Oxygen supply",
  ...COMMON_FACILITIES,
];

const EQUIPMENT: Record<string, string[]> = {
  "general-opd": ["ECG machine", "Nebuliser", "Glucometer", "Pulse oximeter", "Digital BP monitor", "Weighing scale and height chart"],
  skin: ["Dermatoscope", "Q-switched laser", "Diode laser", "Radiofrequency device", "Microdermabrasion device", "Chemical peel kit", "Wood's lamp"],
  dental: ["Dental chair", "Digital X-ray (RVG)", "OPG machine", "Intraoral camera", "Autoclave", "Ultrasonic scaler", "Rotary endodontic system"],
  eye: ["Slit lamp", "Auto-refractometer", "Non-contact tonometer", "Fundus camera", "OCT", "Phaco machine", "Keratometer"],
  ent: ["ENT treatment unit", "Nasal endoscope", "Audiometer", "Tympanometer", "Microscope", "Laryngoscope"],
  cardiology: ["ECG machine", "2D Echo", "TMT (stress test)", "Holter monitor", "ABPM", "Defibrillator"],
  ayurveda: ["Panchakarma table", "Steam chamber (Swedana)", "Shirodhara stand", "Nadi pariksha"],
  homeopathy: ["Digital BP monitor", "Weighing scale"],
  physiotherapy: ["IFT", "TENS", "Ultrasound therapy", "Traction unit", "Shortwave diathermy", "Exercise equipment", "Treadmill"],
  paediatrics: ["Infant weighing scale", "Nebuliser", "Pulse oximeter", "Vaccine refrigerator", "Phototherapy unit"],
  gynaecology: ["Ultrasound (sonography)", "Colposcope", "CTG / fetal monitor", "Doppler"],
  orthopaedics: ["Digital X-ray", "C-arm", "Plaster room", "Bone densitometer"],
  "small-hospital": [
    "Digital X-ray",
    "Ultrasound (sonography)",
    "ECG machine",
    "Ventilator",
    "Multipara monitor",
    "Defibrillator",
    "C-arm",
    "Anaesthesia workstation",
    "Infusion pumps",
    "Oxygen concentrator",
  ],
};

const MULTISPECIALTY_SERVICES = [
  "General consultation",
  "Child health",
  "Women's health",
  "Skin care",
  "Bone and joint care",
  "Diabetes care",
  "Health check-ups",
  "Vaccinations",
  "Minor procedures",
];
const DIAGNOSTIC_SERVICES = ["Blood tests", "Thyroid profile", "Diabetes tests (HbA1c)", "Lipid profile", "Digital X-ray", "Sonography", "ECG", "Home sample collection", "Health packages"];
const HOSPITAL_SERVICES = [
  "OPD consultation",
  "Emergency and trauma care",
  "General surgery",
  "Normal and caesarean delivery",
  "Orthopaedic surgery",
  "Day-care procedures",
  "ICU care",
  "Health check-ups",
  "Physiotherapy",
  "Diagnostics (lab and imaging)",
];

/**
 * The specialty design (theme key) for a clinic type: a clinic category slug
 * ("skin"), a theme key, or a hospital type. Unknown → the kind's default.
 */
export function themeKeyFor(kind: "clinic" | "hospital", type: string): string {
  if (kind === "hospital") return "small-hospital";
  if (isThemeKey(type)) return type;
  return SEED_CLINIC_CATEGORIES.find((c) => c.slug === type)?.defaultThemeKey ?? "general-opd";
}

/** Services for a clinic or hospital type (category slug, theme key or hospital type). */
export function serviceSuggestions(kind: "clinic" | "hospital", type: string): string[] {
  if (kind === "hospital") return uniq([...HOSPITAL_SERVICES, ...getTheme("small-hospital", "hospital").suggestedServices.map((s) => s.name)]);
  if (type === "multispecialty") return MULTISPECIALTY_SERVICES;
  if (type === "diagnostic-centre") return DIAGNOSTIC_SERVICES;
  return getTheme(themeKeyFor(kind, type), kind).suggestedServices.map((s) => s.name);
}

export function facilitySuggestions(kind: "clinic" | "hospital"): string[] {
  return kind === "hospital" ? HOSPITAL_FACILITIES : CLINIC_FACILITIES;
}

export function equipmentSuggestions(kind: "clinic" | "hospital", type: string): string[] {
  if (type === "diagnostic-centre") return ["Fully automated analyser", "Digital X-ray", "Ultrasound (sonography)", "ECG machine", "Centrifuge"];
  if (type === "multispecialty") return uniq([...EQUIPMENT["general-opd"]!, "Digital X-ray", "Ultrasound (sonography)"]);
  return EQUIPMENT[themeKeyFor(kind, type)] ?? EQUIPMENT["general-opd"]!;
}

// --- Doctors: services and conditions by specialty --------------------------

/** Rough match of a specialty name to a specialty design ("Consultant Dermatologist" → skin). */
export function themeKeyForSpecialty(specialty: string): string {
  const s = specialty.toLowerCase();
  const rules: [RegExp, string][] = [
    [/derma|skin|cosmet|trich/, "skin"],
    [/dent|ortho?dont|endodont|periodont|prosthodont|oral/, "dental"],
    [/ophthal|eye|optom|retina/, "eye"],
    [/\bent\b|otorhino|otolaryn|ear|nose|throat/, "ent"],
    [/cardi|heart/, "cardiology"],
    [/ayur/, "ayurveda"],
    [/homoeo|homeo/, "homeopathy"],
    [/physio|rehab/, "physiotherapy"],
    [/paed|pediat|child|neonat/, "paediatrics"],
    [/gyn|obst|ivf|fertil|women/, "gynaecology"],
    [/ortho|bone|joint|spine|sports/, "orthopaedics"],
  ];
  return rules.find(([re]) => re.test(s))?.[1] ?? "general-opd";
}

const CONDITIONS: Record<string, string[]> = {
  "general-opd": ["Fever and infections", "Diabetes", "High blood pressure", "Thyroid disorders", "Asthma and allergies", "Acidity and digestion problems", "Cough and cold"],
  skin: ["Acne", "Eczema", "Psoriasis", "Hair fall", "Fungal infections", "Pigmentation", "Vitiligo", "Allergies and hives"],
  dental: ["Tooth decay", "Gum disease", "Tooth sensitivity", "Crooked teeth", "Missing teeth", "Wisdom tooth pain", "Bad breath"],
  eye: ["Cataract", "Glaucoma", "Refractive errors", "Dry eyes", "Diabetic retinopathy", "Squint", "Eye infections"],
  ent: ["Sinusitis", "Ear infections", "Hearing loss", "Tonsillitis", "Vertigo", "Snoring", "Nasal allergies"],
  cardiology: ["High blood pressure", "Chest pain", "Heart failure", "Irregular heartbeat", "High cholesterol", "Coronary artery disease"],
  ayurveda: ["Joint pain", "Digestive problems", "Stress and sleep problems", "Skin conditions", "Obesity", "PCOS"],
  homeopathy: ["Allergies", "Skin conditions", "Recurrent colds", "Migraine", "Joint pain", "Anxiety"],
  physiotherapy: ["Back pain", "Neck pain", "Knee pain", "Frozen shoulder", "Sports injuries", "Post-surgery rehabilitation", "Stroke rehabilitation"],
  paediatrics: ["Fever in children", "Cough and cold", "Diarrhoea", "Asthma", "Growth and nutrition problems", "Allergies"],
  gynaecology: ["PCOS", "Irregular periods", "Infertility", "Menopause problems", "Fibroids", "Pregnancy care"],
  orthopaedics: ["Arthritis", "Back pain", "Fractures", "Sports injuries", "Osteoporosis", "Knee and hip pain", "Frozen shoulder"],
};

export function doctorServiceSuggestions(specialty: string): string[] {
  const key = themeKeyForSpecialty(specialty);
  return getTheme(key).suggestedServices.map((s) => s.name);
}

export function conditionSuggestions(specialty: string): string[] {
  return CONDITIONS[themeKeyForSpecialty(specialty)] ?? CONDITIONS["general-opd"]!;
}

// --- Website-form fields ------------------------------------------------------

/** Which suggestion list a website-form field shows (see `fieldSuggestions`). */
export type SuggestKey =
  | "languages"
  | "contactRole"
  | "appointmentNote"
  | "visitingHours"
  | "regAuthority"
  | "insurance"
  | "services"
  | "facilities"
  | "equipment"
  | "department"
  | "designation"
  | "education"
  | "specialty"
  | "council"
  | "doctorServices"
  | "conditions"
  | "memberships"
  | "interests";

/**
 * The suggestions for a website-form field. `data` is the whole form (the
 * clinic type or the doctor's specialty picks the lists).
 */
export function fieldSuggestions(kind: "doctor" | "clinic" | "hospital", key: SuggestKey, data: Record<string, unknown>): string[] {
  const site = kind === "hospital" ? "hospital" : "clinic";
  const type = typeof data.clinicType === "string" ? data.clinicType : "";
  const specialty = typeof data.specialty === "string" ? data.specialty : "";
  switch (key) {
    case "languages":
      return LANGUAGE_SUGGESTIONS;
    case "contactRole":
      return CONTACT_ROLE_SUGGESTIONS;
    case "appointmentNote":
      return APPOINTMENT_NOTE_SUGGESTIONS;
    case "visitingHours":
      return VISITING_HOURS_SUGGESTIONS;
    case "regAuthority":
      return REG_AUTHORITY_SUGGESTIONS;
    case "insurance":
      return INSURANCE_SUGGESTIONS;
    case "services":
      return serviceSuggestions(site, type);
    case "facilities":
      return facilitySuggestions(site);
    case "equipment":
      return equipmentSuggestions(site, type);
    case "department":
      return DEPARTMENT_SUGGESTIONS;
    case "designation":
      return DESIGNATION_SUGGESTIONS;
    case "education":
      return DEGREE_SUGGESTIONS;
    case "specialty":
      return SPECIALTY_SUGGESTIONS;
    case "council":
      return COUNCIL_SUGGESTIONS;
    case "doctorServices":
      return doctorServiceSuggestions(specialty);
    case "conditions":
      return conditionSuggestions(specialty);
    case "memberships":
      return MEMBERSHIP_SUGGESTIONS;
    case "interests":
      return INTEREST_SUGGESTIONS;
  }
}

import type { PublicDoctor } from "@/templates/types";

/**
 * Photo library by specialty for the doctor website designs. Each design's
 * hero carousel and photo bands use the set that matches the doctor: a
 * dermatologist gets skin-care photos, a paediatrician children's photos and
 * so on. The primary specialty is checked first, then the others, then the
 * system of medicine (Ayurveda, homoeopathy…). With no match, the design's
 * own general photos are used (`fallback`), else general clinic photos.
 *
 * To add a specialty: put 7 photos in public/templates/specialty/<key>/
 * (hero-1…4, band-1, band-2, feature), add a set below, map its specialty
 * slugs in SLUG_GROUP, and credit the photos in that folder's CREDITS.md.
 * Pexels photos (free licence). No photo shows the doctor.
 */

export interface StockPhoto {
  src: string;
  alt: string;
  /** Short label shown with the slide in some designs. */
  caption?: string;
}

export type PhotoGroup = "women" | "ortho" | "kids" | "heart" | "skin" | "dental" | "eye" | "ent" | "ayurveda" | "mind" | "general";

export interface SpecialtyPhotos {
  key: PhotoGroup;
  hero: StockPhoto[];
  /** Wide photo for a full-width band. */
  band: StockPhoto;
  /** Second band / side photo. */
  side: StockPhoto;
  /** Consultation photo beside services. */
  feature: StockPhoto;
}

type Four = [string, string, string, string];

/** A standard set from public/templates/specialty/<key>/. */
function set(key: PhotoGroup, captions: Four, heroAlts: Four, band: string, side: string, feature: string): SpecialtyPhotos {
  const dir = `/templates/specialty/${key}`;
  return {
    key,
    hero: captions.map((caption, i) => ({ src: `${dir}/hero-${i + 1}.jpg`, alt: heroAlts[i]!, caption })),
    band: { src: `${dir}/band-1.jpg`, alt: band },
    side: { src: `${dir}/band-2.jpg`, alt: side },
    feature: { src: `${dir}/feature.jpg`, alt: feature },
  };
}

const G = "/templates/clinic-modern";

export const PHOTO_SETS: Record<PhotoGroup, SpecialtyPhotos> = {
  women: set(
    "women",
    ["Pregnancy care", "Mother and baby", "Through every stage", "Scans and check-ups"],
    ["A doctor talking with an expectant mother in a clinic", "A mother holding her newborn baby by a window", "An expectant mother in a garden", "An ultrasound check-up in a clinic"],
    "A doctor going over notes with a patient",
    "An expectant mother resting her hands on her bump",
    "A doctor in consultation with patients",
  ),
  ortho: set(
    "ortho",
    ["Rehabilitation", "Joint care", "Mobility", "Sports injuries"],
    ["A doctor guiding a patient through a strengthening exercise", "A doctor examining a knee X-ray", "A therapist helping a patient stretch", "A runner holding a sore knee"],
    "Physiotherapists working with a patient",
    "A patient doing a guided arm exercise",
    "Doctors reviewing an X-ray on a laptop",
  ),
  kids: set(
    "kids",
    ["Child health", "Check-ups", "Mother and baby", "Newborn care"],
    ["A child's check-up in a bright children's clinic", "A doctor checking a young girl", "A mother holding her baby", "A newborn during a health check"],
    "A smiling girl holding a yellow balloon",
    "A mother and her child outdoors",
    "A doctor listening to a girl's chest",
  ),
  heart: set(
    "heart",
    ["Stress tests", "Echocardiography", "Blood pressure", "ECG"],
    ["A treadmill stress test with a care team", "An echocardiogram on a screen", "A blood pressure check", "A patient having an ECG"],
    "An ECG trace on graph paper",
    "An older man on a morning walk",
    "A model of the human heart",
  ),
  skin: set(
    "skin",
    ["Skin consultations", "Treatment plans", "Skin and hair care", "Skin checks"],
    ["A dermatologist examining a patient's face", "A dermatologist talking a patient through a plan on a tablet", "A patient consulting a skin specialist", "A doctor checking a skin image on a tablet"],
    "A bright, clean skin clinic room",
    "A skin check with a magnifying glass",
    "A digital skin examination",
  ),
  dental: set(
    "dental",
    ["Dental care", "Check-ups", "Gentle treatment", "Modern equipment"],
    ["A dental team examining a patient", "A dentist explaining a plan to a patient", "A dentist examining an older patient", "A dentist at work in a modern clinic"],
    "A dentist talking with a patient in the clinic",
    "A dentist and assistant with a patient",
    "Dentists reviewing a dental X-ray with a patient",
  ),
  eye: set(
    "eye",
    ["Eye care", "Vision tests", "Glasses and lenses", "Eye examinations"],
    ["An optometrist helping a girl with an eye test", "An eye doctor with a phoropter", "A vision test with a phoropter", "A doctor using a slit lamp"],
    "Spectacle frames on a wall",
    "A box of trial lenses",
    "An eye doctor examining a young girl",
  ),
  ent: set(
    "ent",
    ["Ear care", "Throat checks", "Hearing", "Nose and sinus"],
    ["A doctor examining a patient's ear", "A doctor checking a patient's throat", "An ear examination with an otoscope", "An ENT consultation"],
    "A doctor checking a child's ear",
    "A child's throat check",
    "A throat examination",
  ),
  ayurveda: set(
    "ayurveda",
    ["Traditional therapies", "Herbal care", "Natural remedies", "Wellness"],
    ["An Ayurvedic Kati Basti therapy", "A herbal compress massage", "Grinding herbs in a stone mortar", "Herbs, honey and oils"],
    "Fresh turmeric roots",
    "Herbal remedy ingredients",
    "Herbal remedies and balms on a table",
  ),
  mind: set(
    "mind",
    ["Listening", "Talking it through", "Calm", "Support"],
    ["A counsellor listening during a session", "A woman talking with a therapist", "A woman meditating in a calm room", "A therapist and client talking in an office"],
    "A calm moment of meditation",
    "A client talking with a psychologist",
    "A therapist taking notes with a client",
  ),
  general: {
    key: "general",
    hero: [
      { src: `${G}/hero-1.jpg`, alt: "A doctor examining a patient in a clinic", caption: "Everyday care" },
      { src: `${G}/hero-2.jpg`, alt: "A clean, bright examination room", caption: "The clinic" },
      { src: `${G}/hero-3.jpg`, alt: "A family sharing a meal at home", caption: "For the whole family" },
      { src: `${G}/hero-4.jpg`, alt: "A doctor writing notes with a stethoscope on the desk", caption: "Unhurried consultations" },
    ],
    band: { src: `${G}/band-clinic.jpg`, alt: "An examination room" },
    side: { src: `${G}/band-appointment.jpg`, alt: "A clinic examination room" },
    feature: { src: `${G}/svc-consult.jpg`, alt: "A doctor in consultation with a patient" },
  },
};

/** Specialty slug → photo set. Specialties not listed use the general photos. */
const SLUG_GROUP: Record<string, PhotoGroup> = {
  gynaecologist: "women",
  obstetrician: "women",
  "infertility-specialist": "women",
  "orthopaedic-surgeon": "ortho",
  "spine-surgeon": "ortho",
  "sports-medicine-specialist": "ortho",
  rheumatologist: "ortho",
  "pain-management-specialist": "ortho",
  physiotherapist: "ortho",
  paediatrician: "kids",
  neonatologist: "kids",
  "paediatric-surgeon": "kids",
  cardiologist: "heart",
  "interventional-cardiologist": "heart",
  "cardiothoracic-surgeon": "heart",
  "vascular-surgeon": "heart",
  dermatologist: "skin",
  cosmetologist: "skin",
  "plastic-surgeon": "skin",
  dentist: "dental",
  orthodontist: "dental",
  endodontist: "dental",
  periodontist: "dental",
  prosthodontist: "dental",
  "paediatric-dentist": "dental",
  "oral-and-maxillofacial-surgeon": "dental",
  ophthalmologist: "eye",
  optometrist: "eye",
  "ent-specialist": "ent",
  "ayurvedic-doctor": "ayurveda",
  "homoeopathic-doctor": "ayurveda",
  "unani-doctor": "ayurveda",
  "siddha-doctor": "ayurveda",
  psychiatrist: "mind",
  psychologist: "mind",
};

/** Systems of medicine with their own photos (when no specialty matched). */
const SYSTEM_GROUP: Record<string, PhotoGroup> = { ayurveda: "ayurveda", homoeopathy: "ayurveda", homeopathy: "ayurveda", unani: "ayurveda", siddha: "ayurveda" };

type DoctorBits = Pick<PublicDoctor, "primarySpecialty" | "secondarySpecialties"> & Partial<Pick<PublicDoctor, "systemOfMedicine">>;

/** Which photo set fits this doctor, or undefined for the general photos. */
export function photoGroupFor(d: DoctorBits): PhotoGroup | undefined {
  const slugs = [d.primarySpecialty?.slug, ...d.secondarySpecialties.map((s) => s.slug)].filter(Boolean) as string[];
  for (const s of slugs) if (SLUG_GROUP[s]) return SLUG_GROUP[s];
  return d.systemOfMedicine ? SYSTEM_GROUP[d.systemOfMedicine] : undefined;
}

/**
 * The photos for this doctor: the specialty set, else `fallback` (a design's
 * own general photos), else general clinic photos.
 */
export function specialtyPhotos(d: DoctorBits, fallback?: SpecialtyPhotos): SpecialtyPhotos {
  const group = photoGroupFor(d);
  return group ? PHOTO_SETS[group] : (fallback ?? PHOTO_SETS.general);
}

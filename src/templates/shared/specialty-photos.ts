import type { PublicDoctor } from "@/templates/types";

/**
 * Background photos chosen by the doctor's specialty, so a gynaecologist's
 * hero shows pregnancy and women's care while an orthopaedic surgeon's shows
 * rehabilitation and X-rays. Anything else gets general clinic photos.
 * Used by designs 3, 4 and 5; design 1 has one neutral set for everyone.
 *
 * Pexels photos (free licence): public/templates/specialty/CREDITS.md and
 * public/templates/clinic-modern/CREDITS.md. No photo shows the doctor.
 */

export interface StockPhoto {
  src: string;
  alt: string;
  /** Short label shown with the slide in some designs. */
  caption?: string;
}

export interface SpecialtyPhotos {
  key: "women" | "ortho" | "kids" | "heart" | "general";
  hero: StockPhoto[];
  /** Wide photo for a full-width band. */
  band: StockPhoto;
  /** Second band / side photo. */
  side: StockPhoto;
  /** Consultation photo beside services. */
  feature: StockPhoto;
}

const W = "/templates/specialty/women";
const O = "/templates/specialty/ortho";
const K = "/templates/specialty/kids";
const H = "/templates/specialty/heart";
const G = "/templates/clinic-modern";

const SETS: Record<SpecialtyPhotos["key"], SpecialtyPhotos> = {
  women: {
    key: "women",
    hero: [
      {
        src: `${W}/hero-1.jpg`,
        alt: "A doctor talking with an expectant mother in a clinic",
        caption: "Pregnancy care",
      },
      {
        src: `${W}/hero-2.jpg`,
        alt: "A mother holding her newborn baby by a window",
        caption: "Mother and baby",
      },
      {
        src: `${W}/hero-3.jpg`,
        alt: "An expectant mother in a garden",
        caption: "Through every stage",
      },
      {
        src: `${W}/hero-4.jpg`,
        alt: "An ultrasound check-up in a clinic",
        caption: "Scans and check-ups",
      },
    ],
    band: {
      src: `${W}/band-1.jpg`,
      alt: "A doctor going over notes with a patient",
    },
    side: {
      src: `${W}/band-2.jpg`,
      alt: "An expectant mother resting her hands on her bump",
    },
    feature: {
      src: `${W}/feature.jpg`,
      alt: "A doctor in consultation with patients",
    },
  },
  ortho: {
    key: "ortho",
    hero: [
      {
        src: `${O}/hero-1.jpg`,
        alt: "A doctor guiding a patient through a strengthening exercise",
        caption: "Rehabilitation",
      },
      {
        src: `${O}/hero-2.jpg`,
        alt: "A doctor examining a knee X-ray",
        caption: "Joint care",
      },
      {
        src: `${O}/hero-3.jpg`,
        alt: "A therapist helping a patient stretch",
        caption: "Mobility",
      },
      {
        src: `${O}/hero-4.jpg`,
        alt: "A runner holding a sore knee",
        caption: "Sports injuries",
      },
    ],
    band: {
      src: `${O}/band-1.jpg`,
      alt: "Physiotherapists working with a patient",
    },
    side: {
      src: `${O}/band-2.jpg`,
      alt: "A patient doing a guided arm exercise",
    },
    feature: {
      src: `${O}/feature.jpg`,
      alt: "Doctors reviewing an X-ray on a laptop",
    },
  },
  kids: {
    key: "kids",
    hero: [
      { src: `${K}/hero-1.jpg`, alt: "A child's check-up in a bright children's clinic", caption: "Child health" },
      { src: `${K}/hero-2.jpg`, alt: "A doctor checking a young girl", caption: "Check-ups" },
      { src: `${K}/hero-3.jpg`, alt: "A mother holding her baby", caption: "Mother and baby" },
      { src: `${K}/hero-4.jpg`, alt: "A newborn during a health check", caption: "Newborn care" },
    ],
    band: { src: `${K}/band-1.jpg`, alt: "A smiling girl holding a yellow balloon" },
    side: { src: `${K}/band-2.jpg`, alt: "A mother and her child outdoors" },
    feature: { src: `${K}/feature.jpg`, alt: "A doctor listening to a girl's chest" },
  },
  heart: {
    key: "heart",
    hero: [
      { src: `${H}/hero-1.jpg`, alt: "A treadmill stress test with a care team", caption: "Stress tests" },
      { src: `${H}/hero-2.jpg`, alt: "An echocardiogram on a screen", caption: "Echocardiography" },
      { src: `${H}/hero-3.jpg`, alt: "A blood pressure check", caption: "Blood pressure" },
      { src: `${H}/hero-4.jpg`, alt: "A patient having an ECG", caption: "ECG" },
    ],
    band: { src: `${H}/band-1.jpg`, alt: "An ECG trace on graph paper" },
    side: { src: `${H}/band-2.jpg`, alt: "An older man on a morning walk" },
    feature: { src: `${H}/feature.jpg`, alt: "A model of the human heart" },
  },
  general: {
    key: "general",
    hero: [
      {
        src: `${G}/hero-1.jpg`,
        alt: "A doctor examining a patient in a clinic",
        caption: "Everyday care",
      },
      {
        src: `${G}/hero-2.jpg`,
        alt: "A clean, bright examination room",
        caption: "The clinic",
      },
      {
        src: `${G}/hero-3.jpg`,
        alt: "A family sharing a meal at home",
        caption: "For the whole family",
      },
      {
        src: `${G}/hero-4.jpg`,
        alt: "A doctor writing notes with a stethoscope on the desk",
        caption: "Unhurried consultations",
      },
    ],
    band: { src: `${G}/band-clinic.jpg`, alt: "An examination room" },
    side: {
      src: `${G}/band-appointment.jpg`,
      alt: "A clinic examination room",
    },
    feature: {
      src: `${G}/svc-consult.jpg`,
      alt: "A doctor in consultation with a patient",
    },
  },
};

const WOMEN = new Set(["gynaecologist", "obstetrician", "infertility-specialist", "gynaecologic-oncologist", "obstetrician-gynaecologist"]);
const KIDS = new Set(["paediatrician", "neonatologist", "paediatric-surgeon", "paediatric-dentist"]);
const HEART = new Set(["cardiologist", "interventional-cardiologist", "cardiothoracic-surgeon", "cardiac-surgeon", "vascular-surgeon"]);
const ORTHO = new Set([
  "orthopaedic-surgeon",
  "spine-surgeon",
  "sports-medicine-specialist",
  "physiotherapist",
  "rheumatologist",
  "pain-management-specialist",
  "joint-replacement-surgeon",
]);

export function specialtyPhotos(d: Pick<PublicDoctor, "primarySpecialty" | "secondarySpecialties">): SpecialtyPhotos {
  const slugs = [d.primarySpecialty?.slug, ...d.secondarySpecialties.map((s) => s.slug)].filter(Boolean) as string[];
  if (slugs.some((s) => WOMEN.has(s))) return SETS.women;
  if (slugs.some((s) => ORTHO.has(s))) return SETS.ortho;
  if (slugs.some((s) => KIDS.has(s))) return SETS.kids;
  if (slugs.some((s) => HEART.has(s))) return SETS.heart;
  return SETS.general;
}

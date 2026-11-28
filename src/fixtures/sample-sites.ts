import { SEED_CLINIC_CATEGORIES } from "@/data/masters";
import { absUrl } from "@/lib/site";
import type { PublicEstablishment, PublicSiteDoctor } from "@/templates/types";
import { SPECIALTY_THEMES, type SpecialtyTheme, type ThemeKey } from "@/themes/specialty";

/**
 * FICTIONAL sample clinic/hospital sites, one per specialty theme, built from
 * the theme config (suggested services, groups, labels). Used by the public
 * design gallery (/designs, /designs/[themeKey]: noindex, labelled "Sample"),
 * the Designs & themes admin page and the homepage. Every name, number and
 * address is made up; phone numbers are not real.
 */

interface SampleSpec {
  name: string;
  area: { name: string; slug: string };
  doctors: { name: string; specialty: string; qualifications: string; role?: string }[];
  equipment: string[];
}

const SPECS: Record<ThemeKey, SampleSpec> = {
  "general-opd": {
    name: "Sample Family Clinic",
    area: { name: "Kothrud", slug: "kothrud" },
    doctors: [{ name: "Dr. Asha Sample", specialty: "General Physician", qualifications: "MBBS, MD (Medicine)" }],
    equipment: ["ECG machine", "Nebuliser"],
  },
  skin: {
    name: "Sample Skin & Hair Clinic",
    area: { name: "Baner", slug: "baner" },
    doctors: [
      { name: "Dr. Riya Sample", specialty: "Dermatologist", qualifications: "MBBS, MD (DVL)" },
      { name: "Dr. Kunal Sample", specialty: "Dermatologist", qualifications: "MBBS, DDVL", role: "Visiting" },
    ],
    equipment: ["Q-switched laser", "Dermatoscope"],
  },
  dental: {
    name: "Sample Dental Care",
    area: { name: "Aundh", slug: "aundh" },
    doctors: [{ name: "Dr. Meera Sample", specialty: "Dentist", qualifications: "BDS, MDS (Endodontics)" }],
    equipment: ["Two dental chairs", "Digital X-ray (RVG)"],
  },
  eye: {
    name: "Sample Eye Clinic",
    area: { name: "Karve Nagar", slug: "karve-nagar" },
    doctors: [{ name: "Dr. Nikhil Sample", specialty: "Ophthalmologist", qualifications: "MBBS, MS (Ophthalmology)" }],
    equipment: ["Slit lamp", "Auto refractometer"],
  },
  ent: {
    name: "Sample ENT Clinic",
    area: { name: "Deccan", slug: "deccan" },
    doctors: [{ name: "Dr. Vivek Sample", specialty: "ENT Specialist", qualifications: "MBBS, MS (ENT)" }],
    equipment: ["Audiometer", "Nasal endoscope"],
  },
  cardiology: {
    name: "Sample Heart Clinic",
    area: { name: "Shivajinagar", slug: "shivajinagar" },
    doctors: [{ name: "Dr. Rohan Sample", specialty: "Cardiologist", qualifications: "MBBS, MD, DM (Cardiology)" }],
    equipment: ["ECG machine", "2D Echo", "TMT machine"],
  },
  ayurveda: {
    name: "Sample Ayurveda Clinic",
    area: { name: "Kothrud", slug: "kothrud" },
    doctors: [{ name: "Vaidya Sunita Sample", specialty: "Ayurveda Physician", qualifications: "BAMS, MD (Ayurveda)" }],
    equipment: ["Panchakarma therapy room", "Shirodhara stand"],
  },
  homeopathy: {
    name: "Sample Homeopathy Clinic",
    area: { name: "Wakad", slug: "wakad" },
    doctors: [{ name: "Dr. Pooja Sample", specialty: "Homeopath", qualifications: "BHMS" }],
    equipment: ["Consultation room", "Dispensary"],
  },
  physiotherapy: {
    name: "Sample Physio Clinic",
    area: { name: "Viman Nagar", slug: "viman-nagar" },
    doctors: [{ name: "Dr. Amol Sample", specialty: "Physiotherapist", qualifications: "BPT, MPT (Musculoskeletal)" }],
    equipment: ["Ultrasound therapy", "IFT unit", "Traction table"],
  },
  paediatrics: {
    name: "Sample Children's Clinic",
    area: { name: "Hadapsar", slug: "hadapsar" },
    doctors: [{ name: "Dr. Neha Sample", specialty: "Paediatrician", qualifications: "MBBS, MD (Paediatrics)" }],
    equipment: ["Vaccine refrigerator", "Infant weighing scale"],
  },
  gynaecology: {
    name: "Sample Women's Clinic",
    area: { name: "Kharadi", slug: "kharadi" },
    doctors: [{ name: "Dr. Priya Sample", specialty: "Gynaecologist", qualifications: "MBBS, MS (Obstetrics & Gynaecology)" }],
    equipment: ["Ultrasound machine", "CTG monitor"],
  },
  orthopaedics: {
    name: "Sample Bone & Joint Clinic",
    area: { name: "Bavdhan", slug: "bavdhan" },
    doctors: [{ name: "Dr. Sameer Sample", specialty: "Orthopaedic Surgeon", qualifications: "MBBS, MS (Orthopaedics)" }],
    equipment: ["Digital X-ray", "Plaster room"],
  },
  "small-hospital": {
    name: "Sample Care Hospital",
    area: { name: "Wakad", slug: "wakad" },
    doctors: [
      { name: "Dr. Asha Sample", specialty: "General Physician", qualifications: "MBBS, MD (Medicine)", role: "Medical officer" },
      { name: "Dr. Rohan Sample", specialty: "Cardiologist", qualifications: "MBBS, MD, DM (Cardiology)", role: "Visiting consultant" },
      { name: "Dr. Sameer Sample", specialty: "Orthopaedic Surgeon", qualifications: "MBBS, MS (Orthopaedics)", role: "Visiting consultant" },
    ],
    equipment: ["Digital X-ray", "ICU monitors", "Ventilator"],
  },
};

const FAKE_PHONE = "919800000000";
const WEEKDAY_TIMINGS = [1, 2, 3, 4, 5, 6].map((day) => ({ day, slots: [{ open: "10:00", close: "13:30" }, { open: "17:00", close: "20:30" }] }));

/** Sample site URL (the gallery page itself). */
export const sampleSiteUrl = (key: string) => absUrl(`/designs/${key}`);

function build(theme: SpecialtyTheme): PublicEstablishment {
  const spec = SPECS[theme.key as ThemeKey];
  const hospital = theme.kind === "hospital";
  const cat = SEED_CLINIC_CATEGORIES.find((c) => c.slug === theme.key) ?? SEED_CLINIC_CATEGORIES[0]!;
  const url = sampleSiteUrl(theme.key);
  const fullAddress = `12 Sample Road, ${spec.area.name}, Pune 411000, Maharashtra`;
  const doctors: PublicSiteDoctor[] = spec.doctors.map((d) => ({ ...d }));
  return {
    id: `sample-${theme.key}`,
    kind: theme.kind,
    citySlug: "pune",
    slug: theme.key,
    url,
    websiteUrl: url,
    shareUrl: url,
    name: spec.name,
    category: { name: cat.name, slug: cat.slug, plural: cat.plural },
    themeKey: theme.key,
    tagline: `A fictional sample ${hospital ? "hospital" : "clinic"} showing the ${theme.name} design`,
    shortDescription: `Sample ${hospital ? "hospital" : cat.name.toLowerCase()} in ${spec.area.name}, Pune. All details on this page are made up.`,
    aboutHtml: `<p>This is a sample site. Every clinic gets its own name, logo, colours, photos, doctors and details; the layout and colours shown here are the ${theme.name} design.</p>`,
    ...(hospital ? { registration: { authority: "Sample Municipal Corporation", number: "SAMPLE-0000" } } : {}),
    address: {
      line1: "12 Sample Road",
      area: spec.area,
      city: { name: "Pune", slug: "pune" },
      state: "Maharashtra",
      pincode: "411000",
      landmark: "Near the sample bus stop",
      fullAddress,
    },
    directionsUrl: "https://www.google.com/maps/search/?api=1&query=Pune",
    mapEmbedUrl: "https://maps.google.com/maps?q=Pune&z=12&output=embed",
    phones: [FAKE_PHONE],
    whatsapp: FAKE_PHONE,
    ...(hospital ? { emergencyPhone: FAKE_PHONE } : {}),
    is24x7: hospital,
    timings: hospital ? [] : WEEKDAY_TIMINGS,
    appointmentNote: hospital ? "OPD: Monday to Saturday, 9 am to 1 pm and 5 pm to 9 pm." : "Walk-ins welcome; please call ahead for procedures.",
    ...(hospital ? { visitingHours: "11 am to 1 pm and 5 pm to 7 pm" } : {}),
    services: theme.suggestedServices.map((s) => ({ name: s.name, ...("group" in s && s.group ? { group: s.group } : {}) })),
    facilities: hospital
      ? ["Laboratory", "Pharmacy", "Operation theatre", "ICU", "Ambulance", "Lift and wheelchair access"].map((name) => ({ name }))
      : ["Waiting area", "Wheelchair access", "Card and UPI payments"].map((name) => ({ name })),
    equipment: spec.equipment.map((name) => ({ name })),
    doctors,
    departments: hospital
      ? [
          { name: "General medicine", doctors: [doctors[0]!] },
          { name: "Cardiology", doctors: [doctors[1]!] },
          { name: "Orthopaedics", doctors: [doctors[2]!] },
        ]
      : [],
    ...(hospital ? { beds: { total: 10, types: [{ type: "General ward", count: 6 }, { type: "Private", count: 2 }, { type: "ICU", count: 2 }] } } : {}),
    ...(hospital ? { insurance: { cashless: true, providers: ["Sample Insurance Co.", "Sample TPA"] } } : {}),
    languages: ["English", "Hindi", "Marathi"],
    gallery: [],
    links: {},
    siteTemplateId: "classic",
    seo: { noindex: true },
    updatedAt: "2026-11-17T00:00:00.000Z",
  };
}

/** One sample site per theme, in the theme order. */
export const SAMPLE_SITES: Record<ThemeKey, PublicEstablishment> = Object.fromEntries(
  SPECIALTY_THEMES.map((t) => [t.key, build(t)]),
) as Record<ThemeKey, PublicEstablishment>;

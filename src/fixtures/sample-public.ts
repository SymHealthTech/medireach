import { absUrl, paths } from "@/lib/site";
import { doctorShortSlugBase, doctorSlug } from "@/lib/slug";
import type { PublicDoctor } from "@/templates/types";
import { SAMPLE_DOCTORS, type SampleDoctorInput } from "./sample-doctors";
import { SAMPLE_GALLERY, SAMPLE_INTEREST_PHOTOS } from "./sample-gallery";
import { DEMO_PUBLIC_DOCTORS } from "./demo-doctors";

/**
 * FICTIONAL sample doctors as ready-to-render PublicDoctor objects (no
 * database needed). Used for template previews in the dashboard and, later,
 * the homepage "Sample" pages.
 */

const SPECIALTY: Record<string, { name: string; plural: string }> = {
  "general-physician": { name: "General Physician", plural: "General Physicians" },
  "family-physician": { name: "Family Physician", plural: "Family Physicians" },
  cardiologist: { name: "Cardiologist", plural: "Cardiologists" },
};
const DEGREE: Record<string, string> = { mbbs: "MBBS", md: "MD", dm: "DM" };
const AREA: Record<string, string> = { kothrud: "Kothrud", baner: "Baner", aundh: "Aundh" };

/** Stock photos (public/) for the sample doctors. */
export const SAMPLE_PHOTOS = {
  // JPEG, so the downloadable card images (Satori) can use them too.
  gp: "/bg-doctor2-square.jpg",
  consultant: "/person_6-square.jpg",
  /** The homepage hospitals band's four visiting consultants. */
  hospital: ["/person_1.jpg.webp", "/person_5.jpg.webp", "/person_6.jpg.webp", "/bg-doctor2-square.jpg"],
};

/** "Beyond medicine" stories: personal achievements, not health information. */
const SAMPLE_STORIES: Record<SampleDoctorInput["key"], NonNullable<PublicDoctor["interestsStory"]>> = {
  gp: {
    title: "From a 5 km fun run to my first full marathon",
    paragraphs: [
      "Ten years ago I could barely run to the end of Karve Road without stopping. A colleague talked me into a 5 km fun run one Sunday morning, mostly so we could have breakfast together afterwards. I finished near the back of the pack, out of breath and very happy.",
      "That morning turned into a habit. Three early mornings a week on the Vetal Tekdi trails, then the Law College Road loop when the monsoon made the hill too muddy. Our running group grew from two friends to twenty-two people, including two of my clinic staff and a retired schoolteacher who still leaves all of us behind on the slopes.",
      "In December 2025 I crossed the finish line of my first full marathon, 42.2 km, in 4 hours and 41 minutes. It was not fast, but I had trained for eight months around clinic hours, and my daughter was waiting at the 40 km mark with a hand-painted sign that I still keep on my desk.",
      "Music keeps me balanced in a different way. I have been learning Hindustani classical vocal music since school and still take a lesson every Saturday evening. Last winter our class sang at a small baithak in Kothrud: four minutes on stage that took a year of riyaaz.",
      "Running and singing have taught me the same thing: steady practice matters more than sudden bursts of effort. It is a lesson I try to bring to the clinic every day.",
    ],
  },
  consultant: {
    title: "Pune to Goa on two wheels",
    paragraphs: [
      "I bought my first road bike in 2017, after a friend dared me to join the Sunday ride to Sinhagad. The climb to the fort humbled me completely: I walked the last two kilometres pushing the bike, and promised myself I would ride all the way the next time.",
      "Six months later I did. Since then the weekend ride has become a fixed part of my week: out of Baner before sunrise, up the ghat, a cutting chai at the top and home before the clinic opens.",
      "In January 2026 four of us rode from Pune to Goa: 470 km over four days, through the Varandha ghat and down the Konkan coast. Day three was the hardest, 140 km in coastal heat, and also the most beautiful, with paddy fields on one side and the sea appearing between the coconut palms.",
      "I carry a small camera on every ride. Photography makes me slow down and notice things: the light on the Sahyadri ridges, a roadside temple, an old man mending a cycle tyre in Mahad. A few of those pictures were shown at a community photo exhibition in Aundh last year.",
      "Long rides need patience, preparation and respect for your own limits. I find the same habits useful in the clinic.",
    ],
  },
};

/** Page-only extras (not seeded): blog posts, gallery, email, more recognition. */
const EXTRAS: Record<SampleDoctorInput["key"], Pick<PublicDoctor, "email" | "gallery" | "interestsPhoto" | "interestsStory"> & Partial<Pick<PublicDoctor, "awards" | "memberships">>> = {
  gp: {
    email: "clinic@example.com",
    gallery: SAMPLE_GALLERY,
    interestsPhoto: SAMPLE_INTEREST_PHOTOS.gp,
    interestsStory: SAMPLE_STORIES.gp,
    awards: [
      { title: "Gold medal in Medicine", awardingBody: "Sample University", year: 2010 },
      { title: "Community Health Service Award", awardingBody: "Sample Medical Association", year: 2022 },
    ],
    memberships: [
      { name: "Indian Medical Association, Pune", since: 2012 },
      { name: "Sample Society of Family Physicians", since: 2016 },
    ],
  },
  consultant: {
    email: "heart.clinic@example.com",
    gallery: SAMPLE_GALLERY,
    interestsPhoto: SAMPLE_INTEREST_PHOTOS.consultant,
    interestsStory: SAMPLE_STORIES.consultant,
  },
};

function toPublic(s: SampleDoctorInput): PublicDoctor {
  const primary = SPECIALTY[s.primarySpecialtySlug]!;
  const slug = doctorSlug(s.firstName, s.lastName, s.primarySpecialtySlug);
  const qualifications = s.qualifications.map((q) => ({
    degree: DEGREE[q.degreeSlug] ?? q.degreeSlug.toUpperCase(),
    ...(q.specialization ? { specialization: q.specialization } : {}),
    institute: q.institute,
    year: q.year,
  }));
  const fullName = `Dr. ${s.firstName} ${s.lastName}`;
  return {
    id: `sample-${s.key}`,
    citySlug: "pune",
    slug,
    shortSlug: doctorShortSlugBase(s.firstName, s.lastName),
    subdomain: s.subdomain,
    url: absUrl(paths.doctor("pune", slug)),
    // Samples run without the database: their link, card and contact file live under /sample/{key}.
    shareUrl: absUrl(`/sample/${s.key}`),
    vcfUrl: `/sample/${s.key}/contact.vcf`,
    cardUrl: `/sample/${s.key}/card`,
    title: "Dr.",
    firstName: s.firstName,
    lastName: s.lastName,
    fullName,
    photo: { url: SAMPLE_PHOTOS[s.key], alt: `${fullName} (sample photo)` },
    languages: s.languages,
    practiceSinceYear: s.practiceSinceYear,
    systemOfMedicine: "allopathy",
    registration: { council: "Maharashtra Medical Council", number: s.registrationNumber },
    qualifications,
    degreesLine: qualifications.map((q) => (q.specialization ? `${q.degree} (${q.specialization})` : q.degree)).join(", "),
    practitionerType: s.practitionerType,
    primarySpecialty: { ...primary, slug: s.primarySpecialtySlug },
    secondarySpecialties: s.secondarySpecialtySlugs.map((x) => ({ ...SPECIALTY[x]!, slug: x })),
    services: s.services.map((name) => ({ name })),
    conditionsTreated: s.conditionsTreated,
    clinics: s.clinics.map((c, i) => {
      const area = AREA[c.areaSlug]!;
      const fullAddress = `${c.addressLine1}, ${area}, Pune ${c.pincode}, Maharashtra`;
      return {
        id: `sample-clinic-${i}`,
        name: c.name,
        type: c.type,
        addressLine1: c.addressLine1,
        area: { name: area, slug: c.areaSlug },
        city: { name: "Pune", slug: "pune" },
        state: "Maharashtra",
        pincode: c.pincode,
        fullAddress,
        directionsUrl: `https://www.google.com/maps/search/?api=1&query=${c.geo.lat},${c.geo.lng}`,
        geo: c.geo,
        phone: `91${c.phone}`,
        timings: c.timings,
        ...(c.appointmentNote ? { appointmentNote: c.appointmentNote } : {}),
        ...(c.showFee && c.fee ? { fee: c.fee } : {}),
      };
    }),
    phone: `91${s.mobile}`,
    whatsapp: `91${s.mobile}`,
    links: {},
    shortBio: s.shortBio,
    fullBioHtml: s.fullBio,
    awards: s.awards,
    memberships: s.memberships,
    publications: [],
    interests: s.interests,
    ...EXTRAS[s.key],
    portfolioTemplateId: "classic",
    cardTemplateId: "classic",
    seo: { noindex: true },
    updatedAt: "2026-11-01T00:00:00.000Z",
  };
}

/** Every built-in example doctor by /sample/{key}: the two samples plus the demo doctors (fixtures/demo-doctors). */
export const SAMPLE_PUBLIC_DOCTORS: Record<SampleDoctorInput["key"], PublicDoctor> & Record<string, PublicDoctor | undefined> = {
  gp: toPublic(SAMPLE_DOCTORS[0]!),
  consultant: toPublic(SAMPLE_DOCTORS[1]!),
  ...DEMO_PUBLIC_DOCTORS,
};

/** Keys for generateStaticParams on /sample/[key] routes. */
export const SAMPLE_KEYS = Object.keys(SAMPLE_PUBLIC_DOCTORS);

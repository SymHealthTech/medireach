import type { InquiryRow } from "@/components/account/InquiryList";
import { DEFAULT_BANNED_PHRASES } from "@/config/banned-phrases";
import { PUNE_AREAS, SEED_COUNCILS, SEED_DEGREES, SEED_SPECIALTIES, SEED_TEMPLATE_SLOTS } from "@/data/masters";
import { emptyClinic, emptyDoctorForm, type DoctorForm } from "@/lib/doctors/form";
import type { EditorOptions } from "@/lib/doctors/options";
import { healthTipOptions } from "@/lib/health-tips";
import { slugify } from "@/lib/slug";
import { DEMO_DOCTORS, demoFullName, type DemoDoctor } from "./index";

/**
 * Data for the sample website dashboard (/sample/{key}/admin) shown to
 * doctors: the demo doctor's appointment requests (dated relative to now),
 * profile form and health tips. Nothing here touches a database.
 */

/** Dummy login shown on the demo login page. */
export const DEMO_LOGIN = { email: "doctor@demo.medireach.co.in", password: "Demo@1234" } as const;

export function demoDoctor(key: string): DemoDoctor | undefined {
  return DEMO_DOCTORS.find((d) => d.key === key);
}

export function demoInquiries(d: DemoDoctor, now = Date.now()): InquiryRow[] {
  const day = 86_400_000;
  return d.inquiries.map((q, i) => {
    const clinic = q.clinic !== undefined ? d.clinics[q.clinic] : undefined;
    return {
      id: `demo-${i}`,
      name: q.name,
      phone: q.phone,
      ...(q.email ? { email: q.email } : {}),
      ...(clinic ? { clinicName: clinic.name } : {}),
      ...(q.preferredInDays !== undefined ? { preferredDate: new Date(now + q.preferredInDays * day).toISOString() } : {}),
      ...(q.preferredTime ? { preferredTime: q.preferredTime } : {}),
      message: q.message,
      status: q.status,
      createdAt: new Date(now - q.daysAgo * day - (i + 1) * 47 * 60_000).toISOString(),
    };
  });
}

/**
 * Editor lists for the demo dashboard, from the seed master lists, with
 * slugs standing in for database ids (nothing is ever saved).
 */
export function demoEditorOptions(): EditorOptions {
  const slot = (type: "portfolio" | "card", names: readonly string[]) =>
    names.map((name, i) => ({ type, key: i === 0 ? "classic" : `t${i + 1}`, name, status: i < 2 ? "ready" : "coming_soon" }));
  return {
    cities: [{ id: "pune", name: "Pune", slug: "pune", state: "Maharashtra" }],
    areas: PUNE_AREAS.map((name) => ({ id: slugify(name), name, slug: slugify(name), cityId: "pune" })),
    specialties: SEED_SPECIALTIES.map((s) => ({ id: s.slug ?? slugify(s.name), name: s.name, slug: s.slug ?? slugify(s.name), plural: s.plural })),
    degrees: SEED_DEGREES.map((d) => ({ id: d.slug ?? slugify(d.name), name: d.name })),
    councils: SEED_COUNCILS.map((c) => ({ id: c.slug ?? slugify(c.name), name: c.name, ...(c.state ? { state: c.state } : {}) })),
    establishments: [],
    prices: { renewalDoctor: 0, foundingRenewal: 0, doctorSetup: 0, doctorAddon: 0 },
    gstIncluded: true,
    team: [],
    templates: [...slot("portfolio", SEED_TEMPLATE_SLOTS.portfolio), ...slot("card", SEED_TEMPLATE_SLOTS.card)],
    bannedPhrases: [...DEFAULT_BANNED_PHRASES],
  };
}

/** The demo doctor as the full editor's form (ids are slugs, matching demoEditorOptions). */
export function demoDoctorForm(d: DemoDoctor): DoctorForm {
  const f = emptyDoctorForm();
  return {
    ...f,
    uid: "MRD-100001",
    status: "published",
    firstName: d.firstName,
    middleName: d.middleName ?? "",
    lastName: d.lastName,
    gender: d.gender,
    photo: { publicId: "demo", url: d.photo.url },
    languages: d.languages,
    practiceSinceYear: d.practiceSinceYear,
    registration: { councilId: d.council.slug, number: d.registration.number, year: d.registration.year, nmrId: "" },
    qualifications: d.qualifications.map((q) => ({ degreeId: q.degree.slug, specialization: q.specialization ?? "", institute: q.institute, year: q.year })),
    practitionerType: d.practitionerType,
    primarySpecialtyId: d.primarySpecialty.slug,
    secondarySpecialtyIds: d.secondarySpecialties.map((s) => s.slug),
    services: d.services.map((s) => ({ name: s.name, description: s.description })),
    conditionsTreated: d.conditionsTreated,
    clinics: d.clinics.map((c, i) => ({
      ...emptyClinic("pune", `demo-${i}`),
      name: c.name,
      type: c.type,
      addressLine1: c.addressLine1,
      addressLine2: c.addressLine2 ?? "",
      areaId: c.area.slug,
      state: d.city.state,
      pincode: c.pincode,
      lat: String(c.geo.lat),
      lng: String(c.geo.lng),
      phone: c.phone,
      timings: c.timings.map((t) => ({ day: t.day, slots: t.slots.map((s) => ({ ...s })) })),
      appointmentNote: c.appointmentNote ?? "",
      fee: c.fee,
      showFee: c.showFee,
    })),
    mobile: d.mobile,
    whatsapp: d.whatsapp,
    email: d.email,
    links: { ...f.links, ...d.links },
    shortBio: d.shortBio,
    fullBio: d.fullBio,
    awards: d.awards.map((a) => ({ ...a })),
    memberships: d.memberships.map((m) => ({ name: m.name, since: m.since })),
    interests: d.interests,
    interestsPhoto: { publicId: "demo", url: d.interestsPhoto.url, caption: d.interestsPhoto.caption },
    interestsStory: { title: d.interestsStory.title, body: d.interestsStory.body },
    gallery: d.gallery.map((g) => ({ publicId: "demo", url: g.url, caption: g.caption })),
    portfolioTemplateId: d.portfolioTemplateId,
    cardTemplateId: d.cardTemplateId,
    showHealthTips: d.showHealthTips,
  };
}

export function demoHealthTips(d: DemoDoctor) {
  return healthTipOptions(`demo-${d.key}`, [d.primarySpecialty.slug, ...d.secondarySpecialties.map((s) => s.slug)]);
}

export const demoName = demoFullName;

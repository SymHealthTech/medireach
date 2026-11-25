import type { InquiryRow } from "@/components/account/InquiryList";
import { htmlToAbout, type ProfileForm } from "@/lib/doctors/self-profile";
import { healthTipOptions } from "@/lib/health-tips";
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

export function demoProfile(d: DemoDoctor): ProfileForm {
  return {
    shortBio: d.shortBio,
    about: htmlToAbout(d.fullBio),
    services: d.services.map((s) => ({ name: s.name, description: s.description })),
    conditions: d.conditionsTreated.join("\n"),
    languages: d.languages.join(", "),
    interests: d.interests.join("\n"),
    email: d.email,
    links: {
      googleBusiness: d.links.googleBusiness ?? "",
      instagram: d.links.instagram ?? "",
      facebook: d.links.facebook ?? "",
      linkedin: d.links.linkedin ?? "",
      youtube: d.links.youtube ?? "",
      website: "",
    },
  };
}

export function demoHealthTips(d: DemoDoctor) {
  return healthTipOptions(`demo-${d.key}`, [d.primarySpecialty.slug, ...d.secondarySpecialties.map((s) => s.slug)]);
}

export const demoName = demoFullName;

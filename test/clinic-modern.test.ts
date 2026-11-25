import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEMO_DOCTORS, DEMO_PUBLIC_DOCTORS } from "@/fixtures/demo-doctors";
import { DEMO_LOGIN, demoDoctorForm, demoEditorOptions, demoInquiries } from "@/fixtures/demo-doctors/dashboard";
import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";
import { HEALTH_TIPS } from "@/content/health-tips";
import { describeService, SERVICE_DEFAULTS } from "@/content/service-descriptions";
import { healthTipCandidates, pickHealthTips } from "@/lib/health-tips";
import { scanFields } from "@/lib/compliance/scan";
import { healthTipsSchema } from "@/lib/doctors/self-profile";
import { inquirySchema } from "@/lib/inquiries";
import { cardProps } from "@/lib/cards/render";
import { SAMPLE_SUBDOMAINS, RESERVED_SUBDOMAINS } from "@/config/reserved";
import { SAMPLE_DESIGNS } from "@/lib/sample-designs";
import { INTAKE_SECTIONS } from "@/lib/intake/form";
import ClinicModernPortfolio from "@/templates/portfolio/t2";
import CardT2 from "@/templates/card/t2";
import type { PublicDoctor } from "@/templates/types";
import { existsSync } from "node:fs";

const demo = DEMO_PUBLIC_DOCTORS["arnav-deshpande"]!;
// next/image URL-encodes local paths in srcsets; decode slashes so tests can look for plain paths.
const render = (d: PublicDoctor) =>
  renderToStaticMarkup(createElement(ClinicModernPortfolio, { doctor: d, seo: { heading: createElement("h1", null, d.fullName), intro: "INTRO" } })).replace(/%2F/gi, "/");

describe("demo doctors (fixtures/demo-doctors)", () => {
  it("are published as samples on design 2, with a reserved subdomain", () => {
    expect(SAMPLE_PUBLIC_DOCTORS["arnav-deshpande"]).toBe(demo);
    expect(demo.portfolioTemplateId).toBe("t2");
    expect(SAMPLE_SUBDOMAINS[demo.subdomain!]).toBe("arnav-deshpande");
    expect(RESERVED_SUBDOMAINS as readonly string[]).toContain(demo.subdomain);
    expect(SAMPLE_DESIGNS.find((d) => d.key === "t2")).toMatchObject({ ready: true, sample: "arnav-deshpande" });
    expect(demo.registration.number).toMatch(/^DEMO-/);
    expect(demo.seo.noindex).toBe(true);
    expect(demo.loginUrl).toBe("/sample/arnav-deshpande/login");
  });

  it("pass the NMC wording check everywhere", () => {
    for (const d of DEMO_DOCTORS) {
      const fields: Record<string, string> = {
        shortBio: d.shortBio,
        fullBio: d.fullBio,
        story: `${d.interestsStory.title} ${d.interestsStory.body}`,
        services: d.services.map((s) => `${s.name}. ${s.description}`).join(" "),
        conditions: d.conditionsTreated.join(", "),
        awards: d.awards.map((a) => a.title).join(", "),
        ...Object.fromEntries(d.clinics.map((c, i) => [`clinic:${i}`, c.appointmentNote ?? ""])),
      };
      expect(scanFields(fields)).toEqual([]);
    }
  });

  it("feed the demo dashboard", () => {
    const d = DEMO_DOCTORS[0]!;
    const rows = demoInquiries(d, Date.parse("2026-11-25T10:00:00Z"));
    expect(rows).toHaveLength(d.inquiries.length);
    expect(rows[0]!.clinicName).toBe("Deshpande Family Clinic");
    // The demo's full editor: every id in the form exists in the demo lists.
    const form = demoDoctorForm(d);
    const o = demoEditorOptions();
    expect(o.specialties.some((s) => s.id === form.primarySpecialtyId)).toBe(true);
    expect(form.qualifications.every((q) => o.degrees.some((x) => x.id === q.degreeId))).toBe(true);
    expect(o.councils.some((c) => c.id === form.registration.councilId)).toBe(true);
    expect(form.clinics.every((c) => o.areas.some((a) => a.id === c.areaId))).toBe(true);
    expect(DEMO_LOGIN.email).toMatch(/@demo\./);
  });
});

describe("health tips library", () => {
  it("is NMC-clean, uniquely named and has every cover photo", () => {
    const slugs = new Set<string>();
    for (const t of HEALTH_TIPS) {
      expect(slugs.has(t.slug)).toBe(false);
      slugs.add(t.slug);
      expect(scanFields({ [t.slug]: [t.title, t.excerpt, ...t.body].join(" ") })).toEqual([]);
      expect(existsSync(`public/templates/health-tips/${t.cover.file}.jpg`)).toBe(true);
    }
    expect(HEALTH_TIPS.length).toBeGreaterThanOrEqual(20);
  });

  it("picks two tips that suit the specialty, varied per doctor, with different photos", () => {
    const a = pickHealthTips("doctor-a", ["dentist"]);
    expect(a).toHaveLength(2);
    for (const t of a) expect(HEALTH_TIPS.find((h) => h.slug === t.slug)!.specialties).toContain("dentist");
    expect(a[0]!.cover.url).not.toBe(a[1]!.cover.url);
    const gps = new Set(["s1", "s2", "s3", "s4", "s5", "s6"].map((seed) => pickHealthTips(seed, ["general-physician"]).map((t) => t.slug).join("+")));
    expect(gps.size).toBeGreaterThan(2);
    // Unknown specialty: general tips.
    expect(pickHealthTips("x", ["no-such-specialty"])).toHaveLength(2);
    expect(healthTipCandidates("x", ["paediatrician"])[0]!.specialties).toContain("paediatrician");
  });

  it("honours the doctor's own choice", () => {
    expect(pickHealthTips("x", ["general-physician"], ["brushing-and-flossing-the-right-way"])[0]!.slug).toBe("brushing-and-flossing-the-right-way");
    expect(healthTipsSchema.parse({ show: true, slugs: ["nope", "good-sleep-habits"] }).slugs).toEqual(["good-sleep-habits"]);
  });

  it("is asked about on the Get started doctor form", () => {
    const design = INTAKE_SECTIONS.doctor.find((s) => s.key === "design")!;
    expect(design.fields.some((f) => f.key === "healthTips")).toBe(true);
    expect(INTAKE_SECTIONS.clinic.find((s) => s.key === "design")!.fields.some((f) => f.key === "healthTips")).toBe(false);
  });
});

describe("service descriptions", () => {
  it("fill in a description when the doctor gave only a name, and keep their own", () => {
    expect(describeService("Diabetes care").text).toBe(SERVICE_DEFAULTS[0]!.text);
    expect(describeService("Diabetes care", "My own words.").text).toBe("My own words.");
    expect(describeService("Wart removal").text).toBe("Consultation, treatment and follow-up for wart removal.");
    expect(scanFields(Object.fromEntries(SERVICE_DEFAULTS.map((d, i) => [String(i), d.text])))).toEqual([]);
  });
});

describe("Clinic Modern portfolio (design 2)", () => {
  const html = render(demo);

  it("renders every section with the doctor's details", () => {
    for (const id of ["about", "services", "education", "clinics", "appointment", "recognition", "beyond", "health-tips", "gallery", "faq"]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain("Dr. Arnav Deshpande");
    expect(html).toContain("Deshpande Family Clinic");
    expect(html).toContain("/templates/clinic-modern/hero-1.jpg");
    expect(html).toContain('name="doctorId" value="demo-arnav-deshpande"');
    expect(html).toContain('name="clinicId"');
    expect(html).toContain('href="/sample/arnav-deshpande/login"');
  });

  it("leaves out what the doctor asked to remove", () => {
    expect(html).not.toContain("Is the doctor registered?");
    expect(html).not.toContain("Publications");
    expect(html).not.toContain("Registration: Maharashtra Medical Council");
    expect(html).not.toContain("cm-float-late"); // no clinic-hours badge on the portrait
    // Health tips carry no author.
    expect(html).not.toMatch(/By Dr\./);
    // Services: one photo, not one per service.
    expect(new Set(html.match(/\/templates\/clinic-modern\/svc-[a-z]+\.jpg/g)).size).toBe(1);
  });

  it("shows no ratings or testimonials, and hides empty or switched-off sections", () => {
    expect(html.toLowerCase()).not.toMatch(/testimonial|\bratings?\b|\bstars?\b|★/);
    const bare = render({ ...demo, healthTips: undefined, gallery: [], awards: [], memberships: [], interests: [], interestsPhoto: undefined, interestsStory: undefined, services: [] });
    for (const id of ["health-tips", "gallery", "recognition", "beyond", "services"]) expect(bare).not.toContain(`id="${id}"`);
    expect(bare).toContain('id="appointment"');
  });

  it("centres a single degree without the timeline line", () => {
    const one = render({ ...demo, qualifications: [demo.qualifications[0]!] });
    expect(one).toContain("lg:self-center");
    expect(one).not.toContain("before:bg-gradient-to-b");
  });
});

describe("Clinic Modern visiting card", () => {
  it("renders print and phone with the QR address", () => {
    for (const variant of ["print", "phone"] as const) {
      const out = renderToStaticMarkup(createElement(CardT2, cardProps({ ...demo, photo: undefined }, variant, "html")));
      expect(out).toContain("Dr. Arnav Deshpande");
      expect(out).toContain("drarnavdeshpande.");
      expect(out).toContain("General Physician");
    }
  });
});

describe("appointment request form", () => {
  const base = { doctorId: "demo-arnav-deshpande", name: "Meera K", phone: "+91 98000 00201", consent: "on" };
  it("accepts a minimal request and normalises the phone", () => {
    const r = inquirySchema.safeParse(base);
    expect(r.success && r.data.phone).toBe("9800000201");
  });
  it("needs consent, a valid mobile and a date that isn't in the past", () => {
    expect(inquirySchema.safeParse({ ...base, consent: undefined }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...base, phone: "12345" }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...base, preferredDate: "2020-01-01" }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...base, website: "spam" }).success).toBe(false);
  });
});

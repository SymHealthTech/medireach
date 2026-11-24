import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";
import { Types } from "mongoose";
import { systemLabelOf, toPublicDoctor } from "@/lib/public/data";
import type { DoctorProfileDoc } from "@/models/DoctorProfile";
import ClassicPortfolio from "@/templates/portfolio/classic";
import ClassicCard from "@/templates/card/classic";
import { cardProps } from "@/lib/cards/render";
import type { PublicDoctor } from "@/templates/types";

const base = Object.values(SAMPLE_PUBLIC_DOCTORS)[0]!;
const render = (d: PublicDoctor) => renderToStaticMarkup(createElement(ClassicPortfolio, { doctor: d, seo: { heading: createElement("h1", null, d.fullName), intro: "INTRO" } }));

describe("doctor portfolio page shows what the admin editor asks", () => {
  it("names the system of medicine, except allopathy", () => {
    expect(systemLabelOf("allopathy")).toBeUndefined();
    expect(systemLabelOf("ayurveda")).toBe("Ayurveda");
    expect(systemLabelOf("dental")).toBe("Dentistry");
    expect(systemLabelOf("other", " Naturopathy ")).toBe("Naturopathy");
    expect(systemLabelOf("other", "")).toBeUndefined();
  });

  it("shows the system, practitioner type, registration year and NMR ID, and the short bio as an intro", () => {
    const html = render({
      ...base,
      systemOfMedicine: "ayurveda",
      systemLabel: "Ayurveda",
      practitionerType: "consultant",
      registration: { council: "Maharashtra Council of Indian Medicine", number: "I-12345", year: 2010, nmrId: "NMR-778" },
      shortBio: "Ayurveda physician for joint and skin care.",
      fullBioHtml: "<p>Full bio.</p>",
    });
    expect(html).toContain("System of medicine");
    expect(html.match(/Ayurveda</g)?.length).toBeGreaterThanOrEqual(2); // hero tag + About fact
    expect(html).toContain("Consultant / specialist");
    expect(html).toContain("Registered in 2010 · NMR ID NMR-778");
    expect(html).toContain("Ayurveda physician for joint and skin care.");
    expect(html).toContain("Full bio.");
  });

  it("keeps allopathy pages unchanged and shows the short bio once when there is no full bio", () => {
    const html = render({ ...base, systemOfMedicine: "allopathy", systemLabel: undefined, practitionerType: "gp", shortBio: "Only short bio.", fullBioHtml: undefined });
    expect(html).not.toContain("System of medicine");
    expect(html).toContain("General practitioner");
    expect(html.split("Only short bio.").length - 1).toBe(1);
  });
});

describe("doctor visiting card shows what the admin editor asks", () => {
  const card = (d: PublicDoctor, variant: "print" | "phone") =>
    renderToStaticMarkup(createElement(ClassicCard, cardProps({ ...d, photo: undefined }, variant, "html"))).toLowerCase();
  const c0 = base.clinics[0]!;

  it("labels WhatsApp correctly", () => {
    const same = { ...base, phone: "919800000001", whatsapp: "919800000001" };
    expect(card(same, "phone")).toContain("call or whatsapp");
    const apart = { ...base, phone: "919800000001", whatsapp: "919800000002" };
    for (const v of ["print", "phone"] as const) {
      expect(card(apart, v), v).not.toContain("call or whatsapp");
      expect(card(apart, v), v).toContain(">whatsapp<");
      expect(card(apart, v), v).toContain("+91 98000 00002");
    }
    const none = card({ ...base, phone: "919800000001", whatsapp: undefined }, "phone");
    expect(none).not.toContain("whatsapp");
  });

  it("shows a second place, registration, system of medicine and the appointment note", () => {
    const d = {
      ...base,
      systemOfMedicine: "ayurveda",
      systemLabel: "Ayurveda",
      registration: { council: "Maharashtra Council of Indian Medicine", number: "I-12345" },
      clinics: [
        { ...c0, appointmentNote: "By appointment only" },
        { ...c0, id: "v1", name: "Ruby Hall Clinic", type: "hospital_visiting" as const },
        { ...c0, id: "v2", name: "Third" },
      ],
    };
    const phone = card(d, "phone");
    expect(phone).toContain("also at");
    expect(phone).toContain("ruby hall clinic");
    expect(phone).toContain("+1 more");
    expect(phone).toContain("reg. maharashtra council of indian medicine · i-12345");
    expect(phone).toContain("by appointment only");
    for (const v of ["print", "phone"] as const) expect(card(d, v), v).toContain("· ayurveda");
  });

  it("shows the main clinic's street on the phone card, unless the card is full", () => {
    const street = { ...c0, addressLine1: "Shop 4, Karve Road", addressLine2: "First floor", appointmentNote: undefined };
    expect(card({ ...base, clinics: [street] }, "phone")).toContain("shop 4, karve road, first floor");
    const full = { ...base, phone: "919800000001", whatsapp: "919800000002", clinics: [street, { ...c0, id: "x2", name: "Ruby Hall Clinic" }] };
    const html = card(full, "phone");
    expect(html).not.toContain("shop 4, karve road");
    expect(html).toContain(`${c0.area.name.toLowerCase()}, ${c0.city.name.toLowerCase()}`);
  });
});

describe("doctor page: name and map", () => {
  const city = new Types.ObjectId();
  const area = new Types.ObjectId();
  const masters = {
    cities: [{ id: String(city), name: "Pune", slug: "pune", state: "Maharashtra" }],
    areas: [{ id: String(area), name: "Kothrud", slug: "kothrud", cityId: String(city) }],
    specialties: [],
    degrees: [],
    councils: [],
  };
  const doc = (extra: Record<string, unknown> = {}) =>
    ({
      _id: new Types.ObjectId(),
      status: "published",
      citySlug: "pune",
      slug: "dr-asha-kulkarni",
      title: "Dr.",
      firstName: "Asha",
      middleName: "R",
      lastName: "Kulkarni",
      languages: [],
      systemOfMedicine: "allopathy",
      registration: {},
      qualifications: [],
      practitionerType: "gp",
      secondarySpecialtyIds: [],
      services: [],
      conditionsTreated: [],
      clinics: [{ _id: new Types.ObjectId(), name: "Asha Clinic", type: "own_clinic", addressLine1: "Shop 4", areaId: area, cityId: city, state: "Maharashtra", pincode: "411038", timings: [], geo: { lat: 18.5, lng: 73.8 } }],
      links: {},
      awards: [],
      memberships: [],
      publications: [],
      interests: [],
      gallery: [],
      portfolioTemplateId: "classic",
      cardTemplateId: "classic",
      seo: { noindex: false },
      updatedAt: new Date(),
      ...extra,
    }) as unknown as DoctorProfileDoc;

  it("shows the middle name unless a display name is set", () => {
    expect(toPublicDoctor(doc(), masters).fullName).toBe("Dr. Asha R Kulkarni");
    expect(toPublicDoctor(doc({ middleName: undefined }), masters).fullName).toBe("Dr. Asha Kulkarni");
    expect(toPublicDoctor(doc({ displayName: "Dr. A. R. Kulkarni" }), masters).fullName).toBe("Dr. A. R. Kulkarni");
  });

  it("maps the main clinic", () => {
    const d = toPublicDoctor(doc(), masters);
    expect(d.clinics[0]!.mapEmbedUrl).toContain("18.5%2C73.8");
    const html = render(d);
    expect(html).toContain("<iframe");
    expect(html).toContain("Map showing Asha Clinic");
  });
});


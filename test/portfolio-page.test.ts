import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";
import { systemLabelOf } from "@/lib/public/data";
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
});


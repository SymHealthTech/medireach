import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";
import { systemLabelOf } from "@/lib/public/data";
import ClassicPortfolio from "@/templates/portfolio/classic";
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

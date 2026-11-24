import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SAMPLE_SITES } from "@/fixtures/sample-sites";
import { bedsOf } from "@/lib/public/establishments";
import { siteCardProps } from "@/lib/cards/render";
import ClassicSiteCard from "@/templates/card/classic/site";
import { ClassicSite } from "@/templates/site/ClassicSite";
import type { PublicEstablishment } from "@/templates/types";

const render = (s: PublicEstablishment) =>
  renderToStaticMarkup(createElement(ClassicSite, { site: s, seo: { heading: createElement("h1", null, s.name), intro: "INTRO", breadcrumbs: null, quickFacts: null } }));
const count = (html: string, text: string) => html.split(text).length - 1;

describe("clinic website page shows what the admin editor asks", () => {
  const clinic = SAMPLE_SITES.skin;

  it("shows insurance on clinic sites, and hides the section when there is nothing to show", () => {
    const html = render({ ...clinic, insurance: { cashless: true, providers: ["Star Health", "MediAssist"] } });
    expect(html).toContain('id="insurance"');
    expect(html).toContain("Cashless treatment available");
    expect(html).toContain("MediAssist");
    expect(render({ ...clinic, insurance: { cashless: false, providers: [] } })).not.toContain('id="insurance"');
    expect(render({ ...clinic, insurance: undefined })).not.toContain('id="insurance"');
  });

  it("shows the short description under the tagline, once", () => {
    const html = render({ ...clinic, tagline: "TAGLINE ONE", shortDescription: "SHORT DESCRIPTION ONE", aboutHtml: "<p>About text.</p>" });
    expect(html).toContain("TAGLINE ONE");
    expect(count(html, "SHORT DESCRIPTION ONE")).toBe(1);
    const noTagline = render({ ...clinic, tagline: undefined, shortDescription: "SHORT DESCRIPTION TWO", aboutHtml: undefined });
    expect(count(noTagline, "SHORT DESCRIPTION TWO")).toBe(1);
  });
});

describe("hospital website page shows what the admin editor asks", () => {
  const hospital = SAMPLE_SITES["small-hospital"];

  it("shows beds from bed types alone, and bed types without a count by name", () => {
    expect(bedsOf({ total: undefined, types: [{ type: "General ward", count: 6 }, { type: "ICU", count: null }] })).toEqual({ beds: { total: 6, types: [{ type: "General ward", count: 6 }, { type: "ICU" }] } });
    expect(bedsOf({ total: 10, types: [] })).toEqual({ beds: { total: 10, types: [] } });
    expect(bedsOf({ total: 0, types: [] })).toEqual({});
    const html = render({ ...hospital, beds: { total: 0, types: [{ type: "Labour room" }] } });
    expect(html).toContain('id="beds"');
    expect(html).toContain("Labour room");
    expect(html).not.toContain("beds in total");
  });

  it("names the hospital type in the badge and top bar", () => {
    const html = render({ ...hospital, category: { name: "Maternity Hospital", slug: "maternity-hospital", plural: "Maternity Hospitals" } });
    expect(count(html, "Maternity Hospital")).toBeGreaterThanOrEqual(2);
    expect(render({ ...hospital, category: undefined })).toContain("Hospital");
  });

  it("shows the emergency bar only for an emergency number, else a plain call bar", () => {
    const withEmergency = render({ ...hospital, emergencyPhone: "919800000001", phones: ["912000000002"] });
    expect(withEmergency).toContain("emergency");
    expect(withEmergency).toContain("tel:+919800000001");
    const without = render({ ...hospital, emergencyPhone: undefined, phones: ["912000000002"] });
    expect(without).not.toMatch(/24×7 emergency and contact|Emergency contact/); // the bar's wording (a service may be called "24×7 emergency")
    expect(without).toContain("Call us");
    expect(without).toContain("tel:+912000000002");
  });
});

describe("hospital visiting card shows what the admin editor asks", () => {
  const h = SAMPLE_SITES["small-hospital"];
  // Lower-cased: the phone card prints its row labels in capitals.
  const card = (s: PublicEstablishment, variant: "print" | "phone") => renderToStaticMarkup(createElement(ClassicSiteCard, siteCardProps(s, variant, "html"))).toLowerCase();

  it("names the hospital type and labels every number", () => {
    const busy = {
      ...h,
      category: { name: "Maternity Hospital", slug: "maternity-hospital", plural: "Maternity Hospitals" },
      is24x7: true,
      emergencyPhone: "919800000001",
      phones: ["912027000002"],
      whatsapp: "919800000003",
      address: { ...h.address, line2: "Ground floor" },
    };
    for (const v of ["print", "phone"] as const) {
      const html = card(busy, v);
      expect(html, v).toContain("maternity hospital");
      expect(html, v).toContain("24×7 emergency");
      expect(html, v).toContain(">call<");
      expect(html, v).toContain(">whatsapp<");
    }
    expect(card(busy, "phone")).toContain("ground floor");
  });

  it("folds a shared WhatsApp into the call label, and keeps a single number unlabelled on print", () => {
    const shared = { ...h, emergencyPhone: undefined, phones: ["919800000002"], whatsapp: "919800000002" };
    expect(card(shared, "print")).toContain("call or whatsapp");
    expect(card(shared, "phone")).toContain("call or whatsapp");
    const single = card({ ...h, emergencyPhone: undefined, phones: ["912027000002"], whatsapp: undefined }, "print");
    expect(single).not.toContain(">call<");
    expect(single).not.toContain("emergency");
  });
});

describe("clinic visiting card", () => {
  const c = SAMPLE_SITES.skin;
  const card = (s: PublicEstablishment, variant: "print" | "phone") => renderToStaticMarkup(createElement(ClassicSiteCard, siteCardProps(s, variant, "html")));

  it("names up to 2 doctors and adds the appointment note on the phone card", () => {
    const doctors = [
      { name: "Dr. Riya Joshi", specialty: "Dermatologist" },
      { name: "Dr. Kunal Rao", specialty: "Trichologist" },
      { name: "Dr. A Shah" },
      { name: "Dr. B Mehta" },
    ];
    const html = card({ ...c, doctors, appointmentNote: "By appointment only" }, "phone");
    expect(html).toContain("Dr. Riya Joshi · Dermatologist");
    expect(html).toContain("+2 more");
    expect(html).not.toContain("Dr. A Shah");
    expect(html).toContain("By appointment only");
    // A long note is shortened to one line.
    expect(card({ ...c, appointmentNote: "x".repeat(120) }, "phone")).toContain("…");
    // Not on the print card, and not on hospital cards.
    expect(card({ ...c, doctors, appointmentNote: "By appointment only" }, "print")).not.toContain("Dr. Riya Joshi");
    expect(card({ ...SAMPLE_SITES["small-hospital"], doctors, appointmentNote: "OPD: Mon–Sat" }, "phone")).not.toContain("Dr. Riya Joshi");
  });
});


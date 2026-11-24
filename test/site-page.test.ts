import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SAMPLE_SITES } from "@/fixtures/sample-sites";
import { bedsOf } from "@/lib/public/establishments";
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

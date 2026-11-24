import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SAMPLE_SITES } from "@/fixtures/sample-sites";
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

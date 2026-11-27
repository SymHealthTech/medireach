import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFString } from "pdf-lib";
import { cardPdfLinks, cardProps, renderCardPdf, siteCardFileResponse, siteCardProps } from "@/lib/cards/render";
import { sectionSchemas as doctorSchemas } from "@/lib/doctors/form";
import { sectionSchemas as siteSchemas } from "@/lib/establishments/form";
import { DEMO_PUBLIC_DOCTORS } from "@/fixtures/demo-doctors";
import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";
import { SAMPLE_SITES } from "@/fixtures/sample-sites";
import { TEMPLATE_KEYS } from "@/lib/constants";
import { cardDocks, registry, resolveCardDock, resolveCardTemplate } from "@/templates/registry";
import { DOCK_HEIGHT, PRINT_DOCK_HEIGHT, doctorCardActions, dockSlots, siteCardActions } from "@/templates/card/actions";
import ClassicCard from "@/templates/card/classic";
import ClassicSiteCard, { PRINT_DOCK as SITE_PRINT_DOCK, sitePhoneDock } from "@/templates/card/classic/site";
import { CARD_SIZE, type PublicDoctor } from "@/templates/types";
import { getTheme } from "@/themes/specialty";

/** Link annotations of a PDF's first page: URL and rectangle (points). */
async function pdfLinks(bytes: Uint8Array): Promise<{ url: string; rect: number[] }[]> {
  const pdf = await PDFDocument.load(bytes);
  const annots = pdf.getPage(0).node.lookupMaybe(PDFName.of("Annots"), PDFArray);
  if (!annots) return [];
  return annots.asArray().map((ref) => {
    const a = pdf.context.lookup(ref, PDFDict);
    const action = a.lookup(PDFName.of("A"), PDFDict);
    const rect = a.lookup(PDFName.of("Rect"), PDFArray).asArray().map((n) => Number(n.toString()));
    return { url: action.lookup(PDFName.of("URI"), PDFString).decodeText(), rect };
  });
}

describe("the visiting card follows the website design", () => {
  it("uses the card of the doctor's website design (Classic when that design isn't ready)", () => {
    for (const key of TEMPLATE_KEYS) expect(resolveCardTemplate(key)).toBe(registry.card[key]);
    expect(resolveCardTemplate("t4", { portfolio: ["classic", "t4"] })).toBe(registry.card.t4);
    expect(resolveCardTemplate("t4", { portfolio: ["classic"] })).toBe(registry.card.classic);
    expect(resolveCardDock("t4", { portfolio: ["classic"] })).toBe(cardDocks.classic);
    expect(resolveCardDock("t5")).toBe(cardDocks.t5);
  });

  it("paints design 1 (Serene Care) in its plum and rose", () => {
    for (const variant of ["print", "phone"] as const) {
      const html = renderToStaticMarkup(createElement(ClassicCard, cardProps(SAMPLE_PUBLIC_DOCTORS.gp, variant, "html")));
      expect(html).toContain("#55275A");
      expect(html).not.toContain("#0A3F3F"); // the old default teal
    }
  });

  it("paints a clinic's card in its website design colours", () => {
    for (const key of ["general-opd", "dental", "small-hospital"] as const) {
      const s = SAMPLE_SITES[key];
      const html = renderToStaticMarkup(createElement(ClassicSiteCard, siteCardProps(s, "phone", "html")));
      expect(html).toContain(getTheme(s.themeKey, s.kind).palette.primary);
    }
  });

  it("has no card choice in the editors: old card fields are dropped", () => {
    const doc = doctorSchemas.templates.parse({ portfolioTemplateId: "t3", cardTemplateId: "t2", cardStyle: "DOC-AMBER", showHealthTips: true });
    expect(doc).toEqual({ portfolioTemplateId: "t3", showHealthTips: true });
    const site = siteSchemas.design.parse({ themeKey: "dental", siteTemplateId: "classic", cardTemplateId: "t2", cardStyle: "CLN-BERRY" });
    expect(site).toEqual({ themeKey: "dental", siteTemplateId: "classic" });
  });
});

describe("card buttons", () => {
  const d = DEMO_PUBLIC_DOCTORS["arnav-deshpande"]!;

  it("gives a doctor Call, WhatsApp, Directions, Save and Website", () => {
    const actions = doctorCardActions(d);
    expect(actions.map((a) => a.key)).toEqual(["call", "whatsapp", "directions", "save", "website"]);
    expect(actions[0]!.href).toBe(`tel:+${d.phone}`);
    expect(actions[1]!.href).toMatch(new RegExp(`^https://wa\\.me/${d.whatsapp}\\?text=`));
    expect(actions[2]!.href).toBe(d.clinics[0]!.directionsUrl);
    expect(actions[3]!.href).toMatch(/^https?:\/\/.+\/contact\.vcf$/); // absolute, so it works from a PDF
    expect(actions[4]!.href).toBe(d.shareUrl);
    // Nothing to call or visit: just Save and Website.
    expect(doctorCardActions({ ...d, phone: undefined, whatsapp: undefined, clinics: [] }).map((a) => a.key)).toEqual(["save", "website"]);
  });

  it("gives a hospital a separate Emergency button when it has its own number", () => {
    const s = { ...SAMPLE_SITES["small-hospital"]!, phones: ["919800000001"], emergencyPhone: "919800000002" };
    expect(siteCardActions(s).map((a) => a.key)).toEqual(["call", "emergency", "whatsapp", "directions", "website"]);
    expect(siteCardActions({ ...s, emergencyPhone: "919800000001" }).map((a) => a.key)).not.toContain("emergency");
  });

  it("sit inside the phone and print cards without overlapping tiles", () => {
    const all = [...Object.values(cardDocks), ...Object.values(SAMPLE_SITES).map((s) => ({ phone: sitePhoneDock(s), print: SITE_PRINT_DOCK }))];
    for (const variant of ["phone", "print"] as const) {
      const { width } = CARD_SIZE[variant];
      for (const docks of all) {
        const slots = dockSlots(docks[variant], 5);
        expect(slots).toHaveLength(5);
        for (const [i, r] of slots.entries()) {
          expect(r.x).toBeGreaterThanOrEqual(0);
          expect(r.x + r.width).toBeLessThanOrEqual(width);
          // Phone: on the header's edge, above the contact details. Print: in the band between the name and the contact rows.
          expect(r.y).toBeGreaterThanOrEqual(variant === "phone" ? 500 : 150);
          expect(r.y + r.height).toBeLessThanOrEqual(variant === "phone" ? 1000 : 400);
          expect(r.height).toBe(variant === "phone" ? DOCK_HEIGHT : PRINT_DOCK_HEIGHT);
          if (i) expect(r.x).toBeGreaterThan(slots[i - 1]!.x + slots[i - 1]!.width);
        }
      }
    }
  });

  it("are real links on the card page only", () => {
    for (const key of TEMPLATE_KEYS) {
      const Card = registry.card[key];
      const doctor: PublicDoctor = { ...d, photo: undefined, portfolioTemplateId: key };
      const print = renderToStaticMarkup(createElement(Card, cardProps(doctor, "print", "html")));
      expect(print.toLowerCase(), key).toContain(">directions<"); // the print card has them too
      const live = renderToStaticMarkup(createElement(Card, cardProps(doctor, "phone", "html", { links: true })));
      expect(live, key).toContain(`href="tel:+${d.phone}"`);
      expect(live, key).toContain("https://wa.me/");
      expect(live, key).toContain("Directions");
      const image = renderToStaticMarkup(createElement(Card, cardProps(doctor, "phone", "image", { links: true })));
      expect(image, key).not.toContain("<a ");
      const preview = renderToStaticMarkup(createElement(Card, cardProps(doctor, "phone", "html")));
      expect(preview, key).not.toContain("<a ");
      expect(preview.toLowerCase(), key).toContain(">whatsapp<"); // still drawn
    }
  });
});

describe("clickable PDFs", () => {
  // Satori can't fetch the bundled demo photo in tests.
  const d: PublicDoctor = { ...DEMO_PUBLIC_DOCTORS["kunal-bhatia"]!, photo: undefined };

  // Same place as the drawn tiles: card pixels scaled to the page (phone 90 × 160 mm, print 85 × 55 mm), y flipped.
  const PAGE_MM = { phone: [90, 160], print: [85, 55] } as const;
  for (const variant of ["phone", "print"] as const) {
    it(`puts a working link over every button of the ${variant} PDF`, async () => {
      const links = await pdfLinks(await renderCardPdf(d, undefined, variant));
      const actions = doctorCardActions(d);
      expect(links.map((l) => l.url)).toEqual(actions.map((a) => a.href));
      const scale = ((PAGE_MM[variant][0] / 25.4) * 72) / CARD_SIZE[variant].width;
      const pageHeight = (PAGE_MM[variant][1] / 25.4) * 72;
      const expected = cardPdfLinks(variant, actions, resolveCardDock(d.portfolioTemplateId));
      for (const [i, l] of links.entries()) {
        const e = expected[i]!;
        expect(l.rect[0]).toBeCloseTo(e.x * scale, 1);
        expect(l.rect[3]).toBeCloseTo(pageHeight - e.y * scale, 1);
      }
    }, 60_000);
  }

  it("does the same for clinic and hospital cards", async () => {
    const s = { ...SAMPLE_SITES["small-hospital"]!, logo: undefined };
    for (const file of ["phone.pdf", "print.pdf"] as const) {
      const res = await siteCardFileResponse(s, file, { cacheControl: "no-store", download: false });
      const links = await pdfLinks(new Uint8Array(await res.arrayBuffer()));
      expect(links.map((l) => l.url), file).toEqual(siteCardActions(s).map((a) => a.href));
    }
  }, 60_000);
});

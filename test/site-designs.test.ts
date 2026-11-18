import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderSiteCardPng, siteCardFileResponse, siteCardProps } from "@/lib/cards/render";
import { scanText } from "@/lib/compliance/scan";
import { SAMPLE_SITES } from "@/fixtures/sample-sites";
import { registry } from "@/templates/registry";
import { CARD_SIZE } from "@/templates/types";
import { SPECIALTY_THEMES } from "@/themes/specialty";

function pngSize(buf: ArrayBuffer): { width: number; height: number } {
  const view = new DataView(buf);
  expect(new Uint8Array(buf.slice(1, 4))).toEqual(new Uint8Array([0x50, 0x4e, 0x47]));
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

describe("sample sites (design gallery)", () => {
  it("has one fictional, noindex sample per theme", () => {
    const sites = Object.values(SAMPLE_SITES);
    expect(sites.map((s) => s.themeKey)).toEqual(SPECIALTY_THEMES.map((t) => t.key));
    for (const s of sites) {
      expect(s.name, s.themeKey).toMatch(/Sample/);
      expect(s.seo.noindex).toBe(true);
      expect(s.url).toMatch(new RegExp(`/designs/${s.themeKey}$`));
      expect(s.phones).toEqual(["919800000000"]); // not a real number
      expect(s.cardUrl).toBeUndefined(); // no card button on samples
      expect(s.services.length, s.themeKey).toBeGreaterThan(0);
    }
    expect(SAMPLE_SITES["small-hospital"]).toMatchObject({ kind: "hospital", is24x7: true, beds: { total: 10 } });
    expect(SAMPLE_SITES.skin.kind).toBe("clinic");
  });

  it("uses no NMC-banned phrases anywhere", () => {
    for (const s of Object.values(SAMPLE_SITES)) {
      const texts = [s.name, s.tagline, s.shortDescription, s.aboutHtml, s.appointmentNote, ...s.services.map((x) => x.name), ...s.facilities.map((x) => x.name), ...s.equipment.map((x) => x.name)];
      for (const t of texts) expect(scanText(t ?? ""), `${s.themeKey}: ${t}`).toEqual([]);
    }
  });

  it("registers five clinic and five hospital slots", () => {
    expect(Object.keys(registry.clinic)).toEqual(["classic", "t2", "t3", "t4", "t5"]);
    expect(Object.keys(registry.hospital)).toEqual(["classic", "t2", "t3", "t4", "t5"]);
  });
});

describe("clinic and hospital visiting cards", () => {
  it("points the QR at the site's share address", () => {
    const s = { ...SAMPLE_SITES.dental, shareUrl: "https://sampledental.medireach.co.in" };
    expect(siteCardProps(s, "print", "image").qr.url).toBe("https://sampledental.medireach.co.in");
  });

  it("renders the print card at 300 dpi and the phone card at 1080 × 1920", async () => {
    expect(pngSize(await renderSiteCardPng(SAMPLE_SITES.skin, "print"))).toEqual(CARD_SIZE.print);
    expect(pngSize(await renderSiteCardPng(SAMPLE_SITES["small-hospital"], "phone"))).toEqual(CARD_SIZE.phone);
  });

  it("produces a one-page 85 × 55 mm PDF with a download name", async () => {
    const res = await siteCardFileResponse(SAMPLE_SITES.eye, "print.pdf", { cacheControl: "no-store", download: true });
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="eye-card-print.pdf"');
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
    const pdf = await PDFDocument.load(await res.arrayBuffer());
    expect(pdf.getPageCount()).toBe(1);
    const { width, height } = pdf.getPage(0).getSize();
    expect(Math.round((width / 72) * 25.4)).toBe(85);
    expect(Math.round((height / 72) * 25.4)).toBe(55);
  });
});

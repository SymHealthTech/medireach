import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";
import { qrForUrl } from "@/lib/cards/qr";
import { cloudinaryJpg } from "@/lib/cards/photo";
import { renderCardPdf, renderCardPng } from "@/lib/cards/render";
import { SAMPLE_PORTRAITS } from "@/fixtures/sample-portraits";
import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";
import { registry, resolveCardTemplate, resolvePortfolioTemplate } from "@/templates/registry";

function pngSize(buf: ArrayBuffer): { width: number; height: number } {
  const view = new DataView(buf);
  // PNG signature, then IHDR: width/height are big-endian at bytes 16 and 20.
  expect(new Uint8Array(buf.slice(1, 4))).toEqual(new Uint8Array([0x50, 0x4e, 0x47]));
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

describe("QR path", () => {
  it("encodes exactly the dark modules of the QR code", () => {
    const url = "https://sample-gp.medireach.co.in";
    const qr = qrForUrl(url);
    const ref = QRCode.create(url, { errorCorrectionLevel: "M" });
    expect(qr.size).toBe(ref.modules.size);
    // Sum of run lengths in the path == number of dark modules.
    const dark = Array.from(ref.modules.data).filter(Boolean).length;
    const runs = [...qr.path.matchAll(/h(\d+)v1/g)].reduce((a, m) => a + Number(m[1]), 0);
    expect(runs).toBe(dark);
    expect(qr.url).toBe(url);
  });
});

describe("template registry", () => {
  it("has five slots for both types", () => {
    expect(Object.keys(registry.portfolio)).toEqual(["classic", "t2", "t3", "t4", "t5"]);
    expect(Object.keys(registry.card)).toEqual(["classic", "t2", "t3", "t4", "t5"]);
  });

  it("falls back to Classic unless the slot is ready", () => {
    const ready = { portfolio: ["classic"] };
    expect(resolvePortfolioTemplate("t3", ready)).toBe(registry.portfolio.classic);
    expect(resolveCardTemplate("t2", ready)).toBe(registry.card.classic);
    expect(resolvePortfolioTemplate("t3", { ...ready, portfolio: ["classic", "t3"] })).toBe(registry.portfolio.t3);
    expect(resolvePortfolioTemplate("bogus", ready)).toBe(registry.portfolio.classic);
  });
});

describe("card rendering", () => {
  // Satori can't fetch the relative stock photo, so use the inline illustrated portrait.
  const doctor = { ...SAMPLE_PUBLIC_DOCTORS.consultant, photo: { url: SAMPLE_PORTRAITS.consultant, alt: "" } };

  it("renders the print card at 300 dpi and the phone card at 1080 × 1920", async () => {
    expect(pngSize(await renderCardPng(doctor, "print"))).toEqual({ width: 1004, height: 650 });
    expect(pngSize(await renderCardPng(doctor, "phone"))).toEqual({ width: 1080, height: 1920 });
  }, 60_000);

  it("produces a one-page 85 × 55 mm PDF", async () => {
    const bytes = await renderCardPdf(doctor);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    const { width, height } = pdf.getPage(0).getSize();
    expect(width).toBeCloseTo((85 / 25.4) * 72, 1);
    expect(height).toBeCloseTo((55 / 25.4) * 72, 1);
  }, 60_000);

  it("asks Cloudinary for JPEG face crops", () => {
    expect(cloudinaryJpg("https://res.cloudinary.com/demo/image/upload/v1/a.webp", 600)).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_jpg,q_85,c_fill,g_face,w_600,h_600/v1/a.webp",
    );
  });
});

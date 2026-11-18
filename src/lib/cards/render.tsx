import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { PDFDocument } from "pdf-lib";
import { cloudinaryJpg } from "@/lib/cards/photo";
import { qrForUrl } from "@/lib/cards/qr";
import { resolveCardTemplate, type ReadyTemplates } from "@/templates/registry";
import ClassicSiteCard from "@/templates/card/classic/site";
import { CARD_SIZE, type CardTemplateProps, type CardVariant, type PublicDoctor, type PublicEstablishment, type SiteCardTemplateProps } from "@/templates/types";

/**
 * Server-side card rendering: the same card template used on the card page is
 * rendered to PNG with Satori (via next/og) using the brand fonts, and the
 * print PNG is wrapped into an exact 85 × 55 mm PDF.
 */

const FONT_DIR = join(process.cwd(), "src", "assets", "fonts");

type FontDef = { name: string; data: ArrayBuffer; weight: 400 | 600 | 700; style: "normal" };
let fontsPromise: Promise<FontDef[]> | null = null;

async function load(file: string): Promise<ArrayBuffer> {
  const buf = await readFile(join(FONT_DIR, file));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

/** Brand fonts for Satori (WOFF; loaded once per server instance). */
export function cardFonts(): Promise<FontDef[]> {
  fontsPromise ??= Promise.all([
    load("fraunces-latin-600-normal.woff").then((data) => ({ name: "Fraunces", data, weight: 600 as const, style: "normal" as const })),
    load("plus-jakarta-sans-latin-400-normal.woff").then((data) => ({ name: "Jakarta", data, weight: 400 as const, style: "normal" as const })),
    load("plus-jakarta-sans-latin-600-normal.woff").then((data) => ({ name: "Jakarta", data, weight: 600 as const, style: "normal" as const })),
    load("plus-jakarta-sans-latin-700-normal.woff").then((data) => ({ name: "Jakarta", data, weight: 700 as const, style: "normal" as const })),
  ]).catch((err) => {
    fontsPromise = null;
    throw err;
  });
  return fontsPromise;
}

export const IMAGE_FONTS = { display: "Fraunces", body: "Jakarta" } as const;
export const HTML_FONTS = {
  display: "var(--font-fraunces), Georgia, serif",
  body: "var(--font-jakarta), system-ui, sans-serif",
} as const;

/** Props for a card in either renderer. */
export function cardProps(doctor: PublicDoctor, variant: CardVariant, renderer: "html" | "image"): CardTemplateProps {
  return {
    doctor,
    variant,
    qr: qrForUrl(doctor.shareUrl),
    fonts: renderer === "image" ? IMAGE_FONTS : HTML_FONTS,
    ...(doctor.photo ? { photoUrl: cloudinaryJpg(doctor.photo.url, 600) } : {}),
  };
}

/** PNG of a card (print: 300 dpi, phone: 1080 × 1920). */
export async function renderCardPng(doctor: PublicDoctor, variant: CardVariant, ready?: ReadyTemplates): Promise<ArrayBuffer> {
  const Card = resolveCardTemplate(doctor.cardTemplateId, ready);
  const { width, height } = CARD_SIZE[variant];
  const res = new ImageResponse(<Card {...cardProps(doctor, variant, "image")} />, { width, height, fonts: await cardFonts() });
  return res.arrayBuffer();
}

const MM_TO_PT = 72 / 25.4;

/** Print-ready PDF: one page, exactly 85 × 55 mm, the 300 dpi card filling it. */
export async function renderCardPdf(doctor: PublicDoctor, ready?: ReadyTemplates): Promise<Uint8Array> {
  return pdfFromPrintPng(await renderCardPng(doctor, "print", ready), `${doctor.fullName} – visiting card`);
}

export const CARD_FILES = {
  "phone.png": { variant: "phone", type: "image/png" },
  "print.png": { variant: "print", type: "image/png" },
  "print.pdf": { variant: "print", type: "application/pdf" },
} as const satisfies Record<string, { variant: CardVariant; type: string }>;

export type CardFile = keyof typeof CARD_FILES;

/** Build the download response for one card file. */
export async function cardFileResponse(
  doctor: PublicDoctor,
  file: CardFile,
  opts: { ready?: ReadyTemplates; cacheControl: string; download: boolean },
): Promise<Response> {
  const { type } = CARD_FILES[file];
  const body = file === "print.pdf" ? await renderCardPdf(doctor, opts.ready) : await renderCardPng(doctor, CARD_FILES[file].variant, opts.ready);
  const name = `${doctor.shortSlug ?? doctor.slug}-card-${file.replace(".", "-")}`.replace(/-(png|pdf)$/, `.$1`);
  return new Response(body as BodyInit, {
    headers: {
      "Content-Type": type,
      "Cache-Control": opts.cacheControl,
      "X-Robots-Tag": "noindex",
      ...(opts.download ? { "Content-Disposition": `attachment; filename="${name}"` } : {}),
    },
  });
}

// ---------------------------------------------------------------------------
// Clinic and hospital cards
// ---------------------------------------------------------------------------

/**
 * Card designs for clinics/hospitals. Only Classic exists; the other card
 * slots (t2–t5) are doctor-card placeholders, so every site renders Classic
 * until a site version of a slot is designed.
 */
export function resolveSiteCardTemplate(_key: string) {
  return ClassicSiteCard;
}

/** Props for a site card in either renderer. The QR opens the subdomain, else the site page. */
export function siteCardProps(site: PublicEstablishment, variant: CardVariant, renderer: "html" | "image"): SiteCardTemplateProps {
  return {
    site,
    variant,
    qr: qrForUrl(site.shareUrl),
    fonts: renderer === "image" ? IMAGE_FONTS : HTML_FONTS,
    ...(site.logo ? { logoUrl: cloudinaryJpg(site.logo.url, 600) } : {}),
  };
}

export async function renderSiteCardPng(site: PublicEstablishment, variant: CardVariant): Promise<ArrayBuffer> {
  const Card = resolveSiteCardTemplate(site.cardTemplateId);
  const { width, height } = CARD_SIZE[variant];
  const res = new ImageResponse(<Card {...siteCardProps(site, variant, "image")} />, { width, height, fonts: await cardFonts() });
  return res.arrayBuffer();
}

async function pdfFromPrintPng(png: ArrayBuffer, title: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setCreator("MediReach");
  pdf.setProducer("MediReach");
  const image = await pdf.embedPng(png);
  const width = 85 * MM_TO_PT;
  const height = 55 * MM_TO_PT;
  const page = pdf.addPage([width, height]);
  page.drawImage(image, { x: 0, y: 0, width, height });
  return pdf.save();
}

/** Download response for one clinic/hospital card file. */
export async function siteCardFileResponse(
  site: PublicEstablishment,
  file: CardFile,
  opts: { cacheControl: string; download: boolean },
): Promise<Response> {
  const { type, variant } = CARD_FILES[file];
  const png = await renderSiteCardPng(site, variant);
  const body = file === "print.pdf" ? await pdfFromPrintPng(png, `${site.name} – visiting card`) : png;
  const name = `${site.slug}-card-${file.replace(".", "-")}`.replace(/-(png|pdf)$/, `.$1`);
  return new Response(body as BodyInit, {
    headers: {
      "Content-Type": type,
      "Cache-Control": opts.cacheControl,
      "X-Robots-Tag": "noindex",
      ...(opts.download ? { "Content-Disposition": `attachment; filename="${name}"` } : {}),
    },
  });
}

import type { PublicImage } from "@/templates/types";

/**
 * Illustrated gallery and "Beyond medicine" scenes for the FICTIONAL sample doctors. Flat drawings
 * (not photos) so a sample can't be mistaken for a real clinic. Base64 SVG
 * data URIs, like the sample portraits.
 */

const svg = (body: string, bg: string) =>
  `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600"><rect width="800" height="600" fill="${bg}"/>${body}</svg>`,
  )}`;

const plant = (x: number, y: number) =>
  `<rect x="${x - 22}" y="${y}" width="44" height="52" rx="8" fill="#c8664b"/>` +
  `<path fill="#2f8f5b" d="M${x} ${y}c-40-20-46-70-30-96 18 20 26 54 30 96zM${x} ${y}c38-24 48-70 34-100-20 22-30 58-34 100zM${x} ${y}c-6-40 0-80 14-110 10 34 6 74-14 110z"/>`;

const window_ = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#cfe6ec"/>` +
  `<path stroke="#fbf8f3" stroke-width="10" d="M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}"/>` +
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="none" stroke="#fbf8f3" stroke-width="12"/>`;

/** Reception desk with a waiting bench. */
const reception = svg(
  `<rect y="430" width="800" height="170" fill="#e6d9c4"/>` +
    window_(470, 90, 240, 200) +
    `<rect x="90" y="110" width="250" height="70" rx="12" fill="#0e3b3c"/><text x="215" y="155" font-family="Georgia,serif" font-size="30" fill="#fbf8f3" text-anchor="middle">Reception</text>` +
    `<rect x="70" y="300" width="330" height="150" rx="16" fill="#155456"/><rect x="70" y="290" width="330" height="24" rx="10" fill="#e3a23b"/>` +
    `<rect x="230" y="250" width="70" height="44" rx="6" fill="#2a3536"/><rect x="250" y="294" width="30" height="10" fill="#2a3536"/>` +
    `<rect x="460" y="380" width="260" height="22" rx="10" fill="#c8664b"/><rect x="470" y="402" width="14" height="50" fill="#8a4a36"/><rect x="696" y="402" width="14" height="50" fill="#8a4a36"/>` +
    plant(745, 380),
  "#f3ece0",
);

/** Consultation room: desk, chairs and an anatomy chart. */
const consultation = svg(
  `<rect y="420" width="800" height="180" fill="#d9e4df"/>` +
    `<rect x="90" y="90" width="150" height="210" rx="8" fill="#fbf8f3" stroke="#0e3b3c" stroke-width="6"/>` +
    `<circle cx="165" cy="140" r="24" fill="#e3a23b"/><rect x="150" y="166" width="30" height="80" rx="12" fill="#c8664b"/><path stroke="#0e3b3c" stroke-width="6" d="M130 190h70M150 250l-12 38M180 250l12 38"/>` +
    window_(300, 80, 200, 170) +
    `<rect x="300" y="330" width="380" height="24" rx="8" fill="#8a5b12"/><rect x="320" y="354" width="18" height="90" fill="#6b4710"/><rect x="642" y="354" width="18" height="90" fill="#6b4710"/>` +
    `<rect x="520" y="270" width="110" height="64" rx="6" fill="#2a3536"/><rect x="566" y="320" width="18" height="14" fill="#2a3536"/>` +
    `<path fill="none" stroke="#0e3b3c" stroke-width="8" stroke-linecap="round" d="M380 300c-20 30 0 40 20 30"/><circle cx="405" cy="328" r="10" fill="#c9d3d2" stroke="#0e3b3c" stroke-width="5"/>` +
    `<rect x="180" y="360" width="90" height="16" rx="6" fill="#1b6b66"/><rect x="190" y="300" width="70" height="66" rx="12" fill="#1b6b66"/><rect x="190" y="376" width="10" height="64" fill="#0e3b3c"/><rect x="250" y="376" width="10" height="64" fill="#0e3b3c"/>` +
    plant(730, 370),
  "#eef5f4",
);

/** Free health check-up camp. */
const camp = svg(
  `<rect y="440" width="800" height="160" fill="#b9d7a8"/>` +
    `<circle cx="660" cy="110" r="54" fill="#f4c871"/>` +
    `<path fill="#0e3b3c" d="M150 240l250-110 250 110z"/><rect x="170" y="240" width="460" height="210" fill="#fbf8f3"/>` +
    `<path fill="#e3a23b" d="M170 240h460v34H170z"/>` +
    `<rect x="300" y="130" width="200" height="0"/>` +
    `<rect x="210" y="300" width="160" height="90" rx="10" fill="#dce8e2"/><path stroke="#c8664b" stroke-width="12" stroke-linecap="round" d="M290 322v46M267 345h46"/>` +
    `<rect x="430" y="300" width="170" height="150" rx="8" fill="#155456"/>` +
    `<text x="400" y="264" font-family="Georgia,serif" font-size="24" fill="#0e3b3c" text-anchor="middle">Free health camp</text>` +
    `<circle cx="100" cy="410" r="20" fill="#d9a27a"/><rect x="80" y="430" width="40" height="70" rx="16" fill="#1b6b66"/>` +
    `<circle cx="700" cy="410" r="20" fill="#b07a55"/><rect x="680" y="430" width="40" height="70" rx="16" fill="#c8664b"/>`,
  "#dff0f4",
);

/** Waiting area with chairs and a health poster. */
const waiting = svg(
  `<rect y="420" width="800" height="180" fill="#e6d9c4"/>` +
    `<rect x="110" y="90" width="180" height="230" rx="10" fill="#fbf8f3" stroke="#e3a23b" stroke-width="6"/><path stroke="#c8664b" stroke-width="14" stroke-linecap="round" d="M200 140v60M170 170h60"/><path stroke="#0e3b3c" stroke-width="6" stroke-linecap="round" d="M150 240h100M150 266h80M150 292h90"/>` +
    window_(400, 90, 280, 190) +
    [0, 1, 2, 3].map((i) => `<rect x="${330 + i * 100}" y="350" width="80" height="20" rx="8" fill="#1b6b66"/><rect x="${336 + i * 100}" y="300" width="68" height="56" rx="12" fill="#2f8f5b"/><rect x="${340 + i * 100}" y="370" width="8" height="70" fill="#0e3b3c"/><rect x="${392 + i * 100}" y="370" width="8" height="70" fill="#0e3b3c"/>`).join("") +
    plant(80, 380),
  "#f5efe5",
);

/** Pharmacy shelf / medicines counter. */
const counter = svg(
  `<rect y="430" width="800" height="170" fill="#d9e4df"/>` +
    `<rect x="120" y="70" width="560" height="260" rx="12" fill="#fbf8f3" stroke="#155456" stroke-width="8"/>` +
    [110, 190, 270].map((y) => `<rect x="130" y="${y + 50}" width="540" height="10" fill="#155456"/>`).join("") +
    [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${150 + i * 64}" y="${120 - (i % 2) * 10}" width="40" height="${40 + (i % 2) * 10}" rx="6" fill="${["#e3a23b", "#c8664b", "#1b6b66", "#2f8f5b"][i % 4]}"/>`).join("") +
    [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${160 + i * 84}" y="210" width="54" height="40" rx="20" fill="${["#dce8e2", "#f4c871", "#cfe6ec"][i % 3]}" stroke="#155456" stroke-width="4"/>`).join("") +
    `<rect x="80" y="340" width="640" height="110" rx="14" fill="#0e3b3c"/><rect x="80" y="334" width="640" height="20" rx="8" fill="#e3a23b"/>`,
  "#eef5f4",
);

export const SAMPLE_GALLERY: PublicImage[] = [
  { url: consultation, alt: "Illustration of the consultation room (sample)", caption: "Consultation room" },
  { url: reception, alt: "Illustration of the clinic reception (sample)", caption: "Reception" },
  { url: waiting, alt: "Illustration of the waiting area (sample)", caption: "Waiting area" },
  { url: camp, alt: "Illustration of a free health camp (sample)", caption: "Free health camp, 2025" },
  { url: counter, alt: "Illustration of the medicines counter (sample)", caption: "Medicines counter" },
];

/** Runner on a road at sunrise (sample GP: marathon runner). */
const runner = svg(
  `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4c871"/><stop offset="1" stop-color="#fbe9cf"/></linearGradient></defs>` +
    `<rect width="800" height="600" fill="url(#sky)"/>` +
    `<circle cx="560" cy="300" r="90" fill="#e3a23b"/>` +
    `<path fill="#9cc3a8" d="M0 330c120-60 240-70 380-30s260 40 420-10v310H0z"/>` +
    `<path fill="#5e9d78" d="M0 390c160-50 300-40 440 0s240 30 360-10v220H0z"/>` +
    `<path fill="#d9cdb8" d="M300 600l70-210h60l70 210z"/><path stroke="#fbf8f3" stroke-width="6" stroke-dasharray="22 18" d="M400 400v200"/>` +
    // Runner.
    `<g transform="translate(470 250)">` +
    `<circle cx="40" cy="20" r="18" fill="#d9a27a"/><path fill="#2b1d16" d="M24 14c2-14 26-18 34-4-10-4-20-2-34 4z"/>` +
    `<path fill="#1b6b66" d="M24 40h34l6 60H22z"/>` +
    `<path stroke="#d9a27a" stroke-width="10" stroke-linecap="round" fill="none" d="M26 50l-24 30M58 50l26 22"/>` +
    `<path stroke="#0e3b3c" stroke-width="12" stroke-linecap="round" fill="none" d="M32 100l-18 50-24 10M54 100l30 40 4 34"/>` +
    `<rect x="-22" y="154" width="26" height="10" rx="5" fill="#c8664b"/><rect x="78" y="172" width="26" height="10" rx="5" fill="#c8664b"/>` +
    `<rect x="26" y="58" width="30" height="20" rx="3" fill="#fbf8f3"/><text x="41" y="73" font-family="Arial" font-size="12" font-weight="700" fill="#0e3b3c" text-anchor="middle">42</text>` +
    `</g>`,
  "#fbe9cf",
);

/** Cyclist on a hill road (sample consultant: cycling). */
const cyclist = svg(
  `<rect width="800" height="600" fill="#dff0f4"/>` +
    `<circle cx="170" cy="130" r="60" fill="#f4c871"/>` +
    `<path fill="#b9d7a8" d="M0 300l160-120 140 90 160-150 340 220v260H0z"/>` +
    `<path fill="#7fb38e" d="M0 420c200-80 420-90 800-40v220H0z"/>` +
    `<path fill="none" stroke="#2a3536" stroke-width="40" d="M-20 560c220-90 520-110 840-90"/>` +
    `<g transform="translate(330 330)">` +
    `<g fill="none" stroke="#0e3b3c" stroke-width="7"><circle cx="0" cy="110" r="48"/><circle cx="170" cy="110" r="48"/></g>` +
    `<path fill="none" stroke="#c8664b" stroke-width="8" stroke-linejoin="round" d="M0 110l60-70h80l30 70M60 40l40 70h-100M100 110l40-70"/>` +
    `<path stroke="#0e3b3c" stroke-width="7" stroke-linecap="round" d="M52 30h22M140 40l10-20h18"/>` +
    `<path fill="#2c5a7a" d="M70 -50l40 0 18 60-48 10z"/>` +
    `<circle cx="110" cy="-72" r="18" fill="#d9a27a"/><path fill="#e3a23b" d="M90 -78c4-22 40-24 44 0z"/>` +
    `<path stroke="#d9a27a" stroke-width="9" stroke-linecap="round" fill="none" d="M110 -40l50 50"/>` +
    `<path stroke="#0e3b3c" stroke-width="11" stroke-linecap="round" fill="none" d="M84 14l20 50-4 40M92 14l-8 48 24 34"/>` +
    `</g>`,
  "#dff0f4",
);

export const SAMPLE_INTEREST_PHOTOS: Record<"gp" | "consultant", PublicImage> = {
  gp: { url: runner, alt: "Illustration of a marathon runner at sunrise (sample)", caption: "Finish line, December 2025" },
  consultant: { url: cyclist, alt: "Illustration of a cyclist on a hill road (sample)", caption: "Pune to Goa, day three" },
};

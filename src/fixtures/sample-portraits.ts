/**
 * Illustrated portraits for the FICTIONAL sample doctors (homepage mockups,
 * sample pages, template previews). Drawn, not photographed, so nobody can
 * mistake a sample for a real doctor. Returned as base64 SVG data URIs: they
 * work in plain <img>, next/image (data: URIs skip the loader) and Satori.
 */

export interface PortraitStyle {
  skin: string;
  hair: string;
  /** short = cropped hair; long = shoulder length; bun = tied up. */
  hairStyle: "short" | "long" | "bun";
  /** Background disc colour. */
  bg: string;
  /** Shirt / scrubs colour under the white coat. */
  shirt: string;
  glasses?: boolean;
}

/** Slightly darker shade of a #rrggbb colour (neck shadow, ears). */
function shade(hex: string, amount = 0.12): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.round(c * (1 - amount)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, "0")).join("")}`;
}

export function portraitSvg(p: PortraitStyle): string {
  const ear = shade(p.skin, 0.08);
  const hairBack =
    p.hairStyle === "long"
      ? `<path fill="${p.hair}" d="M60 98C56 56 80 42 100 42c22 0 46 14 40 58l4 44c-12 8-26 4-30-6H86c-4 10-18 14-30 6z"/>`
      : p.hairStyle === "bun"
        ? `<circle cx="100" cy="46" r="15" fill="${p.hair}"/>`
        : "";
  const hairFront =
    p.hairStyle === "short"
      ? `<path fill="${p.hair}" d="M66 94c-5-34 14-46 34-46 24 0 40 12 34 46-3-14-12-24-34-24-18 0-30 8-34 24z"/>`
      : `<path fill="${p.hair}" d="M66 92c-2-30 16-40 36-40 22 0 36 14 32 40-12-14-30-20-52-16-8 2-13 8-16 16z"/>`;
  const glasses = p.glasses
    ? `<g fill="none" stroke="#2a3536" stroke-width="2.2"><circle cx="88" cy="96" r="9"/><circle cx="112" cy="96" r="9"/><path d="M97 96h6M79 94l-10-2M121 94l10-2"/></g>`
    : "";
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="400" height="400">`,
    `<rect width="200" height="200" fill="${p.bg}"/>`,
    hairBack,
    // White coat, shirt V and lapels.
    `<path fill="#fbfcfa" d="M26 200c0-40 32-58 74-58s74 18 74 58z"/>`,
    `<path fill="${p.shirt}" d="M84 143l16 38 16-38z"/>`,
    `<path fill="none" stroke="#d6dedc" stroke-width="2" d="M84 143l-8 57M116 143l8 57M84 143l16 38 16-38"/>`,
    // Neck, ears, head.
    `<rect x="88" y="114" width="24" height="34" rx="9" fill="${ear}"/>`,
    `<ellipse cx="68" cy="98" rx="6" ry="9" fill="${ear}"/><ellipse cx="132" cy="98" rx="6" ry="9" fill="${ear}"/>`,
    `<ellipse cx="100" cy="94" rx="32" ry="37" fill="${p.skin}"/>`,
    hairFront,
    // Face.
    `<g stroke="${p.hair}" stroke-width="2.6" stroke-linecap="round" fill="none"><path d="M81 86q7-4 13 0M106 86q6-4 13 0"/></g>`,
    `<ellipse cx="88" cy="97" rx="3" ry="3.4" fill="#2a2a2a"/><ellipse cx="112" cy="97" rx="3" ry="3.4" fill="#2a2a2a"/>`,
    `<path d="M90 112q10 8 20 0" stroke="#8c4a3c" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
    glasses,
    // Stethoscope.
    `<g fill="none" stroke="#24393a" stroke-width="3.5" stroke-linecap="round"><path d="M86 146c-9 18-6 36 10 38"/><path d="M114 146c8 16 6 30-2 36"/></g>`,
    `<circle cx="111" cy="186" r="6" fill="#c9d3d2" stroke="#24393a" stroke-width="2.5"/>`,
    `</svg>`,
  ].join("");
}

export function portraitDataUri(p: PortraitStyle): string {
  return `data:image/svg+xml;base64,${btoa(portraitSvg(p))}`;
}

const SKIN = { light: "#f1c9a5", medium: "#d9a27a", deep: "#b07a55" };

export const SAMPLE_PORTRAITS = {
  /** Dr. Aditi Sample, GP. */
  gp: portraitDataUri({ skin: SKIN.medium, hair: "#2b1d16", hairStyle: "long", bg: "#d7e8de", shirt: "#3e8b86" }),
  /** Dr. Rohan Sample, consultant cardiologist. */
  consultant: portraitDataUri({ skin: SKIN.medium, hair: "#1d1714", hairStyle: "short", bg: "#dfeaf2", shirt: "#2c5a7a", glasses: true }),
  /** The hospitals band's four visiting consultants. */
  hospital: [
    portraitDataUri({ skin: SKIN.light, hair: "#3a2a20", hairStyle: "short", bg: "#e0efee", shirt: "#8a2f3a" }),
    portraitDataUri({ skin: SKIN.deep, hair: "#1b1512", hairStyle: "bun", bg: "#e6f1ea", shirt: "#3e8b86" }),
    portraitDataUri({ skin: SKIN.medium, hair: "#241a15", hairStyle: "long", bg: "#e3edf5", shirt: "#c9822b", glasses: true }),
    portraitDataUri({ skin: SKIN.deep, hair: "#4a4a4a", hairStyle: "short", bg: "#eaf0e4", shirt: "#2c5a7a" }),
  ],
};

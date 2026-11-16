import { ImageResponse } from "next/og";
import { cardFonts } from "@/lib/cards/render";

/** Site-wide Open Graph image for the marketing pages (doctor pages have their own). */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MediReach: websites and visiting cards for doctors";

const INK = "#0E3B3C";
const PAPER = "#FBF8F3";
const MARIGOLD = "#E3A23B";
const SAGE = "#DCE8E2";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: INK, padding: "72px 80px", fontFamily: "Jakarta" }}>
        <div style={{ display: "flex", alignItems: "flex-end", fontSize: 44, fontWeight: 600, color: PAPER, fontFamily: "Fraunces" }}>
          MediReach
          <div style={{ width: 12, height: 12, borderRadius: 999, background: MARIGOLD, marginLeft: 5, marginBottom: 12 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 600, color: PAPER, lineHeight: 1.1, fontFamily: "Fraunces", maxWidth: 960 }}>
            Your patients search your name. Make sure they find you.
          </div>
          <div style={{ fontSize: 34, color: SAGE, marginTop: 28 }}>A one-page website and digital visiting card for doctors.</div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: MARIGOLD, fontWeight: 600 }}>Ready in 24 hours · Pune</div>
      </div>
    ),
    { ...size, fonts: await cardFonts() },
  );
}

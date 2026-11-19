import "server-only";
import { ImageResponse } from "next/og";
import { cloudinaryJpg } from "@/lib/cards/photo";
import { cardFonts } from "@/lib/cards/render";
import { getLiveEstablishment } from "@/lib/public/establishments";
import { SLUG_RE } from "@/lib/slug";
import { getTheme } from "@/themes/specialty";

/**
 * Open Graph image for clinic and hospital sites (the WhatsApp link preview):
 * name, category, area and the logo (or the initials) in the site's
 * theme colours, with the MediReach mark.
 */

export const OG_SIZE = { width: 1200, height: 630 };

/** "Shree Skin Clinic" → "SS". Satori cannot draw the lucide icons, so the mark is text. */
function initials(name: string): string {
  const words = name.replace(/^(the|dr\.?)\s+/i, "").split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "M";
}

const PAPER = "#F7F9FA";
const MUTED = "#5B6573";

export async function renderSiteOgImage(kind: "clinic" | "hospital", city: string, slug: string) {
  const s = SLUG_RE.test(city) && SLUG_RE.test(slug) ? await getLiveEstablishment(kind, city, slug) : null;
  const theme = getTheme(s?.themeKey, kind);
  const { primary, accent, soft } = theme.palette;
  const name = s?.name ?? "MediReach";
  const what = kind === "hospital" ? "Hospital" : (s?.category?.name ?? "Clinic");
  const place = s ? `${s.address.area.name}, ${s.address.city.name}` : "";
  const nameSize = name.length > 28 ? 58 : 70;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: PAPER, fontFamily: "Jakarta" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "64px 56px 56px 72px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", fontSize: 32, fontWeight: 600, color: primary, fontFamily: "Fraunces" }}>
            MediReach
            <div style={{ width: 10, height: 10, borderRadius: 999, background: accent, marginLeft: 4, marginBottom: 8 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: nameSize, fontWeight: 600, color: primary, lineHeight: 1.1, fontFamily: "Fraunces" }}>{name}</div>
            <div style={{ fontSize: 38, fontWeight: 600, color: "#1F2933", marginTop: 20 }}>{what}</div>
            {place && <div style={{ fontSize: 32, color: MUTED, marginTop: 10 }}>{place}</div>}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: MUTED }}>
            {s?.is24x7 ? "Open 24×7 · Address · Contact" : "Timings · Address · Contact"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 480, background: soft }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 340,
              height: 340,
              borderRadius: 999,
              border: `6px solid ${accent}`,
              background: "#FFFFFF",
              overflow: "hidden",
            }}
          >
            {s?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser
              <img src={cloudinaryJpg(s.logo.url, 400)} width={300} height={300} alt="" style={{ objectFit: "cover" }} />
            ) : (
              <div style={{ fontSize: 132, fontWeight: 600, color: primary, fontFamily: "Fraunces" }}>{initials(name)}</div>
            )}
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: 14, background: primary }} />
      </div>
    ),
    { ...OG_SIZE, fonts: await cardFonts() },
  );
}

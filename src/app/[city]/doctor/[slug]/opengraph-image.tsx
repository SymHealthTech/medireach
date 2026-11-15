import { ImageResponse } from "next/og";
import { getPublishedDoctor } from "@/lib/public/data";
import { primaryClinic } from "@/lib/seo/profile";
import { SLUG_RE } from "@/lib/slug";

/**
 * Dynamic Open Graph image: this is the WhatsApp / social link preview.
 * Name, specialty, area, photo and the MediReach mark on the brand palette.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Doctor profile on MediReach";
export const revalidate = 86400;

const INK = "#0E3B3C";
const PAPER = "#FBF8F3";
const MARIGOLD = "#E3A23B";
const SAGE = "#DCE8E2";
const MUTED = "#5D6B6C";

/** Satori can't decode WebP/AVIF, so force a square JPEG crop from Cloudinary. */
function ogPhotoUrl(url: string): string {
  const marker = "/image/upload/";
  const i = url.indexOf(marker);
  if (!url.includes("res.cloudinary.com") || i === -1) return url;
  return `${url.slice(0, i + marker.length)}f_jpg,q_80,c_fill,g_face,w_440,h_440/${url.slice(i + marker.length)}`;
}

function initials(name: string): string {
  const parts = name.replace(/^Dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

export default async function OgImage({ params }: { params: Promise<{ city: string; slug: string }> }) {
  const { city, slug } = await params;
  const d = SLUG_RE.test(city) && SLUG_RE.test(slug) ? await getPublishedDoctor(city, slug) : null;

  const name = d?.fullName ?? "MediReach";
  const clinic = d ? primaryClinic(d) : undefined;
  const specialty = d?.primarySpecialty?.name ?? "Doctor";
  const place = clinic ? `${clinic.area.name}, ${clinic.city.name}` : "";
  const nameSize = name.length > 26 ? 60 : 72;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: PAPER, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "64px 56px 56px 72px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", fontSize: 34, fontWeight: 700, color: INK }}>
            MediReach
            <div style={{ width: 10, height: 10, borderRadius: 999, background: MARIGOLD, marginLeft: 4, marginBottom: 9 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: nameSize, fontWeight: 700, color: INK, lineHeight: 1.1 }}>{name}</div>
            <div style={{ fontSize: 38, color: INK, marginTop: 20 }}>{specialty}</div>
            {place && <div style={{ fontSize: 32, color: MUTED, marginTop: 10 }}>{place}</div>}
            {d?.degreesLine && <div style={{ fontSize: 26, color: MUTED, marginTop: 10 }}>{d.degreesLine}</div>}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: MUTED }}>Timings · Address · Contact</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 480, background: SAGE }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 360,
              height: 360,
              borderRadius: 999,
              border: `6px solid ${MARIGOLD}`,
              background: PAPER,
              overflow: "hidden",
            }}
          >
            {d?.photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser
              <img src={ogPhotoUrl(d.photo.url)} width={348} height={348} alt="" style={{ objectFit: "cover" }} />
            ) : (
              <div style={{ fontSize: 140, fontWeight: 700, color: INK }}>{initials(name)}</div>
            )}
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: 14, background: INK }} />
      </div>
    ),
    size,
  );
}

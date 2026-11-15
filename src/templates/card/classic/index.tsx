import { formatPhone } from "@/lib/phone";
import { ROOT_HOSTNAME } from "@/lib/site";
import { openDaysSummary } from "@/lib/timings";
import { DevBanner } from "@/templates/DevBanner";
import { CARD_SIZE, type CardQr, type CardTemplateProps } from "@/templates/types";

/**
 * Classic visiting card (DESIGN_BRIEF.md §6). Paper background, ink text and
 * a marigold hairline; prints cleanly in black and white.
 *
 *  - print (85 × 55 mm): name, specialty, degrees, primary clinic + area,
 *    phone on the left; QR with "Scan for timings and directions" on the
 *    right; ink bar with the short URL along the bottom.
 *  - phone (1080 × 1920): photo, name, specialty, clinic + area, timing
 *    summary, large QR, call/WhatsApp hints, short URL, medireach.co.in.
 *
 * Satori-safe: inline styles, flexbox only (see CardTemplateProps).
 */

const INK = "#0E3B3C";
const PAPER = "#FBF8F3";
const MARIGOLD = "#E3A23B";
const MUTED = "#5D6B6C";
const SAGE = "#DCE8E2";

function QrBlock({ qr, px }: { qr: CardQr; px: number }) {
  const quiet = 3;
  return (
    <div style={{ display: "flex", background: "#FFFFFF", padding: Math.round((px / (qr.size + quiet * 2)) * quiet), borderRadius: 12 }}>
      <svg width={px} height={px} viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges">
        <path d={qr.path} fill={INK} />
      </svg>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.replace(/^Dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

const shortUrl = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

/** Shrink long names so they fit on one or two lines. */
const nameSize = (name: string, base: number) => (name.length > 26 ? Math.round(base * 0.78) : name.length > 20 ? Math.round(base * 0.88) : base);

function PrintCard({ doctor: d, qr, fonts, devBanner }: CardTemplateProps) {
  const { width, height } = CARD_SIZE.print;
  const clinic = d.clinics[0];
  const phone = d.phone ?? clinic?.phone;
  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: PAPER, color: INK, fontFamily: fonts.body }}>
      {devBanner && <DevBanner name={devBanner} />}
      <div style={{ display: "flex", flex: 1, padding: "52px 48px 32px 56px" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 32 }}>
          <div style={{ display: "flex", fontFamily: fonts.display, fontWeight: 600, fontSize: nameSize(d.fullName, 56), lineHeight: 1.1 }}>{d.fullName}</div>
          <div style={{ display: "flex", width: 72, height: 3, background: MARIGOLD, marginTop: 18, marginBottom: 18 }} />
          {d.primarySpecialty && <div style={{ display: "flex", fontSize: 28, fontWeight: 600 }}>{d.primarySpecialty.name}</div>}
          {d.degreesLine && <div style={{ display: "flex", fontSize: 22, color: MUTED, marginTop: 8 }}>{d.degreesLine}</div>}
          <div style={{ display: "flex", flex: 1 }} />
          {clinic && (
            <div style={{ display: "flex", fontSize: 22, lineHeight: 1.35 }}>
              {clinic.name}, {clinic.area.name}
            </div>
          )}
          {phone && <div style={{ display: "flex", fontSize: 26, fontWeight: 700, marginTop: 8 }}>{formatPhone(phone)}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 300 }}>
          <QrBlock qr={qr} px={232} />
          <div style={{ display: "flex", textAlign: "center", fontSize: 17, color: MUTED, marginTop: 14, width: 260, justifyContent: "center" }}>
            Scan for timings and directions
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 64,
          padding: "0 56px",
          background: INK,
          color: PAPER,
          fontSize: 22,
          fontWeight: 600,
        }}
      >
        <div style={{ display: "flex" }}>{shortUrl(qr.url)}</div>
        <div style={{ display: "flex", alignItems: "center", fontFamily: fonts.display, fontSize: 22 }}>
          MediReach
          <div style={{ display: "flex", width: 7, height: 7, borderRadius: 999, background: MARIGOLD, marginLeft: 3, marginTop: 8 }} />
        </div>
      </div>
    </div>
  );
}

function PhoneCard({ doctor: d, qr, fonts, photoUrl, devBanner }: CardTemplateProps) {
  const { width, height } = CARD_SIZE.phone;
  const clinic = d.clinics[0];
  const phone = d.phone ?? clinic?.phone;
  const hours = clinic ? openDaysSummary(clinic.timings) : "";
  const hasHours = hours.length > 0;
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: PAPER,
        color: INK,
        fontFamily: fonts.body,
        textAlign: "center",
      }}
    >
      {devBanner && <DevBanner name={devBanner} />}
      <div style={{ display: "flex", width: "100%", height: 14, background: INK }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "88px 80px 0", width: "100%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 300,
            height: 300,
            borderRadius: 999,
            border: `6px solid ${MARIGOLD}`,
            background: SAGE,
            overflow: "hidden",
          }}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- also rendered by Satori
            <img src={photoUrl} alt="" width={288} height={288} style={{ width: 288, height: 288, borderRadius: 999, objectFit: "cover" }} />
          ) : (
            <div style={{ display: "flex", fontFamily: fonts.display, fontSize: 110, fontWeight: 600 }}>{initials(d.fullName)}</div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "center", fontFamily: fonts.display, fontWeight: 600, fontSize: nameSize(d.fullName, 84), lineHeight: 1.1, marginTop: 52 }}>
          {d.fullName}
        </div>
        {d.primarySpecialty && <div style={{ display: "flex", fontSize: 44, fontWeight: 600, marginTop: 18 }}>{d.primarySpecialty.name}</div>}
        {d.degreesLine && <div style={{ display: "flex", justifyContent: "center", fontSize: 32, color: MUTED, marginTop: 12 }}>{d.degreesLine}</div>}
        <div style={{ display: "flex", width: 120, height: 4, background: MARIGOLD, marginTop: 40, marginBottom: 40 }} />
        {clinic && (
          <div style={{ display: "flex", justifyContent: "center", fontSize: 36, lineHeight: 1.3 }}>
            {clinic.name}, {clinic.area.name}
          </div>
        )}
        {hasHours && (
          <div style={{ display: "flex", justifyContent: "center", fontSize: 28, color: MUTED, marginTop: 14, lineHeight: 1.4, maxWidth: 900 }}>
            {hours.length > 90 ? "Timings on my page — scan below" : hours}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flex: 1 }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <QrBlock qr={qr} px={420} />
        <div style={{ display: "flex", fontSize: 28, color: MUTED, marginTop: 20 }}>Scan for timings and directions</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 44 }}>
        {phone && <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>Call or WhatsApp {formatPhone(phone)}</div>}
        <div style={{ display: "flex", fontSize: 34, fontWeight: 600, marginTop: 16 }}>{shortUrl(qr.url)}</div>
      </div>
      <div style={{ display: "flex", flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: 110, background: INK, color: PAPER, fontSize: 26 }}>
        <div style={{ display: "flex", fontFamily: fonts.display, fontWeight: 600, fontSize: 30 }}>MediReach</div>
        <div style={{ display: "flex", width: 8, height: 8, borderRadius: 999, background: MARIGOLD, marginLeft: 4, marginTop: 12 }} />
        <div style={{ display: "flex", marginLeft: 16, color: "#C9D8D4" }}>{ROOT_HOSTNAME}</div>
      </div>
    </div>
  );
}

export default function ClassicCard(props: CardTemplateProps) {
  return props.variant === "print" ? <PrintCard {...props} /> : <PhoneCard {...props} />;
}

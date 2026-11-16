import { formatPhone } from "@/lib/phone";
import { ROOT_HOSTNAME } from "@/lib/site";
import { openDaysSummary } from "@/lib/timings";
import { DevBanner } from "@/templates/DevBanner";
import { CARD_SIZE, type CardQr, type CardTemplateProps } from "@/templates/types";

/**
 * Classic visiting card (design 1), matching the Classic portfolio: deep ink
 * panel, marigold accents, cream paper.
 *
 *  - print (85 × 55 mm): ink panel on the left with the photo and QR code;
 *    name, specialty, degrees and contact rows on the right.
 *  - phone (1080 × 1920): ink header with photo and name, a white contact
 *    panel (phone, clinic, timings, website) and a large QR code.
 *
 * Satori-safe: inline styles, flexbox only, inline <svg> icons (see
 * CardTemplateProps). Rendered as HTML on the card page and as PNG / PDF.
 */

const INK = "#0E3B3C";
const INK_DEEP = "#072627";
const INK_LIGHT = "#155456";
const LAGOON = "#1B6B66";
const PAPER = "#FBF8F3";
const MARIGOLD = "#E3A23B";
const MUTED = "#5D6B6C";
const SAGE = "#DCE8E2";
const LINE = "#E6E1D8";

const INK_GRADIENT = `linear-gradient(160deg, ${INK_LIGHT} 0%, ${INK} 55%, ${INK_DEEP} 100%)`;

// Lucide-style 24px icon paths (stroke only).
const ICONS = {
  phone:
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
  pin: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0zM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  clock: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM12 6v6l4 2",
  globe: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
} as const;

function Icon({ name, size, color }: { name: keyof typeof ICONS; size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}

function QrBlock({ qr, px, radius = 16 }: { qr: CardQr; px: number; radius?: number }) {
  const quiet = 2.5;
  return (
    <div style={{ display: "flex", background: "#FFFFFF", padding: Math.round((px / (qr.size + quiet * 2)) * quiet), borderRadius: radius }}>
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

const shortUrl = (url: string) => url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");

/** Shrink long names so they fit. */
const nameSize = (name: string, base: number) => (name.length > 26 ? Math.round(base * 0.76) : name.length > 20 ? Math.round(base * 0.88) : base);

function Photo({ url, name, size, ring, fonts }: { url?: string; name: string; size: number; ring: number; fonts: CardTemplateProps["fonts"] }) {
  const inner = size - ring * 2;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: 999,
        background: MARIGOLD,
        padding: ring,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: inner, height: inner, borderRadius: 999, background: SAGE, overflow: "hidden" }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- also rendered by Satori
          <img src={url} alt="" width={inner} height={inner} style={{ width: inner, height: inner, borderRadius: 999, objectFit: "cover" }} />
        ) : (
          <div style={{ display: "flex", fontFamily: fonts.display, fontSize: Math.round(inner * 0.36), fontWeight: 600, color: INK }}>{initials(name)}</div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Print: 85 × 55 mm at 300 dpi (1004 × 650)
// ---------------------------------------------------------------------------

function PrintRow({ icon, children, strong }: { icon: keyof typeof ICONS; children: React.ReactNode; strong?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 999, background: SAGE, marginRight: 14 }}>
        <Icon name={icon} size={20} color={INK} />
      </div>
      <div style={{ display: "flex", fontSize: strong ? 24 : 20, fontWeight: strong ? 700 : 400, color: strong ? INK : "#2B3A3B" }}>{children}</div>
    </div>
  );
}

function PrintCard({ doctor: d, qr, fonts, photoUrl, devBanner }: CardTemplateProps) {
  const { width, height } = CARD_SIZE.print;
  const clinic = d.clinics[0];
  const phone = d.phone ?? clinic?.phone;
  const reg = [d.registration.council, d.registration.number].filter(Boolean).join(" · ");
  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: PAPER, color: INK, fontFamily: fonts.body }}>
      {devBanner && <DevBanner name={devBanner} />}
      <div style={{ display: "flex", flex: 1 }}>
        {/* Ink panel: photo + QR */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: 320,
            backgroundImage: INK_GRADIENT,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", position: "absolute", top: -90, right: -90, width: 240, height: 240, borderRadius: 999, border: "2px solid rgba(251,248,243,0.08)" }} />
          <div style={{ display: "flex", position: "absolute", bottom: -70, left: -70, width: 200, height: 200, borderRadius: 999, background: "rgba(227,162,59,0.14)" }} />
          <Photo url={photoUrl} name={d.fullName} size={188} ring={6} fonts={fonts} />
          <div style={{ display: "flex", marginTop: 30 }}>
            <QrBlock qr={qr} px={150} radius={14} />
          </div>
          <div style={{ display: "flex", fontSize: 16, color: "rgba(251,248,243,0.78)", marginTop: 12, letterSpacing: 1 }}>Scan for my website</div>
        </div>

        {/* Details */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "52px 50px 40px 50px" }}>
          <div style={{ display: "flex", fontFamily: fonts.display, fontWeight: 600, fontSize: nameSize(d.fullName, 54), lineHeight: 1.08 }}>{d.fullName}</div>
          <div style={{ display: "flex", width: 64, height: 4, borderRadius: 4, background: MARIGOLD, marginTop: 16, marginBottom: 16 }} />
          {d.primarySpecialty && <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: LAGOON }}>{d.primarySpecialty.name}</div>}
          {d.degreesLine && <div style={{ display: "flex", fontSize: 21, color: MUTED, marginTop: 6 }}>{d.degreesLine}</div>}
          <div style={{ display: "flex", flex: 1 }} />
          {phone && <PrintRow icon="phone" strong>{formatPhone(phone)}</PrintRow>}
          {clinic && (
            <PrintRow icon="pin">
              {clinic.name}, {clinic.area.name}
            </PrintRow>
          )}
          <PrintRow icon="globe">{shortUrl(qr.url)}</PrintRow>
          {reg && <div style={{ display: "flex", fontSize: 15, color: MUTED, marginTop: 18 }}>Reg. {reg}</div>}
        </div>
      </div>
      <div style={{ display: "flex", height: 10, backgroundImage: `linear-gradient(90deg, ${MARIGOLD}, #F0C46F)` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone: 1080 × 1920 (WhatsApp status / share image)
// ---------------------------------------------------------------------------

function PhoneRow({ icon, label, value, last }: { icon: keyof typeof ICONS; label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "26px 0", borderBottom: last ? "none" : `2px solid ${LINE}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 76, height: 76, borderRadius: 999, background: SAGE, marginRight: 28 }}>
        <Icon name={icon} size={38} color={INK} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", fontSize: 24, fontWeight: 600, letterSpacing: 3, color: MUTED }}>{label.toUpperCase()}</div>
        <div style={{ display: "flex", fontSize: 36, fontWeight: 600, color: INK, marginTop: 4, lineHeight: 1.25 }}>{value}</div>
      </div>
    </div>
  );
}

function PhoneCard({ doctor: d, qr, fonts, photoUrl, devBanner }: CardTemplateProps) {
  const { width, height } = CARD_SIZE.phone;
  const clinic = d.clinics[0];
  const phone = d.phone ?? clinic?.phone;
  const hours = clinic ? openDaysSummary(clinic.timings) : "";
  const rows: { icon: keyof typeof ICONS; label: string; value: string }[] = [
    ...(phone ? [{ icon: "phone" as const, label: "Call or WhatsApp", value: formatPhone(phone) }] : []),
    ...(clinic ? [{ icon: "pin" as const, label: clinic.name, value: `${clinic.area.name}, ${clinic.city.name}` }] : []),
    ...(hours ? [{ icon: "clock" as const, label: "Timings", value: hours.length > 70 ? "See my website for timings" : hours }] : []),
  ];
  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: PAPER, color: INK, fontFamily: fonts.body }}>
      {devBanner && <DevBanner name={devBanner} />}

      {/* Ink header */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          height: 940,
          paddingTop: 96,
          backgroundImage: INK_GRADIENT,
          position: "relative",
          overflow: "hidden",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", position: "absolute", top: -220, right: -200, width: 640, height: 640, borderRadius: 999, border: "3px solid rgba(251,248,243,0.07)" }} />
        <div style={{ display: "flex", position: "absolute", top: -120, right: -100, width: 440, height: 440, borderRadius: 999, border: "3px solid rgba(251,248,243,0.07)" }} />
        <div style={{ display: "flex", position: "absolute", bottom: 40, left: -160, width: 420, height: 420, borderRadius: 999, background: "rgba(227,162,59,0.12)" }} />

        <div style={{ display: "flex", fontSize: 26, fontWeight: 600, letterSpacing: 8, color: MARIGOLD }}>DIGITAL VISITING CARD</div>
        <div style={{ display: "flex", marginTop: 56 }}>
          <Photo url={photoUrl} name={d.fullName} size={340} ring={10} fonts={fonts} />
        </div>
        <div style={{ display: "flex", fontFamily: fonts.display, fontWeight: 600, fontSize: nameSize(d.fullName, 86), lineHeight: 1.08, color: PAPER, marginTop: 52 }}>
          {d.fullName}
        </div>
        {d.primarySpecialty && <div style={{ display: "flex", fontSize: 42, fontWeight: 700, color: MARIGOLD, marginTop: 18 }}>{d.primarySpecialty.name}</div>}
        {d.degreesLine && <div style={{ display: "flex", fontSize: 32, color: "rgba(251,248,243,0.78)", marginTop: 12 }}>{d.degreesLine}</div>}
      </div>

      {/* Contact panel, overlapping the header */}
      {/* position: relative keeps the panel above the (positioned) header in HTML previews. */}
      <div style={{ display: "flex", padding: "0 72px", marginTop: -110, position: "relative" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            background: "#FFFFFF",
            borderRadius: 40,
            padding: "18px 48px",
            boxShadow: "0 30px 60px -20px rgba(7,38,39,0.35)",
          }}
        >
          {rows.map((r, i) => (
            <PhoneRow key={r.label} icon={r.icon} label={r.label} value={r.value} last={i === rows.length - 1} />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }} />

      {/* QR */}
      <div style={{ display: "flex", alignItems: "center", padding: "0 96px" }}>
        <div style={{ display: "flex", padding: 10, borderRadius: 28, border: `3px solid ${LINE}`, background: "#FFFFFF" }}>
          <QrBlock qr={qr} px={260} radius={20} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 48, flex: 1 }}>
          <div style={{ display: "flex", fontFamily: fonts.display, fontWeight: 600, fontSize: 48, lineHeight: 1.12 }}>Scan to visit my website</div>
          <div style={{ display: "flex", fontSize: 28, color: MUTED, marginTop: 14, lineHeight: 1.35 }}>Timings, directions and contact in one place.</div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: LAGOON, marginTop: 18 }}>{shortUrl(qr.url)}</div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 100, background: INK_DEEP, color: PAPER, fontSize: 24 }}>
        <div style={{ display: "flex", fontFamily: fonts.display, fontWeight: 600, fontSize: 28 }}>MediReach</div>
        <div style={{ display: "flex", width: 8, height: 8, borderRadius: 999, background: MARIGOLD, marginLeft: 4, marginTop: 10 }} />
        <div style={{ display: "flex", marginLeft: 16, color: "rgba(251,248,243,0.6)" }}>{ROOT_HOSTNAME}</div>
      </div>
    </div>
  );
}

export default function ClassicCard(props: CardTemplateProps) {
  return props.variant === "print" ? <PrintCard {...props} /> : <PhoneCard {...props} />;
}

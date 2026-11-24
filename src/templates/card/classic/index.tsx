import { alpha, DEFAULT_DOCTOR_CARD_STYLE, doctorCardPalette, type DoctorCardPalette } from "@/lib/cards/styles";
import { formatPhone } from "@/lib/phone";
import { ROOT_HOSTNAME } from "@/lib/site";
import { openDaysSummary } from "@/lib/timings";
import { DevBanner } from "@/templates/DevBanner";
import { CARD_SIZE, type CardQr, type CardTemplateProps } from "@/templates/types";

/**
 * Classic visiting card (design 1). Colours come from the doctor's card style
 * code (`cardStyle`, see lib/cards/styles.ts); without one it is the Lagoon
 * style: deep teal panel, amber accents, light paper.
 *
 *  - print (85 × 55 mm): colour panel on the left with the photo and QR code;
 *    name, specialty, degrees and contact rows on the right.
 *  - phone (1080 × 1920): colour header with photo and name, a white
 *    contact panel (phone, clinic, timings, website) and a large QR code.
 *
 * Satori-safe: inline styles, flexbox only, inline <svg> icons (see
 * CardTemplateProps). Rendered as HTML on the card page and as PNG / PDF.
 */

const INK = DEFAULT_DOCTOR_CARD_STYLE.palette.ink;
const MUTED = "#5B6573";
const LINE = "#E5E7EB";

type Palette = DoctorCardPalette;

const panelGradient = (p: Palette) => `linear-gradient(160deg, ${p.panel[0]} 0%, ${p.panel[1]} 55%, ${p.panel[2]} 100%)`;

// Lucide-style 24px icon paths (stroke only).
export const ICONS = {
  phone:
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
  pin: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0zM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  chat: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z",
  user: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
  clock: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM12 6v6l4 2",
  globe: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
} as const;

export function Icon({ name, size, color }: { name: keyof typeof ICONS; size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}

export function QrBlock({ qr, px, radius = 16, color = INK }: { qr: CardQr; px: number; radius?: number; color?: string }) {
  const quiet = 2.5;
  return (
    <div style={{ display: "flex", background: "#FFFFFF", padding: Math.round((px / (qr.size + quiet * 2)) * quiet), borderRadius: radius }}>
      <svg width={px} height={px} viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges">
        <path d={qr.path} fill={color} />
      </svg>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.replace(/^Dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

export const shortUrl = (url: string) => url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");

/** Shrink long names so they fit. */
const nameSize = (name: string, base: number) => (name.length > 26 ? Math.round(base * 0.76) : name.length > 20 ? Math.round(base * 0.88) : base);

function Photo({ url, name, size, ring, fonts, p }: { url?: string; name: string; size: number; ring: number; fonts: CardTemplateProps["fonts"]; p: Palette }) {
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
        background: p.highlight,
        padding: ring,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: inner, height: inner, borderRadius: 999, background: p.soft, overflow: "hidden" }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- also rendered by Satori
          <img src={url} alt="" width={inner} height={inner} style={{ width: inner, height: inner, borderRadius: 999, objectFit: "cover" }} />
        ) : (
          <div style={{ display: "flex", fontFamily: fonts.display, fontSize: Math.round(inner * 0.36), fontWeight: 600, color: p.ink }}>{initials(name)}</div>
        )}
      </div>
    </div>
  );
}

/** Shortened to `max` characters with "…" (card rows have a fixed width). */
export const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/**
 * The doctor's numbers, labelled: "Call or WhatsApp" only when WhatsApp is the
 * same number; else "Call", and a separate "WhatsApp" row when they have one.
 * The call number is the mobile, else the first clinic's phone.
 */
function doctorNumbers(d: CardTemplateProps["doctor"]): { icon: "phone" | "chat"; label: string; value: string }[] {
  const phone = d.phone ?? d.clinics[0]?.phone;
  const wa = d.whatsapp;
  return [
    ...(phone ? [{ icon: "phone" as const, label: wa === phone ? "Call or WhatsApp" : "Call", value: phone }] : []),
    ...(wa && wa !== phone ? [{ icon: "chat" as const, label: "WhatsApp", value: wa }] : []),
  ];
}

/** "General Physician", with the system for anyone not practising allopathy ("Physician · Ayurveda"). */
function specialtyLine(d: CardTemplateProps["doctor"]): string {
  const spec = d.primarySpecialty?.name ?? "";
  const sys = d.systemLabel && !spec.toLowerCase().includes(d.systemLabel.toLowerCase()) ? d.systemLabel : "";
  return [spec, sys].filter(Boolean).join(" · ");
}

// ---------------------------------------------------------------------------
// Print: 85 × 55 mm at 300 dpi (1004 × 650)
// ---------------------------------------------------------------------------

function PrintRow({ icon, children, strong, p, label }: { icon: keyof typeof ICONS; children: React.ReactNode; strong?: boolean; p: Palette; label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 999, background: p.soft, marginRight: 14 }}>
        <Icon name={icon} size={20} color={p.ink} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        {label && <div style={{ display: "flex", fontSize: 16, fontWeight: 600, color: MUTED, marginRight: 10 }}>{label}</div>}
        <div style={{ display: "flex", fontSize: strong ? 24 : 20, fontWeight: strong ? 700 : 400, color: strong ? p.ink : "#2B3A3B" }}>{children}</div>
      </div>
    </div>
  );
}

function PrintCard({ doctor: d, qr, fonts, photoUrl, devBanner }: CardTemplateProps) {
  const { width, height } = CARD_SIZE.print;
  const clinic = d.clinics[0];
  const numbers = doctorNumbers(d);
  // One plain number needs no label; two (or a shared WhatsApp) are labelled.
  const labelled = numbers.length > 1 || numbers.some((n) => n.label !== "Call");
  const reg = [d.registration.council, d.registration.number].filter(Boolean).join(" · ");
  const spec = specialtyLine(d);
  const p = doctorCardPalette(d.cardStyle);
  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: p.paper, color: p.ink, fontFamily: fonts.body }}>
      {devBanner && <DevBanner name={devBanner} />}
      <div style={{ display: "flex", flex: 1 }}>
        {/* Colour panel: photo + QR */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: 320,
            backgroundImage: panelGradient(p),
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", position: "absolute", top: -90, right: -90, width: 240, height: 240, borderRadius: 999, border: "2px solid rgba(255,255,255,0.08)" }} />
          <div style={{ display: "flex", position: "absolute", bottom: -70, left: -70, width: 200, height: 200, borderRadius: 999, background: alpha(p.highlight, 0.14) }} />
          <Photo url={photoUrl} name={d.fullName} size={188} ring={6} fonts={fonts} p={p} />
          <div style={{ display: "flex", marginTop: 30 }}>
            <QrBlock qr={qr} px={150} radius={14} color={p.ink} />
          </div>
          <div style={{ display: "flex", fontSize: 16, color: "rgba(255,255,255,0.8)", marginTop: 12, letterSpacing: 1 }}>Scan for my website</div>
        </div>

        {/* Details */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "52px 50px 40px 50px" }}>
          <div style={{ display: "flex", fontFamily: fonts.display, fontWeight: 600, fontSize: nameSize(d.fullName, 54), lineHeight: 1.08 }}>{d.fullName}</div>
          <div style={{ display: "flex", width: 64, height: 4, borderRadius: 4, background: p.accent, marginTop: 16, marginBottom: 16 }} />
          {spec && <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: p.brand }}>{spec}</div>}
          {d.degreesLine && <div style={{ display: "flex", fontSize: 21, color: MUTED, marginTop: 6 }}>{d.degreesLine}</div>}
          <div style={{ display: "flex", flex: 1 }} />
          {numbers.map((n) => (
            <PrintRow key={n.label} icon={n.icon} strong={n.icon === "phone"} label={labelled ? n.label : undefined} p={p}>
              {formatPhone(n.value)}
            </PrintRow>
          ))}
          {clinic && (
            <PrintRow icon="pin" p={p}>
              {clinic.name}, {clinic.area.name}
            </PrintRow>
          )}
          <PrintRow icon="globe" p={p}>
            {shortUrl(qr.url)}
          </PrintRow>
          {reg && <div style={{ display: "flex", fontSize: 15, color: MUTED, marginTop: 18 }}>Reg. {reg}</div>}
        </div>
      </div>
      <div style={{ display: "flex", height: 10, backgroundImage: `linear-gradient(90deg, ${p.accent}, ${p.accent2})` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone: 1080 × 1920 (WhatsApp status / share image)
// ---------------------------------------------------------------------------

function PhoneRow({ icon, label, value, note, last, tight, p }: { icon: keyof typeof ICONS; label: string; value: string; note?: string; last?: boolean; tight?: boolean; p: Palette }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: tight ? "18px 0" : "26px 0", borderBottom: last ? "none" : `2px solid ${LINE}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 76, height: 76, borderRadius: 999, background: p.soft, marginRight: 28 }}>
        <Icon name={icon} size={38} color={p.ink} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", fontSize: 24, fontWeight: 600, letterSpacing: 3, color: MUTED }}>{label.toUpperCase()}</div>
        <div style={{ display: "flex", fontSize: 36, fontWeight: 600, color: p.ink, marginTop: 4, lineHeight: 1.25 }}>{value}</div>
        {note && <div style={{ display: "flex", fontSize: 28, color: MUTED, marginTop: 6, lineHeight: 1.3 }}>{note}</div>}
      </div>
    </div>
  );
}

function PhoneCard({ doctor: d, qr, fonts, photoUrl, devBanner }: CardTemplateProps) {
  const { width, height } = CARD_SIZE.phone;
  const clinic = d.clinics[0];
  // The second place they see patients (a second clinic, or a hospital they visit), then "+N more".
  const also = d.clinics[1];
  const more = d.clinics.length > 2 ? ` +${d.clinics.length - 2} more` : "";
  const hours = clinic ? openDaysSummary(clinic.timings) : "";
  const note = clinic?.appointmentNote ? clip(clinic.appointmentNote, 48) : undefined;
  const rows: { icon: keyof typeof ICONS; label: string; value: string; note?: string }[] = [
    ...doctorNumbers(d).map((n) => ({ icon: n.icon, label: n.label, value: formatPhone(n.value) })),
    ...(clinic ? [{ icon: "pin" as const, label: clip(clinic.name, 40), value: `${clinic.area.name}, ${clinic.city.name}` }] : []),
    ...(also ? [{ icon: "pin" as const, label: "Also at", value: clip(`${also.name}, ${also.area.name}`, 40 - more.length) + more }] : []),
    ...(hours || note ? [{ icon: "clock" as const, label: "Timings", value: hours ? (hours.length > 70 ? "See my website for timings" : hours) : "Please call for timings", ...(note ? { note } : {}) }] : []),
  ];
  const reg = [d.registration.council, d.registration.number].filter(Boolean).join(" · ");
  const spec = specialtyLine(d);
  // A full card (five rows, or four with a note): tighter rows, a smaller photo and QR so everything fits.
  const tight = rows.length > 4 || (rows.length > 3 && Boolean(note));
  const p = doctorCardPalette(d.cardStyle);
  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: p.paper, color: p.ink, fontFamily: fonts.body }}>
      {devBanner && <DevBanner name={devBanner} />}

      {/* Colour header */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          // The registration line needs a taller header so the contact panel doesn't cover it (a full card has a smaller photo instead).
          height: tight ? 860 : reg ? 990 : 940,
          paddingTop: tight ? 72 : 96,
          backgroundImage: panelGradient(p),
          position: "relative",
          overflow: "hidden",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", position: "absolute", top: -220, right: -200, width: 640, height: 640, borderRadius: 999, border: "3px solid rgba(255,255,255,0.07)" }} />
        <div style={{ display: "flex", position: "absolute", top: -120, right: -100, width: 440, height: 440, borderRadius: 999, border: "3px solid rgba(255,255,255,0.07)" }} />
        <div style={{ display: "flex", position: "absolute", bottom: 40, left: -160, width: 420, height: 420, borderRadius: 999, background: alpha(p.highlight, 0.12) }} />

        <div style={{ display: "flex", fontSize: 26, fontWeight: 600, letterSpacing: 8, color: p.highlight }}>DIGITAL VISITING CARD</div>
        <div style={{ display: "flex", marginTop: tight ? 40 : 56 }}>
          <Photo url={photoUrl} name={d.fullName} size={tight ? 280 : 340} ring={10} fonts={fonts} p={p} />
        </div>
        <div style={{ display: "flex", fontFamily: fonts.display, fontWeight: 600, fontSize: nameSize(d.fullName, 86), lineHeight: 1.08, color: "#FFFFFF", marginTop: tight ? 40 : 52 }}>
          {d.fullName}
        </div>
        {spec && <div style={{ display: "flex", fontSize: 42, fontWeight: 700, color: p.highlight, marginTop: 18 }}>{spec}</div>}
        {d.degreesLine && <div style={{ display: "flex", fontSize: 32, color: "rgba(255,255,255,0.8)", marginTop: 12 }}>{d.degreesLine}</div>}
        {reg && <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.65)", marginTop: 10, padding: "0 60px" }}>Reg. {reg}</div>}
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
            boxShadow: "0 30px 60px -20px rgba(6,34,56,0.35)",
          }}
        >
          {rows.map((r, i) => (
            <PhoneRow key={`${r.label}-${i}`} icon={r.icon} label={r.label} value={r.value} note={r.note} last={i === rows.length - 1} tight={tight} p={p} />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 32 }} />
      {/* QR */}
      <div style={{ display: "flex", alignItems: "center", padding: "0 96px" }}>
        <div style={{ display: "flex", padding: 10, borderRadius: 28, border: `3px solid ${LINE}`, background: "#FFFFFF" }}>
          <QrBlock qr={qr} px={tight ? 220 : 260} radius={20} color={p.ink} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 48, flex: 1 }}>
          <div style={{ display: "flex", fontFamily: fonts.display, fontWeight: 600, fontSize: 48, lineHeight: 1.12 }}>Scan to visit my website</div>
          <div style={{ display: "flex", fontSize: 28, color: MUTED, marginTop: 14, lineHeight: 1.35 }}>Timings, directions and contact in one place.</div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: p.brand, marginTop: 18 }}>{shortUrl(qr.url)}</div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 100, background: p.panel[2], color: "#FFFFFF", fontSize: 24 }}>
        <div style={{ display: "flex", fontFamily: fonts.display, fontWeight: 600, fontSize: 28 }}>MediReach</div>
        <div style={{ display: "flex", width: 8, height: 8, borderRadius: 999, background: p.highlight, marginLeft: 4, marginTop: 10 }} />
        <div style={{ display: "flex", marginLeft: 16, color: "rgba(255,255,255,0.7)" }}>{ROOT_HOSTNAME}</div>
      </div>
    </div>
  );
}

export default function ClassicCard(props: CardTemplateProps) {
  return props.variant === "print" ? <PrintCard {...props} /> : <PhoneCard {...props} />;
}

import { formatPhone } from "@/lib/phone";
import { ROOT_HOSTNAME } from "@/lib/site";
import { openDaysSummary } from "@/lib/timings";
import { DevBanner } from "@/templates/DevBanner";
import { ActionDock, BELOW_DOCK, dockOnHeader, doctorCardActions, printDock, type DockStyle } from "@/templates/card/actions";
import { alpha, clip, Icon, QrBlock, shortUrl, type ICONS } from "@/templates/card/parts";
import { CARD_SIZE, type CardTemplateProps } from "@/templates/types";

/**
 * Visiting card design 1 — "Serene Care", the card that comes with portfolio
 * design 1, in its plum and rose colours.
 *
 *  - print (85 × 55 mm): plum panel on the left with the photo and QR code;
 *    name, specialty, degrees and contact rows on the right.
 *  - phone (1080 × 1920): plum header with photo and name, the one-tap
 *    buttons on its edge, then a white contact panel (phone, clinic,
 *    timings) and the QR code.
 *
 * Satori-safe: inline styles, flexbox only, inline <svg> icons (see
 * CardTemplateProps). Rendered as HTML on the card page and as PNG / PDF.
 */

const MUTED = "#5B6573";
const LINE = "#E5E7EB";

/** Serene Care colours (the website's plum / rose). */
const P = {
  /** Header / side panel gradient: light → mid → deep. */
  panel: ["#74407A", "#55275A", "#38163C"],
  /** On the panel: photo ring, "Digital visiting card" label, specialty. */
  highlight: "#F6A8BC",
  /** On paper: the short bar under the name, and the bottom stripe (to `accent2`). */
  accent: "#E0789A",
  accent2: "#F6C3D1",
  /** Name and icons on paper, QR code. */
  ink: "#55275A",
  /** Specialty and website on paper. */
  brand: "#8E3F84",
  /** Icon bubbles and photo background. */
  soft: "#F5E8F3",
  paper: "#FCF8FB",
} as const;
type Palette = typeof P;

const panelGradient = (p: Palette) => `linear-gradient(160deg, ${p.panel[0]} 0%, ${p.panel[1]} 55%, ${p.panel[2]} 100%)`;

const FOOTER = 100;
/** Phone header height: the same for every doctor, so the buttons on its edge are always in the same place. */
const HEADER = 800;
/** Where the buttons sit on the phone card: on the header's bottom edge, above the contact details (also used for the PDF links). */
export const PHONE_DOCK = dockOnHeader(HEADER);
/** Where the buttons sit on the print card: the free band between the name and the contact rows. */
export const PRINT_DOCK = printDock(370, 954, 300);
const DOCK_STYLE = (fonts: CardTemplateProps["fonts"]): DockStyle => ({
  primaryBg: P.panel[1],
  primaryText: "#FFFFFF",
  tileBg: "#FFFFFF",
  tileText: P.ink,
  iconColor: P.brand,
  border: `2px solid ${P.soft}`,
  radius: 32,
  font: fonts.body,
  shadow: "0 18px 36px -22px rgba(56,22,60,0.45)",
});

function initials(name: string): string {
  const parts = name.replace(/^Dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

/** Shrink long names so they fit. */
const nameSize = (name: string, base: number) =>
  name.length > 28 ? Math.round(base * 0.66) : name.length > 26 ? Math.round(base * 0.76) : name.length > 20 ? Math.round(base * 0.88) : base;

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

/** The clinic's street, area and city ("Shop 4, Karve Road, Kothrud, Pune"); the area once if the street names it. */
function placeLine(c: CardTemplateProps["doctor"]["clinics"][number]): string {
  const street = [c.addressLine1, c.addressLine2].filter(Boolean).join(", ");
  const withArea = street.toLowerCase().includes(c.area.name.toLowerCase()) ? street : [street, c.area.name].filter(Boolean).join(", ");
  return [withArea, c.city.name].filter(Boolean).join(", ");
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

function PrintCard({ doctor: d, qr, fonts, photoUrl, devBanner, links }: CardTemplateProps) {
  const { width, height } = CARD_SIZE.print;
  const clinic = d.clinics[0];
  const numbers = doctorNumbers(d);
  // One plain number needs no label; two (or a shared WhatsApp) are labelled.
  const labelled = numbers.length > 1 || numbers.some((n) => n.label !== "Call");
  const reg = [d.registration.council, d.registration.number].filter(Boolean).join(" · ");
  const spec = specialtyLine(d);
  const p = P;
  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: p.paper, color: p.ink, fontFamily: fonts.body, position: "relative" }}>
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
          {d.degreesLine && <div style={{ display: "flex", fontSize: 21, color: MUTED, marginTop: 6 }}>{clip(d.degreesLine, 50)}</div>}
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
      {/* Buttons, at a fixed place in the free band (the print PDF puts links on them). */}
      <ActionDock actions={doctorCardActions(d)} dock={PRINT_DOCK} style={DOCK_STYLE(fonts)} links={links} small />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone: 1080 × 1920 (WhatsApp status / share image)
// ---------------------------------------------------------------------------

function PhoneRow({ icon, label, value, note, last, tight, p }: { icon: keyof typeof ICONS; label: string; value: string; note?: string; last?: boolean; tight?: boolean; p: Palette }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: tight ? "13px 0" : "24px 0", borderBottom: last ? "none" : `2px solid ${LINE}` }}>
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

function PhoneCard({ doctor: d, qr, fonts, photoUrl, devBanner, links }: CardTemplateProps) {
  const { width, height } = CARD_SIZE.phone;
  const clinic = d.clinics[0];
  // The second place they see patients (a second clinic, or a hospital they visit), then "+N more".
  const also = d.clinics[1];
  const more = d.clinics.length > 2 ? ` +${d.clinics.length - 2} more` : "";
  const hours = clinic ? openDaysSummary(clinic.timings) : "";
  const note = clinic?.appointmentNote ? clip(clinic.appointmentNote, 48) : undefined;
  const rows: { icon: keyof typeof ICONS; label: string; value: string; note?: string; place?: boolean }[] = [
    ...doctorNumbers(d).map((n) => ({ icon: n.icon, label: n.label, value: formatPhone(n.value) })),
    ...(clinic ? [{ icon: "pin" as const, label: clip(clinic.name, 40), value: placeLine(clinic), place: true }] : []),
    ...(also ? [{ icon: "pin" as const, label: "Also at", value: clip(`${also.name}, ${also.area.name}`, 40 - more.length) + more }] : []),
    ...(hours || note ? [{ icon: "clock" as const, label: "Timings", value: hours ? (hours.length > 70 ? "See my website for timings" : hours) : "Please call for timings", ...(note ? { note } : {}) }] : []),
  ];
  const reg = [d.registration.council, d.registration.number].filter(Boolean).join(" · ");
  const spec = specialtyLine(d);
  // A full card (five rows, or four with a note) keeps the clinic to its area and city; otherwise the street is shown too.
  const full = rows.length > 4 || (rows.length > 3 && Boolean(note));
  if (full) for (const r of rows) if (r.place && clinic) r.value = `${clinic.area.name}, ${clinic.city.name}`;
  // Tighter rows and a smaller photo and QR when full, or when four rows include a street that wraps.
  const tight = full || (rows.length > 3 && rows.some((r) => r.place && r.value.length > 40));
  const p = P;
  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: p.paper, color: p.ink, fontFamily: fonts.body, position: "relative" }}>
      {devBanner && <DevBanner name={devBanner} />}

      {/* Colour header */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          // One height for every card (the buttons sit on its edge); a full card has a smaller photo instead.
          height: HEADER,
          paddingTop: tight ? 56 : 66,
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
        <div style={{ display: "flex", marginTop: tight ? 30 : 40 }}>
          <Photo url={photoUrl} name={d.fullName} size={tight ? 210 : 250} ring={10} fonts={fonts} p={p} />
        </div>
        <div style={{ display: "flex", fontFamily: fonts.display, fontWeight: 600, fontSize: nameSize(d.fullName, 86), lineHeight: 1.08, color: "#FFFFFF", marginTop: tight ? 26 : 34 }}>
          {d.fullName}
        </div>
        {spec && <div style={{ display: "flex", fontSize: 42, fontWeight: 700, color: p.highlight, marginTop: 18 }}>{spec}</div>}
        {d.degreesLine && <div style={{ display: "flex", fontSize: 32, color: "rgba(255,255,255,0.8)", marginTop: 12, padding: "0 60px" }}>{clip(d.degreesLine, 54)}</div>}
        {reg && <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.65)", marginTop: 10, padding: "0 60px" }}>Reg. {reg}</div>}
      </div>

      {/* Contact panel, under the buttons with clear space */}
      <div style={{ display: "flex", padding: "0 72px", marginTop: BELOW_DOCK }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            background: "#FFFFFF",
            borderRadius: 40,
            padding: tight ? "10px 48px" : "16px 48px",
            boxShadow: "0 30px 60px -20px rgba(6,34,56,0.35)",
          }}
        >
          {rows.map((r, i) => (
            <PhoneRow key={`${r.label}-${i}`} icon={r.icon} label={r.label} value={r.value} note={r.note} last={i === rows.length - 1} tight={tight} p={p} />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 18 }} />
      {/* QR */}
      <div style={{ display: "flex", alignItems: "center", padding: "0 96px" }}>
        <div style={{ display: "flex", padding: 8, borderRadius: 26, border: `3px solid ${LINE}`, background: "#FFFFFF" }}>
          <QrBlock qr={qr} px={tight ? 128 : 190} radius={18} color={p.ink} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 44, flex: 1 }}>
          <div style={{ display: "flex", fontFamily: fonts.display, fontWeight: 600, fontSize: 44, lineHeight: 1.12 }}>Scan to visit my website</div>
          <div style={{ display: "flex", fontSize: 27, color: MUTED, marginTop: 10, lineHeight: 1.35 }}>Timings, directions and contact in one place.</div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: p.brand, marginTop: 12 }}>{shortUrl(qr.url)}</div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 18 }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: FOOTER, background: p.panel[2], color: "#FFFFFF", fontSize: 24 }}>
        <div style={{ display: "flex", fontFamily: fonts.display, fontWeight: 600, fontSize: 28 }}>MediReach</div>
        <div style={{ display: "flex", width: 8, height: 8, borderRadius: 999, background: p.highlight, marginLeft: 4, marginTop: 10 }} />
        <div style={{ display: "flex", marginLeft: 16, color: "rgba(255,255,255,0.7)" }}>{ROOT_HOSTNAME}</div>
      </div>
      {/* Buttons on the header's edge, at a fixed place (the PDF links line up with them). Last, so they draw on top. */}
      <ActionDock actions={doctorCardActions(d)} dock={PHONE_DOCK} style={DOCK_STYLE(fonts)} links={links} />
    </div>
  );
}

export default function ClassicCard(props: CardTemplateProps) {
  return props.variant === "print" ? <PrintCard {...props} /> : <PhoneCard {...props} />;
}

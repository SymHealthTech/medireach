import { formatPhone } from "@/lib/phone";
import { ROOT_HOSTNAME } from "@/lib/site";
import { openDaysSummary } from "@/lib/timings";
import { clip, Icon, QrBlock, shortUrl, type ICONS } from "@/templates/card/parts";
import { DevBanner } from "@/templates/DevBanner";
import { ActionDock, DOCK_SPACE, dockAboveFooter, doctorCardActions, printDock, type DockStyle } from "@/templates/card/actions";
import { CARD_SIZE, type CardTemplateProps } from "@/templates/types";

/**
 * Visiting card design 5 — "Specialist Pro", matching portfolio design 5:
 * white with a deep slate panel, crimson accents and a heartbeat line.
 *
 *  - print (85 × 55 mm): slate panel on the left with the photo and QR code,
 *    name, specialty and contact rows on white.
 *  - phone (1080 × 1920): slate header with photo and credentials, white
 *    contact rows, crimson QR panel and the one-tap buttons.
 *
 * Satori-safe: inline styles, flexbox only, <img> and inline <svg>.
 */

const SLATE = "#0F1B2D";
const SLATE_2 = "#1A2A42";
const CRIMSON = "#C21E3A";
const ROSE = "#FDA4AF";
const ICE = "#F3F6FA";
const TEXT = "#142033";
const MUTED = "#5A6A7F";
const LINE = "#E0E6EE";

const FOOTER = 96;
/** Where the buttons sit on the phone card (also used for the PDF links). */
export const PHONE_DOCK = dockAboveFooter(FOOTER, 80);
/** Where the buttons sit on the print card: the free band between the name and the contact rows. */
export const PRINT_DOCK = printDock(338, 946, 226);
const DOCK_STYLE = (fonts: CardTemplateProps["fonts"]): DockStyle => ({
  primaryBg: CRIMSON,
  primaryText: "#FFFFFF",
  tileBg: ICE,
  tileText: SLATE,
  iconColor: CRIMSON,
  radius: 24,
  font: fonts.body,
});

function initials(name: string): string {
  const parts = name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

const nameSize = (name: string, base: number) => (name.length > 26 ? Math.round(base * 0.74) : name.length > 20 ? Math.round(base * 0.86) : base);

function Ecg({ width, height, color, opacity }: { width: number; height: number; color: string; opacity: number }) {
  const m = height / 2;
  const w = width;
  const d = `M0 ${m} H${w * 0.4} L${w * 0.43} ${m} L${w * 0.45} ${m - height * 0.42} L${w * 0.48} ${m + height * 0.45} L${w * 0.5} ${m - height * 0.2} L${w * 0.52} ${m} H${w}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ opacity }}>
      <path d={d} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Photo({ url, name, size, radius, fonts }: { url?: string; name: string; size: number; radius: number; fonts: CardTemplateProps["fonts"] }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: radius,
        overflow: "hidden",
        background: SLATE_2,
        border: "4px solid rgba(255,255,255,0.25)",
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- also rendered by Satori
        <img src={url} alt="" width={size} height={size} style={{ width: size, height: size, objectFit: "cover", objectPosition: "top" }} />
      ) : (
        <div style={{ display: "flex", fontFamily: fonts.body, fontWeight: 700, fontSize: Math.round(size * 0.32), color: "rgba(255,255,255,0.5)" }}>{initials(name)}</div>
      )}
    </div>
  );
}

function numbers(d: CardTemplateProps["doctor"]): { icon: "phone" | "chat"; label: string; value: string }[] {
  const phone = d.phone ?? d.clinics[0]?.phone;
  const wa = d.whatsapp;
  return [
    ...(phone ? [{ icon: "phone" as const, label: wa === phone ? "Call / WhatsApp" : "Call", value: phone }] : []),
    ...(wa && wa !== phone ? [{ icon: "chat" as const, label: "WhatsApp", value: wa }] : []),
  ];
}

function specialtyLine(d: CardTemplateProps["doctor"]): string {
  const spec = d.primarySpecialty?.name ?? "";
  const sys = d.systemLabel && !spec.toLowerCase().includes(d.systemLabel.toLowerCase()) ? d.systemLabel : "";
  return [spec, sys].filter(Boolean).join(" · ");
}

// Print: 1004 × 650

function Row({ icon, children, strong }: { icon: keyof typeof ICONS; children: React.ReactNode; strong?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginTop: 12 }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, background: strong ? CRIMSON : ICE, marginRight: 14 }}
      >
        <Icon name={icon} size={19} color={strong ? "#FFFFFF" : SLATE} />
      </div>
      <div style={{ display: "flex", fontSize: strong ? 26 : 19, fontWeight: strong ? 700 : 400, color: strong ? SLATE : TEXT }}>{children}</div>
    </div>
  );
}

function PrintCard({ doctor: d, qr, fonts, photoUrl, devBanner, links }: CardTemplateProps) {
  const { width, height } = CARD_SIZE.print;
  const clinic = d.clinics[0];
  const reg = [d.registration.council, d.registration.number].filter(Boolean).join(" · ");
  const spec = specialtyLine(d);
  return (
    <div style={{ width, height, display: "flex", background: "#FFFFFF", color: TEXT, fontFamily: fonts.body, position: "relative" }}>
      {devBanner && <DevBanner name={devBanner} />}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          width: 290,
          padding: "46px 0 40px",
          background: SLATE,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", position: "absolute", left: 0, top: 290 }}>
          <Ecg width={290} height={70} color={ROSE} opacity={0.35} />
        </div>
        <Photo url={photoUrl} name={d.fullName} size={190} radius={28} fonts={fonts} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", padding: 6, background: "#FFFFFF", borderRadius: 14 }}>
            <QrBlock qr={qr} px={120} radius={8} color={SLATE} />
          </div>
          <div style={{ display: "flex", fontSize: 14, fontWeight: 700, color: ROSE, marginTop: 8, letterSpacing: 1 }}>SCAN TO BOOK</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "48px 48px 36px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", width: 34, height: 6, borderRadius: 4, background: CRIMSON, marginRight: 12 }} />
          {spec && <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: CRIMSON, letterSpacing: 1 }}>{clip(spec, 34)}</div>}
        </div>
        <div style={{ display: "flex", fontSize: nameSize(d.fullName, 50), fontWeight: 700, color: SLATE, lineHeight: 1.04, marginTop: 14, letterSpacing: -1 }}>{d.fullName}</div>
        {d.degreesLine && <div style={{ display: "flex", fontSize: 18, color: MUTED, marginTop: 10 }}>{clip(d.degreesLine, 50)}</div>}
        <div style={{ display: "flex", flex: 1 }} />
        {numbers(d).map((n) => (
          <Row key={n.label} icon={n.icon} strong={n.icon === "phone"}>
            {formatPhone(n.value)}
          </Row>
        ))}
        {clinic && <Row icon="pin">{clip(`${clinic.name}, ${clinic.area.name}, ${clinic.city.name}`, 42)}</Row>}
        {clinic && openDaysSummary(clinic.timings) && <Row icon="clock">{clip(openDaysSummary(clinic.timings).split(" | ")[0] ?? "", 42)}</Row>}
        <Row icon="globe">{clip(shortUrl(qr.url), 40)}</Row>
        {reg && <div style={{ display: "flex", fontSize: 14, color: MUTED, marginTop: 14 }}>Reg. {clip(reg, 62)}</div>}
      </div>
      <div style={{ display: "flex", position: "absolute", right: 0, top: 0, width: 10, height, background: CRIMSON }} />
      {/* Buttons, at a fixed place in the free band (the print PDF puts links on them). */}
      <ActionDock actions={doctorCardActions(d)} dock={PRINT_DOCK} style={DOCK_STYLE(fonts)} links={links} small />
    </div>
  );
}

// Phone: 1080 × 1920

function PhoneRow({ icon, label, value, last }: { icon: keyof typeof ICONS; label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "18px 0", borderBottom: last ? "none" : `2px solid ${LINE}` }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 78,
          height: 78,
          borderRadius: 22,
          background: icon === "phone" ? CRIMSON : ICE,
          marginRight: 28,
        }}
      >
        <Icon name={icon} size={36} color={icon === "phone" ? "#FFFFFF" : SLATE} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", fontSize: 23, fontWeight: 700, letterSpacing: 3, color: MUTED }}>{label.toUpperCase()}</div>
        <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: SLATE, marginTop: 4, lineHeight: 1.25 }}>{value}</div>
      </div>
    </div>
  );
}

function PhoneCard({ doctor: d, qr, fonts, photoUrl, devBanner, links }: CardTemplateProps) {
  const { width, height } = CARD_SIZE.phone;
  const clinic = d.clinics[0];
  const hours = clinic ? (openDaysSummary(clinic.timings).split(" | ")[0] ?? "") : "";
  const rows: { icon: keyof typeof ICONS; label: string; value: string }[] = [
    ...numbers(d).map((n) => ({ icon: n.icon, label: n.label, value: formatPhone(n.value) })),
    ...(clinic ? [{ icon: "pin" as const, label: clip(clinic.name, 34), value: clip(`${clinic.area.name}, ${clinic.city.name}`, 40) }] : []),
    ...(hours ? [{ icon: "clock" as const, label: "Clinic hours", value: clip(hours, 44) }] : []),
  ].slice(0, 4);
  const reg = [d.registration.council, d.registration.number].filter(Boolean).join(" · ");
  const spec = specialtyLine(d);
  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: "#FFFFFF", color: TEXT, fontFamily: fonts.body, position: "relative" }}>
      {devBanner && <DevBanner name={devBanner} />}
      <div style={{ display: "flex", flexDirection: "column", height: 820, padding: "70px 80px 0", background: SLATE, position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", position: "absolute", left: 0, top: 440 }}>
          <Ecg width={1080} height={160} color={ROSE} opacity={0.3} />
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", width: 54, height: 8, borderRadius: 4, background: CRIMSON, marginRight: 20 }} />
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 7, color: ROSE }}>DIGITAL VISITING CARD</div>
        </div>
        <div style={{ display: "flex", marginTop: 44 }}>
          <Photo url={photoUrl} name={d.fullName} size={300} radius={48} fonts={fonts} />
        </div>
        <div style={{ display: "flex", fontWeight: 700, fontSize: nameSize(d.fullName, 84), lineHeight: 1.04, color: "#FFFFFF", marginTop: 44, letterSpacing: -2 }}>
          {d.fullName}
        </div>
        {spec && <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: ROSE, marginTop: 16 }}>{spec}</div>}
        {d.degreesLine && <div style={{ display: "flex", fontSize: 29, color: "rgba(255,255,255,0.78)", marginTop: 12 }}>{clip(d.degreesLine, 56)}</div>}
        {reg && <div style={{ display: "flex", fontSize: 23, color: "rgba(255,255,255,0.5)", marginTop: 10 }}>Reg. {clip(reg, 60)}</div>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", padding: "14px 80px" }}>
        {rows.map((r, i) => (
          <PhoneRow key={`${r.label}-${i}`} icon={r.icon} label={r.label} value={r.value} last={i === rows.length - 1} />
        ))}
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 20 }} />
      <div style={{ display: "flex", alignItems: "center", margin: "0 80px", padding: 28, background: CRIMSON, borderRadius: 32 }}>
        <div style={{ display: "flex", padding: 8, background: "#FFFFFF", borderRadius: 20 }}>
          <QrBlock qr={qr} px={170} radius={14} color={SLATE} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 36, flex: 1 }}>
          <div style={{ display: "flex", fontWeight: 700, fontSize: 44, lineHeight: 1.08, color: "#FFFFFF" }}>Scan to visit my website</div>
          <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.85)", marginTop: 10, lineHeight: 1.35 }}>Timings, directions and appointment requests.</div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: "#FFFFFF", marginTop: 12 }}>{clip(shortUrl(qr.url), 34)}</div>
        </div>
      </div>
      <div style={{ display: "flex", flex: 1, minHeight: 20 }} />
      {/* Room for the buttons (drawn at a fixed place, so the PDF links line up). */}
      <div style={{ display: "flex", height: DOCK_SPACE }} />
      <ActionDock actions={doctorCardActions(d)} dock={PHONE_DOCK} style={DOCK_STYLE(fonts)} links={links} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: FOOTER, background: SLATE, color: "#FFFFFF", fontSize: 24 }}>
        <div style={{ display: "flex", fontWeight: 700, fontSize: 28 }}>MediReach</div>
        <div style={{ display: "flex", marginLeft: 16, color: "rgba(255,255,255,0.6)" }}>{ROOT_HOSTNAME}</div>
      </div>
    </div>
  );
}

export default function CardT5(props: CardTemplateProps) {
  return props.variant === "print" ? <PrintCard {...props} /> : <PhoneCard {...props} />;
}

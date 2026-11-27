import { formatPhone } from "@/lib/phone";
import { ROOT_HOSTNAME } from "@/lib/site";
import { openDaysSummary } from "@/lib/timings";
import { clip, Icon, QrBlock, shortUrl, type ICONS } from "@/templates/card/parts";
import { DevBanner } from "@/templates/DevBanner";
import { ActionDock, DOCK_SPACE, dockAboveFooter, doctorCardActions, type DockStyle } from "@/templates/card/actions";
import { CARD_SIZE, type CardTemplateProps } from "@/templates/types";

/**
 * Visiting card design 2 — "Clinic Modern", the card that matches portfolio
 * design 2: a deep navy header with a teal heartbeat line, a rounded-square
 * photo, white contact rows and a QR code that opens the doctor's website.
 *
 *  - print (85 × 55 mm): navy band with name and specialty over white; photo
 *    and QR code down the right; contact rows bottom left.
 *  - phone (1080 × 1920): tall navy header with a large photo, white contact
 *    panel overlapping it, the QR code and the one-tap buttons.
 *
 * Satori-safe: inline styles, flexbox only, <img> and inline <svg>.
 * Body font only (bold Jakarta), so it reads as one family with the website.
 */

const NAVY = "#0B2545";
const NAVY_2 = "#13315C";
const TEAL = "#0D9488";
const TEAL_LIGHT = "#5EEAD4";
const BLUE = "#1F6FD1";
const TEXT = "#1C2A3A";
const MUTED = "#5A6B80";
const LINE = "#DFE7F1";
const SKY = "#F3F8FD";
const MINT = "#E7F6F3";

const band = `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_2} 70%, #164A7A 100%)`;

const FOOTER = 96;
/** Where the buttons sit on the phone card (also used for the PDF links). */
export const PHONE_DOCK = dockAboveFooter(FOOTER, 70);
const DOCK_STYLE = (fonts: CardTemplateProps["fonts"]): DockStyle => ({
  primaryBg: TEAL,
  primaryText: "#FFFFFF",
  tileBg: "#FFFFFF",
  tileText: NAVY,
  iconColor: BLUE,
  border: `2px solid ${LINE}`,
  radius: 30,
  font: fonts.body,
  shadow: "0 18px 36px -24px rgba(11,37,69,0.45)",
});

function initials(name: string): string {
  const parts = name.replace(/^Dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

const nameSize = (name: string, base: number) => (name.length > 26 ? Math.round(base * 0.74) : name.length > 20 ? Math.round(base * 0.86) : base);

/** Heartbeat line, drawn across a band. */
function Ecg({ width, height, color, opacity }: { width: number; height: number; color: string; opacity: number }) {
  const mid = height / 2;
  const w = width;
  const d = `M0 ${mid} H${w * 0.52} L${w * 0.55} ${mid} L${w * 0.57} ${mid - height * 0.38} L${w * 0.6} ${mid + height * 0.42} L${w * 0.63} ${mid - height * 0.22} L${w * 0.65} ${mid} H${w}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ opacity }}>
      <path d={d} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Photo({ url, name, size, radius, border, fonts }: { url?: string; name: string; size: number; radius: number; border: number; fonts: CardTemplateProps["fonts"] }) {
  const inner = size - border * 2;
  return (
    <div style={{ display: "flex", width: size, height: size, borderRadius: radius, background: "#FFFFFF", padding: border, boxShadow: "0 24px 48px -20px rgba(11,37,69,0.45)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: inner, height: inner, borderRadius: radius - border, background: MINT, overflow: "hidden" }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- also rendered by Satori
          <img src={url} alt="" width={inner} height={inner} style={{ width: inner, height: inner, objectFit: "cover", objectPosition: "top" }} />
        ) : (
          <div style={{ display: "flex", fontFamily: fonts.body, fontWeight: 700, fontSize: Math.round(inner * 0.34), color: NAVY }}>{initials(name)}</div>
        )}
      </div>
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

// ---------------------------------------------------------------------------
// Print: 1004 × 650
// ---------------------------------------------------------------------------

function Row({ icon, children, strong }: { icon: keyof typeof ICONS; children: React.ReactNode; strong?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 12, background: strong ? TEAL : SKY, marginRight: 14 }}>
        <Icon name={icon} size={20} color={strong ? "#FFFFFF" : NAVY} />
      </div>
      <div style={{ display: "flex", fontSize: strong ? 27 : 20, fontWeight: strong ? 700 : 400, color: strong ? NAVY : TEXT }}>{children}</div>
    </div>
  );
}

function PrintCard({ doctor: d, qr, fonts, photoUrl, devBanner }: CardTemplateProps) {
  const { width, height } = CARD_SIZE.print;
  const clinic = d.clinics[0];
  const nums = numbers(d);
  const reg = [d.registration.council, d.registration.number].filter(Boolean).join(" · ");
  const spec = specialtyLine(d);
  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: "#FFFFFF", color: TEXT, fontFamily: fonts.body, position: "relative" }}>
      {devBanner && <DevBanner name={devBanner} />}
      {/* Navy band */}
      <div style={{ display: "flex", flexDirection: "column", height: 250, padding: "48px 0 0 56px", backgroundImage: band, position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", position: "absolute", left: 0, top: 150 }}>
          <Ecg width={1004} height={90} color={TEAL_LIGHT} opacity={0.35} />
        </div>
        <div style={{ display: "flex", position: "absolute", right: -120, top: -140, width: 360, height: 360, borderRadius: 999, border: "2px solid rgba(255,255,255,0.08)" }} />
        <div style={{ display: "flex", fontSize: nameSize(d.fullName, 52), fontWeight: 700, color: "#FFFFFF", lineHeight: 1.05, maxWidth: 640 }}>{d.fullName}</div>
        {spec && <div style={{ display: "flex", fontSize: 27, fontWeight: 600, color: TEAL_LIGHT, marginTop: 12 }}>{spec}</div>}
        {d.degreesLine && <div style={{ display: "flex", fontSize: 19, color: "rgba(255,255,255,0.75)", marginTop: 8, maxWidth: 640 }}>{clip(d.degreesLine, 58)}</div>}
      </div>

      {/* Photo, overlapping the band */}
      <div style={{ display: "flex", position: "absolute", right: 56, top: devBanner ? 74 : 44 }}>
        <Photo url={photoUrl} name={d.fullName} size={196} radius={40} border={8} fonts={fonts} />
      </div>

      {/* Contact rows + QR */}
      <div style={{ display: "flex", flex: 1, padding: "16px 56px 30px 56px" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          {nums.map((n) => (
            <Row key={n.label} icon={n.icon} strong={n.icon === "phone"}>
              {formatPhone(n.value)}
            </Row>
          ))}
          {clinic && <Row icon="pin">{clip(`${clinic.name}, ${clinic.area.name}, ${clinic.city.name}`, 46)}</Row>}
          <Row icon="globe">{shortUrl(qr.url)}</Row>
          {reg && <div style={{ display: "flex", fontSize: 15, color: MUTED, marginTop: 16 }}>Reg. {reg}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", width: 196 }}>
          <div style={{ display: "flex", padding: 6, borderRadius: 18, border: `2px solid ${LINE}` }}>
            <QrBlock qr={qr} px={136} radius={12} color={NAVY} />
          </div>
          <div style={{ display: "flex", fontSize: 15, fontWeight: 600, color: TEAL, marginTop: 8, letterSpacing: 0.5 }}>Scan to book a visit</div>
        </div>
      </div>
      <div style={{ display: "flex", height: 10, backgroundImage: `linear-gradient(90deg, ${TEAL}, ${BLUE})` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone: 1080 × 1920
// ---------------------------------------------------------------------------

function PhoneRow({ icon, label, value, last }: { icon: keyof typeof ICONS; label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "24px 0", borderBottom: last ? "none" : `2px solid ${LINE}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 80, height: 80, borderRadius: 24, background: icon === "phone" ? TEAL : SKY, marginRight: 28 }}>
        <Icon name={icon} size={38} color={icon === "phone" ? "#FFFFFF" : NAVY} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", fontSize: 24, fontWeight: 600, letterSpacing: 3, color: MUTED }}>{label.toUpperCase()}</div>
        <div style={{ display: "flex", fontSize: 36, fontWeight: 600, color: NAVY, marginTop: 4, lineHeight: 1.25 }}>{value}</div>
      </div>
    </div>
  );
}

function PhoneCard({ doctor: d, qr, fonts, photoUrl, devBanner, links }: CardTemplateProps) {
  const { width, height } = CARD_SIZE.phone;
  const clinic = d.clinics[0];
  const hours = clinic ? openDaysSummary(clinic.timings).split(" | ")[0] ?? "" : "";
  const rows: { icon: keyof typeof ICONS; label: string; value: string }[] = [
    ...numbers(d).map((n) => ({ icon: n.icon, label: n.label, value: formatPhone(n.value) })),
    ...(clinic ? [{ icon: "pin" as const, label: clip(clinic.name, 40), value: clip(`${clinic.area.name}, ${clinic.city.name}`, 40) }] : []),
    ...(hours ? [{ icon: "clock" as const, label: "Clinic hours", value: clip(hours, 44) }] : []),
  ].slice(0, 4);
  const reg = [d.registration.council, d.registration.number].filter(Boolean).join(" · ");
  const spec = specialtyLine(d);
  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: "#FFFFFF", color: TEXT, fontFamily: fonts.body, position: "relative" }}>
      {devBanner && <DevBanner name={devBanner} />}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: 850, paddingTop: 66, backgroundImage: band, position: "relative", overflow: "hidden", textAlign: "center" }}>
        <div style={{ display: "flex", position: "absolute", top: -260, right: -220, width: 700, height: 700, borderRadius: 999, border: "3px solid rgba(255,255,255,0.07)" }} />
        <div style={{ display: "flex", position: "absolute", top: 380, left: -260, width: 560, height: 560, borderRadius: 999, background: "rgba(13,148,136,0.16)" }} />
        <div style={{ display: "flex", position: "absolute", left: 0, top: 300 }}>
          <Ecg width={1080} height={160} color={TEAL_LIGHT} opacity={0.3} />
        </div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 26, fontWeight: 600, letterSpacing: 8, color: TEAL_LIGHT }}>DIGITAL VISITING CARD</div>
        <div style={{ display: "flex", marginTop: 40 }}>
          <Photo url={photoUrl} name={d.fullName} size={280} radius={56} border={10} fonts={fonts} />
        </div>
        <div style={{ display: "flex", fontWeight: 700, fontSize: nameSize(d.fullName, 82), lineHeight: 1.08, color: "#FFFFFF", marginTop: 36 }}>{d.fullName}</div>
        {spec && <div style={{ display: "flex", fontSize: 42, fontWeight: 600, color: TEAL_LIGHT, marginTop: 16 }}>{spec}</div>}
        {d.degreesLine && <div style={{ display: "flex", fontSize: 30, color: "rgba(255,255,255,0.8)", marginTop: 12, padding: "0 70px" }}>{clip(d.degreesLine, 60)}</div>}
        {reg && <div style={{ display: "flex", fontSize: 25, color: "rgba(255,255,255,0.6)", marginTop: 10, padding: "0 60px" }}>Reg. {reg}</div>}
      </div>

      <div style={{ display: "flex", padding: "0 70px", marginTop: -120, position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", background: "#FFFFFF", borderRadius: 44, padding: "14px 48px", boxShadow: "0 30px 70px -24px rgba(11,37,69,0.45)" }}>
          {rows.map((r, i) => (
            <PhoneRow key={`${r.label}-${i}`} icon={r.icon} label={r.label} value={r.value} last={i === rows.length - 1} />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 24 }} />
      <div style={{ display: "flex", alignItems: "center", margin: "0 70px", padding: 28, borderRadius: 40, background: SKY }}>
        <div style={{ display: "flex", padding: 10, borderRadius: 26, background: "#FFFFFF" }}>
          <QrBlock qr={qr} px={180} radius={18} color={NAVY} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 40, flex: 1 }}>
          <div style={{ display: "flex", fontWeight: 700, fontSize: 42, lineHeight: 1.12, color: NAVY }}>Scan to visit my website</div>
          <div style={{ display: "flex", fontSize: 27, color: MUTED, marginTop: 10, lineHeight: 1.35 }}>Timings, directions and appointment requests.</div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: TEAL, marginTop: 12 }}>{shortUrl(qr.url)}</div>
        </div>
      </div>
      <div style={{ display: "flex", flex: 1, minHeight: 24 }} />
      {/* Room for the buttons (drawn at a fixed place, so the PDF links line up). */}
      <div style={{ display: "flex", height: DOCK_SPACE }} />
      <ActionDock actions={doctorCardActions(d)} dock={PHONE_DOCK} style={DOCK_STYLE(fonts)} links={links} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: FOOTER, background: NAVY, color: "#FFFFFF", fontSize: 24 }}>
        <div style={{ display: "flex", fontWeight: 700, fontSize: 28 }}>MediReach</div>
        <div style={{ display: "flex", marginLeft: 16, color: "rgba(255,255,255,0.65)" }}>{ROOT_HOSTNAME}</div>
      </div>
    </div>
  );
}

export default function CardT2(props: CardTemplateProps) {
  return props.variant === "print" ? <PrintCard {...props} /> : <PhoneCard {...props} />;
}

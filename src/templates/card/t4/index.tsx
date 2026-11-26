import { formatPhone } from "@/lib/phone";
import { ROOT_HOSTNAME } from "@/lib/site";
import { openDaysSummary } from "@/lib/timings";
import { clip, Icon, QrBlock, shortUrl, type ICONS } from "@/templates/card/classic";
import { DevBanner } from "@/templates/DevBanner";
import { CARD_SIZE, type CardTemplateProps } from "@/templates/types";

/**
 * Visiting card design 4 — "Warm Heritage", matching portfolio design 4:
 * cream paper inside a forest-green double frame, a round photo with a
 * saffron ring and a line mandala, terracotta details and a Fraunces name.
 *
 *  - print (85 × 55 mm): photo and mandala on the left, name and contact rows
 *    in the middle, QR code on the right.
 *  - phone (1080 × 1920): forest header with the round photo inside a
 *    mandala, cream contact panel, QR code in a framed box.
 *
 * Satori-safe: inline styles, flexbox only, <img> and inline <svg>.
 */

const FOREST = "#1F4A3A";
const TERRA = "#B4522C";
const SAFFRON = "#E0A33A";
const CREAM = "#FBF5EA";
const PAPER = "#F4EBDB";
const TEXT = "#2B2620";
const MUTED = "#6D6252";
const LINE = "#E5D7BF";

function initials(name: string): string {
  const parts = name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

const nameSize = (name: string, base: number) => (name.length > 26 ? Math.round(base * 0.74) : name.length > 20 ? Math.round(base * 0.86) : base);

function Mandala({ size, color, opacity = 1 }: { size: number; color: string; opacity?: number }) {
  const petals = (n: number, r: number, rx: number, ry: number) =>
    Array.from({ length: n }, (_, i) => <ellipse key={`${r}-${i}`} cx="0" cy={-r} rx={rx} ry={ry} transform={`rotate(${(360 / n) * i})`} />);
  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" style={{ opacity }}>
      <g fill="none" stroke={color} strokeWidth="1.4">
        <circle r="70" />
        <circle r="94" />
        {petals(16, 80, 6, 13)}
        {petals(24, 94, 3, 6)}
      </g>
    </svg>
  );
}

function Photo({ url, name, size, fonts }: { url?: string; name: string; size: number; fonts: CardTemplateProps["fonts"] }) {
  const ring = Math.round(size * 0.04);
  const inner = size - ring * 2;
  return (
    <div style={{ display: "flex", width: size, height: size, borderRadius: 999, background: SAFFRON, padding: ring }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: inner,
          height: inner,
          borderRadius: 999,
          overflow: "hidden",
          background: PAPER,
          border: `${Math.max(3, Math.round(ring * 0.6))}px solid ${CREAM}`,
        }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- also rendered by Satori
          <img src={url} alt="" width={inner} height={inner} style={{ width: inner, height: inner, objectFit: "cover", objectPosition: "top" }} />
        ) : (
          <div style={{ display: "flex", fontFamily: fonts.display, fontSize: Math.round(inner * 0.34), color: FOREST }}>{initials(name)}</div>
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

function Diamond({ size, color }: { size: number; color: string }) {
  return <div style={{ display: "flex", width: size, height: size, border: `2px solid ${color}`, transform: "rotate(45deg)" }} />;
}

// Print: 1004 × 650

function Row({ icon, children, strong }: { icon: keyof typeof ICONS; children: React.ReactNode; strong?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginTop: 12 }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 999, background: strong ? TERRA : PAPER, marginRight: 12 }}
      >
        <Icon name={icon} size={18} color={strong ? "#FFFFFF" : FOREST} />
      </div>
      <div style={{ display: "flex", fontSize: strong ? 25 : 18, fontWeight: strong ? 700 : 400, color: strong ? FOREST : TEXT }}>{children}</div>
    </div>
  );
}

function PrintCard({ doctor: d, qr, fonts, photoUrl, devBanner }: CardTemplateProps) {
  const { width, height } = CARD_SIZE.print;
  const clinic = d.clinics[0];
  const reg = [d.registration.council, d.registration.number].filter(Boolean).join(" · ");
  const spec = specialtyLine(d);
  return (
    <div style={{ width, height, display: "flex", background: FOREST, padding: 16, fontFamily: fonts.body, position: "relative" }}>
      {devBanner && <DevBanner name={devBanner} />}
      <div style={{ display: "flex", flex: 1, background: CREAM, border: `2px solid ${SAFFRON}`, padding: "34px 36px", position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", position: "absolute", left: -110, top: -110 }}>
          <Mandala size={420} color={SAFFRON} opacity={0.35} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 230, marginRight: 30 }}>
          <Photo url={photoUrl} name={d.fullName} size={200} fonts={fonts} />
          <div style={{ display: "flex", alignItems: "center", marginTop: 22 }}>
            <div style={{ display: "flex", width: 40, height: 2, background: SAFFRON }} />
            <div style={{ display: "flex", margin: "0 10px" }}>
              <Diamond size={10} color={TERRA} />
            </div>
            <div style={{ display: "flex", width: 40, height: 2, background: SAFFRON }} />
          </div>
          {reg && <div style={{ display: "flex", fontSize: 13, color: MUTED, marginTop: 14, textAlign: "center", lineHeight: 1.35 }}>Reg. {clip(reg, 60)}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontFamily: fonts.display, fontSize: nameSize(d.fullName, 46), fontWeight: 600, color: FOREST, lineHeight: 1.05 }}>{d.fullName}</div>
          {spec && <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: TERRA, marginTop: 10, letterSpacing: 1 }}>{spec}</div>}
          {d.degreesLine && <div style={{ display: "flex", fontSize: 17, color: MUTED, marginTop: 6 }}>{clip(d.degreesLine, 48)}</div>}
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              {numbers(d).map((n) => (
                <Row key={n.label} icon={n.icon} strong={n.icon === "phone"}>
                  {formatPhone(n.value)}
                </Row>
              ))}
              {clinic && <Row icon="pin">{clip(`${clinic.name}, ${clinic.area.name}`, 32)}</Row>}
              <Row icon="globe">{clip(shortUrl(qr.url), 32)}</Row>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginLeft: 12 }}>
              <div style={{ display: "flex", padding: 6, background: "#FFFFFF", border: `2px solid ${SAFFRON}`, borderRadius: 16 }}>
                <QrBlock qr={qr} px={118} radius={10} color={FOREST} />
              </div>
              <div style={{ display: "flex", fontSize: 13, fontWeight: 700, color: TERRA, marginTop: 6 }}>Scan to visit</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Phone: 1080 × 1920

function PhoneRow({ icon, label, value, last }: { icon: keyof typeof ICONS; label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "22px 0", borderBottom: last ? "none" : `2px dashed ${LINE}` }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 78,
          height: 78,
          borderRadius: 999,
          background: icon === "phone" ? TERRA : PAPER,
          marginRight: 28,
        }}
      >
        <Icon name={icon} size={36} color={icon === "phone" ? "#FFFFFF" : FOREST} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", fontSize: 23, fontWeight: 700, letterSpacing: 4, color: TERRA }}>{label.toUpperCase()}</div>
        <div style={{ display: "flex", fontSize: 36, fontWeight: 600, color: FOREST, marginTop: 4, lineHeight: 1.25 }}>{value}</div>
      </div>
    </div>
  );
}

function PhoneCard({ doctor: d, qr, fonts, photoUrl, devBanner }: CardTemplateProps) {
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
    <div style={{ width, height, display: "flex", flexDirection: "column", background: CREAM, color: TEXT, fontFamily: fonts.body }}>
      {devBanner && <DevBanner name={devBanner} />}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          height: 1000,
          paddingTop: 80,
          background: FOREST,
          position: "relative",
          overflow: "hidden",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 9, color: SAFFRON }}>NAMASTE</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 600, height: 600, marginTop: 10, position: "relative" }}>
          <div style={{ display: "flex", position: "absolute", left: 0, top: 0 }}>
            <Mandala size={600} color={SAFFRON} opacity={0.6} />
          </div>
          <Photo url={photoUrl} name={d.fullName} size={360} fonts={fonts} />
        </div>
        <div style={{ display: "flex", fontFamily: fonts.display, fontWeight: 600, fontSize: nameSize(d.fullName, 80), lineHeight: 1.05, color: CREAM, marginTop: 0 }}>
          {d.fullName}
        </div>
        {spec && <div style={{ display: "flex", fontSize: 38, fontWeight: 700, color: SAFFRON, marginTop: 16, letterSpacing: 2 }}>{spec}</div>}
        {d.degreesLine && <div style={{ display: "flex", fontSize: 29, color: "rgba(251,245,234,0.8)", marginTop: 12, padding: "0 70px" }}>{clip(d.degreesLine, 56)}</div>}
        {reg && <div style={{ display: "flex", fontSize: 23, color: "rgba(251,245,234,0.55)", marginTop: 10 }}>Reg. {clip(reg, 60)}</div>}
      </div>
      <div style={{ display: "flex", height: 8, background: SAFFRON }} />

      <div style={{ display: "flex", flexDirection: "column", padding: "10px 80px" }}>
        {rows.map((r, i) => (
          <PhoneRow key={`${r.label}-${i}`} icon={r.icon} label={r.label} value={r.value} last={i === rows.length - 1} />
        ))}
      </div>

      <div style={{ display: "flex", flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", margin: "0 80px", padding: 32, background: PAPER, border: `3px solid ${SAFFRON}`, borderRadius: 30 }}>
        <div style={{ display: "flex", padding: 10, background: "#FFFFFF", borderRadius: 20 }}>
          <QrBlock qr={qr} px={210} radius={14} color={FOREST} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 36, flex: 1 }}>
          <div style={{ display: "flex", fontFamily: fonts.display, fontWeight: 600, fontSize: 44, lineHeight: 1.1, color: FOREST }}>Scan to visit my website</div>
          <div style={{ display: "flex", fontSize: 26, color: MUTED, marginTop: 10, lineHeight: 1.35 }}>Timings, directions and appointment requests.</div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: TERRA, marginTop: 12 }}>{clip(shortUrl(qr.url), 34)}</div>
        </div>
      </div>
      <div style={{ display: "flex", flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 96, background: FOREST, color: CREAM, fontSize: 24 }}>
        <div style={{ display: "flex", fontWeight: 700, fontSize: 28 }}>MediReach</div>
        <div style={{ display: "flex", marginLeft: 16, color: "rgba(251,245,234,0.6)" }}>{ROOT_HOSTNAME}</div>
      </div>
    </div>
  );
}

export default function CardT4(props: CardTemplateProps) {
  return props.variant === "print" ? <PrintCard {...props} /> : <PhoneCard {...props} />;
}

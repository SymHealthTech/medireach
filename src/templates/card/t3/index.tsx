import { formatPhone } from "@/lib/phone";
import { ROOT_HOSTNAME } from "@/lib/site";
import { openDaysSummary } from "@/lib/timings";
import { clip, Icon, QrBlock, shortUrl, type ICONS } from "@/templates/card/parts";
import { DevBanner } from "@/templates/DevBanner";
import { ActionDock, DOCK_SPACE, dockAboveFooter, doctorCardActions, printDock, type DockStyle } from "@/templates/card/actions";
import { CARD_SIZE, type CardTemplateProps } from "@/templates/types";

/**
 * Visiting card design 3 — "Modern Edge", the card that matches portfolio
 * design 3: near-black ink, cobalt and signal orange, square corners and
 * uppercase type.
 *
 *  - print (85 × 55 mm): ink column on the left with the square photo and an
 *    orange bar; name, specialty and contact rows on ivory; QR bottom right.
 *  - phone (1080 × 1920): ink header with a large square photo framed in
 *    orange, contact rows on ivory, the QR code on a cobalt panel and the
 *    one-tap buttons.
 *
 * Satori-safe: inline styles, flexbox only, <img> and inline <svg>.
 */

const INK = "#0D1422";
const INK_2 = "#172235";
const COBALT = "#2445E0";
const SKY = "#8FB0FF";
const ORANGE = "#E8591F";
const IVORY = "#F6F4EF";
const STEEL = "#ECEFF5";
const TEXT = "#18202E";
const MUTED = "#5D6677";
const LINE = "#E2E5EC";

const FOOTER = 96;
/** Where the buttons sit on the phone card (also used for the PDF links). */
export const PHONE_DOCK = dockAboveFooter(FOOTER, 80);
/** Where the buttons sit on the print card: the free band between the name and the contact rows. */
export const PRINT_DOCK = printDock(348, 956, 240);
const DOCK_STYLE = (fonts: CardTemplateProps["fonts"]): DockStyle => ({
  primaryBg: ORANGE,
  primaryText: "#FFFFFF",
  tileBg: INK,
  tileText: "#FFFFFF",
  iconColor: SKY,
  radius: 0,
  font: fonts.body,
  uppercase: true,
});

function initials(name: string): string {
  const parts = name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

const nameSize = (name: string, base: number) => (name.length > 26 ? Math.round(base * 0.72) : name.length > 20 ? Math.round(base * 0.84) : base);

function Photo({ url, name, size, fonts }: { url?: string; name: string; size: number; fonts: CardTemplateProps["fonts"] }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        background: INK_2,
        overflow: "hidden",
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- also rendered by Satori
        <img
          src={url}
          alt=""
          width={size}
          height={size}
          style={{
            width: size,
            height: size,
            objectFit: "cover",
            objectPosition: "top",
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: Math.round(size * 0.34),
            color: "rgba(255,255,255,0.35)",
          }}
        >
          {initials(name)}
        </div>
      )}
    </div>
  );
}

function numbers(d: CardTemplateProps["doctor"]): { icon: "phone" | "chat"; label: string; value: string }[] {
  const phone = d.phone ?? d.clinics[0]?.phone;
  const wa = d.whatsapp;
  return [
    ...(phone
      ? [
          {
            icon: "phone" as const,
            label: wa === phone ? "Call / WhatsApp" : "Call",
            value: phone,
          },
        ]
      : []),
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
    <div style={{ display: "flex", alignItems: "center", marginTop: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          background: strong ? ORANGE : STEEL,
          marginRight: 14,
        }}
      >
        <Icon name={icon} size={19} color={strong ? "#FFFFFF" : INK} />
      </div>
      <div
        style={{
          display: "flex",
          fontSize: strong ? 26 : 19,
          fontWeight: strong ? 700 : 400,
          color: strong ? INK : TEXT,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function PrintCard({ doctor: d, qr, fonts, photoUrl, devBanner, links }: CardTemplateProps) {
  const { width, height } = CARD_SIZE.print;
  const clinic = d.clinics[0];
  const nums = numbers(d);
  const reg = [d.registration.council, d.registration.number].filter(Boolean).join(" · ");
  const spec = specialtyLine(d);
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        background: IVORY,
        color: TEXT,
        fontFamily: fonts.body,
        position: "relative",
      }}
    >
      {devBanner && <DevBanner name={devBanner} />}
      {/* Ink column */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 300,
          height,
          background: INK,
          padding: "48px 40px 40px 40px",
          position: "relative",
        }}
      >
        <Photo url={photoUrl} name={d.fullName} size={220} fonts={fonts} />
        <div
          style={{
            display: "flex",
            width: 60,
            height: 8,
            background: ORANGE,
            marginTop: 26,
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: 3,
              color: SKY,
            }}
          >
            SCAN · BOOK · VISIT
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 15,
              color: "rgba(255,255,255,0.55)",
              marginTop: 6,
            }}
          >
            {clip(shortUrl(qr.url), 30)}
          </div>
        </div>
      </div>

      {/* Details */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "50px 48px 40px 48px",
        }}
      >
        {spec && (
          <div style={{ display: "flex" }}>
            <div
              style={{
                display: "flex",
                background: ORANGE,
                color: "#FFFFFF",
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: 2.5,
                padding: "5px 12px",
              }}
            >
              {clip(spec.toUpperCase(), 34)}
            </div>
          </div>
        )}
        <div
          style={{
            display: "flex",
            fontSize: nameSize(d.fullName, 48),
            fontWeight: 700,
            color: INK,
            lineHeight: 1.02,
            marginTop: 16,
            letterSpacing: -1,
            textTransform: "uppercase",
          }}
        >
          {d.fullName}
        </div>
        {d.degreesLine && (
          <div
            style={{
              display: "flex",
              fontSize: 19,
              fontWeight: 600,
              color: COBALT,
              marginTop: 10,
            }}
          >
            {clip(d.degreesLine, 48)}
          </div>
        )}

        <div style={{ display: "flex", flex: 1, marginTop: 18 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "flex-end",
            }}
          >
            {nums.map((x) => (
              <Row key={x.label} icon={x.icon} strong={x.icon === "phone"}>
                {formatPhone(x.value)}
              </Row>
            ))}
            {clinic && <Row icon="pin">{clip(`${clinic.name}, ${clinic.area.name}`, 34)}</Row>}
            {clinic && openDaysSummary(clinic.timings) && <Row icon="clock">{clip(openDaysSummary(clinic.timings).split(" | ")[0] ?? "", 36)}</Row>}
            {reg && (
              <div
                style={{
                  display: "flex",
                  fontSize: 14,
                  color: MUTED,
                  marginTop: 14,
                }}
              >
                Reg. {clip(reg, 52)}
              </div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              alignItems: "flex-end",
              marginLeft: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                padding: 4,
                border: `3px solid ${INK}`,
              }}
            >
              <QrBlock qr={qr} px={128} radius={0} color={INK} />
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: 0,
          top: 0,
          width: 120,
          height: 10,
          background: COBALT,
        }}
      />
      {/* Buttons, at a fixed place in the free band (the print PDF puts links on them). */}
      <ActionDock actions={doctorCardActions(d)} dock={PRINT_DOCK} style={DOCK_STYLE(fonts)} links={links} small />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone: 1080 × 1920
// ---------------------------------------------------------------------------

function PhoneRow({ icon, label, value, last }: { icon: keyof typeof ICONS; label: string; value: string; last?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "20px 0",
        borderBottom: last ? "none" : `2px solid ${LINE}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 78,
          height: 78,
          background: icon === "phone" ? ORANGE : INK,
          marginRight: 28,
        }}
      >
        <Icon name={icon} size={36} color="#FFFFFF" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div
          style={{
            display: "flex",
            fontSize: 23,
            fontWeight: 700,
            letterSpacing: 4,
            color: MUTED,
          }}
        >
          {label.toUpperCase()}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 36,
            fontWeight: 700,
            color: INK,
            marginTop: 4,
            lineHeight: 1.25,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function PhoneCard({ doctor: d, qr, fonts, photoUrl, devBanner, links }: CardTemplateProps) {
  const { width, height } = CARD_SIZE.phone;
  const clinic = d.clinics[0];
  const hours = clinic ? (openDaysSummary(clinic.timings).split(" | ")[0] ?? "") : "";
  const rows: { icon: keyof typeof ICONS; label: string; value: string }[] = [
    ...numbers(d).map((x) => ({
      icon: x.icon,
      label: x.label,
      value: formatPhone(x.value),
    })),
    ...(clinic
      ? [
          {
            icon: "pin" as const,
            label: clip(clinic.name, 34),
            value: clip(`${clinic.area.name}, ${clinic.city.name}`, 40),
          },
        ]
      : []),
    ...(hours
      ? [
          {
            icon: "clock" as const,
            label: "Clinic hours",
            value: clip(hours, 44),
          },
        ]
      : []),
  ].slice(0, 4);
  const reg = [d.registration.council, d.registration.number].filter(Boolean).join(" · ");
  const spec = specialtyLine(d);
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        background: IVORY,
        color: TEXT,
        fontFamily: fonts.body,
        position: "relative",
      }}
    >
      {devBanner && <DevBanner name={devBanner} />}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: 850,
          padding: "70px 80px 0 80px",
          background: INK,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            right: -80,
            top: 120,
            fontSize: 380,
            fontWeight: 700,
            color: "rgba(255,255,255,0.04)",
            letterSpacing: -20,
          }}
        >
          {initials(d.fullName)}
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              width: 54,
              height: 8,
              background: ORANGE,
              marginRight: 20,
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 8,
              color: SKY,
            }}
          >
            DIGITAL VISITING CARD
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 44, position: "relative" }}>
          <div
            style={{
              display: "flex",
              position: "absolute",
              left: 20,
              top: 20,
              width: 300,
              height: 300,
              border: `6px solid ${ORANGE}`,
            }}
          />
          <Photo url={photoUrl} name={d.fullName} size={300} fonts={fonts} />
        </div>
        <div
          style={{
            display: "flex",
            fontWeight: 700,
            fontSize: nameSize(d.fullName, 86),
            lineHeight: 1,
            color: "#FFFFFF",
            marginTop: 56,
            letterSpacing: -2,
            textTransform: "uppercase",
          }}
        >
          {d.fullName}
        </div>
        {spec && (
          <div
            style={{
              display: "flex",
              fontSize: 38,
              fontWeight: 700,
              color: ORANGE,
              marginTop: 20,
              letterSpacing: 2,
            }}
          >
            {spec.toUpperCase()}
          </div>
        )}
        {d.degreesLine && (
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: "rgba(255,255,255,0.78)",
              marginTop: 12,
            }}
          >
            {clip(d.degreesLine, 56)}
          </div>
        )}
        {reg && (
          <div
            style={{
              display: "flex",
              fontSize: 24,
              color: "rgba(255,255,255,0.5)",
              marginTop: 10,
            }}
          >
            Reg. {clip(reg, 60)}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "16px 80px",
        }}
      >
        {rows.map((r, i) => (
          <PhoneRow key={`${r.label}-${i}`} icon={r.icon} label={r.label} value={r.value} last={i === rows.length - 1} />
        ))}
      </div>

      <div style={{ display: "flex", flex: 1 }} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          margin: "0 80px",
          padding: 28,
          background: COBALT,
        }}
      >
        <div style={{ display: "flex", padding: 8, background: "#FFFFFF" }}>
          <QrBlock qr={qr} px={170} radius={0} color={INK} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 40,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              fontWeight: 700,
              fontSize: 44,
              lineHeight: 1.05,
              color: "#FFFFFF",
              textTransform: "uppercase",
              letterSpacing: -1,
            }}
          >
            Scan to visit my website
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 27,
              color: "rgba(255,255,255,0.8)",
              marginTop: 12,
              lineHeight: 1.35,
            }}
          >
            Timings, directions and appointment requests.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 27,
              fontWeight: 700,
              color: "#FFFFFF",
              marginTop: 14,
            }}
          >
            {clip(shortUrl(qr.url), 36)}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flex: 1, minHeight: 24 }} />
      {/* Room for the buttons (drawn at a fixed place, so the PDF links line up). */}
      <div style={{ display: "flex", height: DOCK_SPACE }} />
      <ActionDock actions={doctorCardActions(d)} dock={PHONE_DOCK} style={DOCK_STYLE(fonts)} links={links} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: FOOTER,
          background: INK,
          color: "#FFFFFF",
          fontSize: 24,
        }}
      >
        <div style={{ display: "flex", fontWeight: 700, fontSize: 28 }}>MediReach</div>
        <div
          style={{
            display: "flex",
            marginLeft: 16,
            color: "rgba(255,255,255,0.6)",
          }}
        >
          {ROOT_HOSTNAME}
        </div>
      </div>
    </div>
  );
}

export default function CardT3(props: CardTemplateProps) {
  return props.variant === "print" ? <PrintCard {...props} /> : <PhoneCard {...props} />;
}

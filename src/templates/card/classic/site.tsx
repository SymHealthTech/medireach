import { formatPhone } from "@/lib/phone";
import { ROOT_HOSTNAME } from "@/lib/site";
import { openDaysSummary } from "@/lib/timings";
import { DevBanner } from "@/templates/DevBanner";
import { CARD_SIZE, type SiteCardTemplateProps } from "@/templates/types";
import { getTheme } from "@/themes/specialty";
import { ActionDock, DOCK_SPACE, dockAboveFooter, printDock, siteCardActions, type DockStyle } from "@/templates/card/actions";
import { clip, Icon, QrBlock, shortUrl, type ICONS } from "@/templates/card/parts";

/**
 * Classic visiting card for clinics and hospitals (DESIGN_BRIEF.md §10):
 * logo, name, category, address, timings summary (or "24×7"), phone and QR,
 * always in the colours of the site's website design (its specialty theme),
 * so the card matches the website. There is no separate card choice.
 *
 *  - print (85 × 55 mm): theme panel on the left with the logo and QR code;
 *    name, category and contact rows on the right.
 *  - phone (1080 × 1920): theme header with the logo and name, a white
 *    contact panel, the QR code and the one-tap buttons (Call, WhatsApp,
 *    Directions, Website).
 *
 * Satori-safe (inline styles, flexbox only), like the doctor card. Prints
 * legibly in black and white: dark text on white, QR in the primary colour.
 */

const PAPER = "#F7F9FA";
const MUTED = "#5B6573";
const LINE = "#E5E7EB";
const TEXT = "#1F2933";

const FOOTER = 100;
/** Where the buttons sit on the phone card (also used for the PDF links). */
export const PHONE_DOCK = dockAboveFooter(FOOTER, 72);
/** Where the buttons sit on the print card: the free band between the name and the contact rows. */
export const PRINT_DOCK = printDock(346, 958, 268);
const dockStyle = (primary: string, soft: string, fonts: SiteCardTemplateProps["fonts"]): DockStyle => ({
  primaryBg: primary,
  primaryText: "#FFFFFF",
  tileBg: "#FFFFFF",
  tileText: TEXT,
  iconColor: primary,
  border: `2px solid ${soft}`,
  radius: 30,
  font: fonts.body,
  shadow: "0 18px 36px -24px rgba(0,0,0,0.35)",
});

/** The site's colours: those of its website design. */
const sitePalette = (s: SiteCardTemplateProps["site"]) => getTheme(s.themeKey, s.kind).palette;

function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "M";
}

const nameSize = (name: string, base: number) => (name.length > 28 ? Math.round(base * 0.72) : name.length > 20 ? Math.round(base * 0.86) : base);

function Logo({ url, name, size, primary, soft, fonts }: { url?: string; name: string; size: number; primary: string; soft: string; fonts: SiteCardTemplateProps["fonts"] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: size, height: size, borderRadius: Math.round(size * 0.18), background: "#FFFFFF", overflow: "hidden" }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- also rendered by Satori
        <img src={url} alt="" width={size} height={size} style={{ width: size, height: size, objectFit: "cover" }} />
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: size, height: size, background: soft, fontFamily: fonts.display, fontSize: Math.round(size * 0.36), fontWeight: 600, color: primary }}>
          {initials(name)}
        </div>
      )}
    </div>
  );
}

/** "Maternity Hospital", "Skin Clinic"; "Hospital" / "Clinic" when no type is set (as on the website). */
const typeName = (s: SiteCardTemplateProps["site"]) => s.category?.name ?? (s.kind === "hospital" ? "Hospital" : "Clinic");

/**
 * The numbers a card shows, labelled: the emergency number (only when one was
 * entered), the main number, and WhatsApp (folded into the call or emergency
 * label when it is the same number, else its own row).
 */
function cardNumbers(s: SiteCardTemplateProps["site"]): { icon: "phone" | "chat"; label: string; value: string; emergency?: boolean }[] {
  const main = s.phones[0];
  const emergency = s.emergencyPhone && s.emergencyPhone !== main ? s.emergencyPhone : undefined;
  const wa = s.whatsapp;
  const emergencyLabel = s.is24x7 ? "24×7 emergency" : "Emergency";
  const out: { icon: "phone" | "chat"; label: string; value: string; emergency?: boolean }[] = [];
  if (emergency) out.push({ icon: "phone", label: wa === emergency ? `${emergencyLabel} or WhatsApp` : emergencyLabel, value: emergency, emergency: true });
  // The main number; it is the emergency number too when both are the same.
  if (main) out.push({ icon: "phone", label: s.emergencyPhone === main ? (wa === main ? `${emergencyLabel}, call or WhatsApp` : `${emergencyLabel} and call`) : wa === main ? "Call or WhatsApp" : "Call", value: main });
  if (wa && wa !== main && wa !== emergency) out.push({ icon: "chat", label: "WhatsApp", value: wa });
  return out;
}

function hoursText(s: SiteCardTemplateProps["site"]): string {
  if (s.is24x7) return "Open 24×7";
  const summary = openDaysSummary(s.timings);
  return summary.length > 64 ? "See website for timings" : summary || "Call for timings";
}

// ---------------------------------------------------------------------------
// Print: 85 × 55 mm at 300 dpi (1004 × 650)
// ---------------------------------------------------------------------------

function PrintRow({ icon, children, strong, soft, primary, label }: { icon: keyof typeof ICONS; children: React.ReactNode; strong?: boolean; soft: string; primary: string; label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginTop: 11 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 999, background: soft, marginRight: 14 }}>
        <Icon name={icon} size={19} color={primary} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        {label && <div style={{ display: "flex", fontSize: 16, fontWeight: 600, color: MUTED, marginRight: 10 }}>{label}</div>}
        <div style={{ display: "flex", fontSize: strong ? 24 : 19, fontWeight: strong ? 700 : 400, color: strong ? primary : TEXT }}>{children}</div>
      </div>
    </div>
  );
}

function PrintCard({ site: s, qr, fonts, logoUrl, devBanner, links }: SiteCardTemplateProps) {
  const { width, height } = CARD_SIZE.print;
  const { primary, accent, soft } = sitePalette(s);
  const numbers = cardNumbers(s);
  // One plain number needs no label; several (or a shared WhatsApp) are labelled.
  const labelled = numbers.length > 1 || numbers.some((n) => n.label !== "Call");
  const what = typeName(s);
  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: PAPER, color: TEXT, fontFamily: fonts.body, position: "relative" }}>
      {devBanner && <DevBanner name={devBanner} />}
      <div style={{ display: "flex", flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 300, background: primary, position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", position: "absolute", top: -90, right: -90, width: 240, height: 240, borderRadius: 999, border: "2px solid rgba(255,255,255,0.10)" }} />
          <Logo url={logoUrl} name={s.name} size={150} primary={primary} soft={soft} fonts={fonts} />
          <div style={{ display: "flex", marginTop: 26 }}>
            <QrBlock qr={qr} px={150} radius={14} color={primary} />
          </div>
          <div style={{ display: "flex", fontSize: 15, color: "rgba(255,255,255,0.85)", marginTop: 12, textAlign: "center" }}>Scan for timings and directions</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "48px 46px 36px 46px" }}>
          <div style={{ display: "flex", fontFamily: fonts.display, fontWeight: 600, fontSize: nameSize(s.name, 52), lineHeight: 1.08, color: primary }}>{s.name}</div>
          <div style={{ display: "flex", width: 64, height: 4, borderRadius: 4, background: accent, marginTop: 14, marginBottom: 14 }} />
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: TEXT }}>{what}</div>
          <div style={{ display: "flex", fontSize: 20, color: MUTED, marginTop: 4 }}>
            {s.address.area.name}, {s.address.city.name}
          </div>
          <div style={{ display: "flex", flex: 1 }} />
          {numbers.map((n) => (
            <PrintRow key={`${n.label}-${n.value}`} icon={n.icon} strong={n.icon === "phone"} label={labelled ? n.label : undefined} soft={soft} primary={primary}>
              {formatPhone(n.value)}
            </PrintRow>
          ))}
          <PrintRow icon="clock" soft={soft} primary={primary}>
            {hoursText(s)}
          </PrintRow>
          <PrintRow icon="globe" soft={soft} primary={primary}>
            {shortUrl(qr.url)}
          </PrintRow>
        </div>
      </div>
      <div style={{ display: "flex", height: 10, background: accent }} />
      {/* Buttons, at a fixed place in the free band (the print PDF puts links on them). */}
      <ActionDock actions={siteCardActions(s)} dock={PRINT_DOCK} style={dockStyle(primary, soft, fonts)} links={links} small />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone: 1080 × 1920
// ---------------------------------------------------------------------------

/** A row's value: one line of text, or several short lines (the clinic's doctors). `note` is a smaller line under it. */
function PhoneRow({
  icon,
  label,
  value,
  note,
  last,
  soft,
  primary,
  tight,
}: {
  icon: keyof typeof ICONS;
  label: string;
  value: string | string[];
  note?: string;
  last?: boolean;
  soft: string;
  primary: string;
  tight?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: tight ? "18px 0" : "26px 0", borderBottom: last ? "none" : `2px solid ${LINE}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 76, height: 76, borderRadius: 999, background: soft, marginRight: 28 }}>
        <Icon name={icon} size={38} color={primary} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", fontSize: 24, fontWeight: 600, letterSpacing: 3, color: MUTED }}>{label.toUpperCase()}</div>
        {typeof value === "string" ? (
          <div style={{ display: "flex", fontSize: 36, fontWeight: 600, color: TEXT, marginTop: 4, lineHeight: 1.25 }}>{value}</div>
        ) : (
          value.map((line) => (
            <div key={line} style={{ display: "flex", fontSize: 32, fontWeight: 600, color: TEXT, marginTop: 4, lineHeight: 1.25 }}>
              {line}
            </div>
          ))
        )}
        {note && <div style={{ display: "flex", fontSize: 28, color: MUTED, marginTop: 6, lineHeight: 1.3 }}>{note}</div>}
      </div>
    </div>
  );
}

function PhoneCard({ site: s, qr, fonts, logoUrl, devBanner, links }: SiteCardTemplateProps) {
  const { width, height } = CARD_SIZE.phone;
  const { primary, accent, soft } = sitePalette(s);
  const what = typeName(s);
  const street = [s.address.line1, s.address.line2].filter(Boolean).join(", ");
  // Clinics: the doctors (up to 2 named, then "+N more"), so the card says who you will see.
  const clinic = s.kind === "clinic";
  const doctors = clinic ? s.doctors.filter((d) => d.name.trim()) : [];
  // One line per doctor: name and specialty, or the name alone when both don't fit.
  // With three numbers (emergency, call, WhatsApp) there is room for one doctor line ("+N more").
  const shown = cardNumbers(s).length > 2 ? 1 : 2;
  const doctorLines = doctors.slice(0, shown).map((d, i) => {
    const more = i === shown - 1 && doctors.length > shown ? ` +${doctors.length - shown} more` : "";
    const room = 40 - more.length;
    const full = [d.name, d.specialty].filter(Boolean).join(" · ");
    return (full.length <= room ? full : clip(d.name, room)) + more;
  });
  // The appointment note (a hospital's OPD hours when it is open 24×7), under the timings.
  const note = s.appointmentNote ? clip(s.appointmentNote, 48) : undefined;
  const rows: { icon: keyof typeof ICONS; label: string; value: string | string[]; note?: string }[] = [
    ...cardNumbers(s).map((n) => ({ icon: n.icon, label: n.label, value: formatPhone(n.value) })),
    ...(doctorLines.length ? [{ icon: "user" as const, label: doctors.length > 1 ? "Doctors" : "Doctor", value: doctorLines }] : []),
    {
      icon: "pin",
      label: "Address",
      // Skip the area when the address lines already name it ("Sample Road, Wakad").
      value: street.toLowerCase().includes(s.address.area.name.toLowerCase()) ? street : [street, s.address.area.name].filter(Boolean).join(", "),
    },
    { icon: "clock", label: "Timings", value: hoursText(s), ...(note ? { note } : {}) },
  ];
  // Five rows (emergency, call, WhatsApp, address, timings): tighter rows and a smaller QR so it all fits.
  // (or four rows with doctors or a note: the buttons need room under them too)
  const tight = rows.length > 4 || (rows.length > 3 && (doctorLines.length > 0 || Boolean(note)));
  // A full clinic card (doctors and an appointment note, or five rows plus doctors): a shorter header too.
  const compact = (tight && (doctorLines.length > 0 || Boolean(note))) || (doctorLines.length > 0 && Boolean(note));
  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: PAPER, color: TEXT, fontFamily: fonts.body, position: "relative" }}>
      {devBanner && <DevBanner name={devBanner} />}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: compact ? (s.name.length > 30 ? 690 : 650) : 800, paddingTop: compact ? 50 : 76, background: primary, position: "relative", overflow: "hidden", textAlign: "center" }}>
        <div style={{ display: "flex", position: "absolute", top: -220, right: -200, width: 640, height: 640, borderRadius: 999, border: "3px solid rgba(255,255,255,0.08)" }} />
        <div style={{ display: "flex", fontSize: 26, fontWeight: 600, letterSpacing: 8, color: accent }}>DIGITAL VISITING CARD</div>
        <div style={{ display: "flex", marginTop: compact ? 30 : 44 }}>
          <Logo url={logoUrl} name={s.name} size={compact ? 160 : 230} primary={primary} soft={soft} fonts={fonts} />
        </div>
        <div style={{ display: "flex", fontFamily: fonts.display, fontWeight: 600, fontSize: nameSize(s.name, 80), lineHeight: 1.08, color: "#FFFFFF", marginTop: compact ? 28 : 40, padding: "0 60px" }}>{s.name}</div>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: accent, marginTop: 18 }}>{what}</div>
        <div style={{ display: "flex", fontSize: 32, color: "rgba(255,255,255,0.82)", marginTop: 10 }}>
          {s.address.area.name}, {s.address.city.name}
        </div>
      </div>

      <div style={{ display: "flex", padding: "0 72px", marginTop: -110, position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", background: "#FFFFFF", borderRadius: 40, padding: "18px 48px", boxShadow: "0 30px 60px -20px rgba(0,0,0,0.25)" }}>
          {rows.map((r, i) => (
            <PhoneRow key={`${r.label}-${i}`} icon={r.icon} label={r.label} value={r.value} note={r.note} last={i === rows.length - 1} soft={soft} primary={primary} tight={tight} />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 24 }} />
      <div style={{ display: "flex", alignItems: "center", padding: "0 96px" }}>
        <div style={{ display: "flex", padding: 8, borderRadius: 26, border: `3px solid ${LINE}`, background: "#FFFFFF" }}>
          <QrBlock qr={qr} px={tight ? 160 : 190} radius={18} color={primary} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 48, flex: 1 }}>
          <div style={{ display: "flex", fontFamily: fonts.display, fontWeight: 600, fontSize: 46, lineHeight: 1.12, color: primary }}>Scan for timings and directions</div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: TEXT, marginTop: 18 }}>{shortUrl(qr.url)}</div>
        </div>
      </div>
      <div style={{ display: "flex", flex: 1, minHeight: 24 }} />
      {/* Room for the buttons (drawn at a fixed place, so the PDF links line up). */}
      <div style={{ display: "flex", height: DOCK_SPACE }} />
      <ActionDock actions={siteCardActions(s)} dock={PHONE_DOCK} style={dockStyle(primary, soft, fonts)} links={links} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: FOOTER, background: primary, color: "#FFFFFF", fontSize: 24 }}>
        <div style={{ display: "flex", fontFamily: fonts.display, fontWeight: 600, fontSize: 28 }}>MediReach</div>
        <div style={{ display: "flex", width: 8, height: 8, borderRadius: 999, background: accent, marginLeft: 4, marginTop: 10 }} />
        <div style={{ display: "flex", marginLeft: 16, color: "rgba(255,255,255,0.7)" }}>{ROOT_HOSTNAME}</div>
      </div>
    </div>
  );
}

export default function ClassicSiteCard(props: SiteCardTemplateProps) {
  return props.variant === "print" ? <PrintCard {...props} /> : <PhoneCard {...props} />;
}

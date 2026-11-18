import { formatPhone } from "@/lib/phone";
import { ROOT_HOSTNAME } from "@/lib/site";
import { openDaysSummary } from "@/lib/timings";
import { DevBanner } from "@/templates/DevBanner";
import { CARD_SIZE, type SiteCardTemplateProps } from "@/templates/types";
import { getTheme } from "@/themes/specialty";
import { Icon, QrBlock, shortUrl, type ICONS } from "./index";

/**
 * Classic visiting card for clinics and hospitals (DESIGN_BRIEF.md §10):
 * logo, name, category, address, timings summary (or "24×7"), phone and QR,
 * in the site's specialty theme colours.
 *
 *  - print (85 × 55 mm): theme panel on the left with the logo and QR code;
 *    name, category and contact rows on the right.
 *  - phone (1080 × 1920): theme header with the logo and name, a white
 *    contact panel and a large QR code.
 *
 * Satori-safe (inline styles, flexbox only), like the doctor card. Prints
 * legibly in black and white: dark text on white, QR in the primary colour.
 */

const PAPER = "#FBF8F3";
const MUTED = "#5D6B6C";
const LINE = "#E6E1D8";
const TEXT = "#1C2526";

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

function hoursText(s: SiteCardTemplateProps["site"]): string {
  if (s.is24x7) return "Open 24×7";
  const summary = openDaysSummary(s.timings);
  return summary.length > 64 ? "See website for timings" : summary || "Call for timings";
}

// ---------------------------------------------------------------------------
// Print: 85 × 55 mm at 300 dpi (1004 × 650)
// ---------------------------------------------------------------------------

function PrintRow({ icon, children, strong, soft, primary }: { icon: keyof typeof ICONS; children: React.ReactNode; strong?: boolean; soft: string; primary: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginTop: 11 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 999, background: soft, marginRight: 14 }}>
        <Icon name={icon} size={19} color={primary} />
      </div>
      <div style={{ display: "flex", fontSize: strong ? 24 : 19, fontWeight: strong ? 700 : 400, color: strong ? primary : TEXT }}>{children}</div>
    </div>
  );
}

function PrintCard({ site: s, qr, fonts, logoUrl, devBanner }: SiteCardTemplateProps) {
  const { width, height } = CARD_SIZE.print;
  const { primary, accent, soft } = getTheme(s.themeKey, s.kind).palette;
  const phone = s.emergencyPhone ?? s.phones[0];
  const what = s.kind === "hospital" ? "Hospital" : (s.category?.name ?? "Clinic");
  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: PAPER, color: TEXT, fontFamily: fonts.body }}>
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
          {phone && (
            <PrintRow icon="phone" strong soft={soft} primary={primary}>
              {formatPhone(phone)}
            </PrintRow>
          )}
          <PrintRow icon="clock" soft={soft} primary={primary}>
            {hoursText(s)}
          </PrintRow>
          <PrintRow icon="globe" soft={soft} primary={primary}>
            {shortUrl(qr.url)}
          </PrintRow>
        </div>
      </div>
      <div style={{ display: "flex", height: 10, background: accent }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone: 1080 × 1920
// ---------------------------------------------------------------------------

function PhoneRow({ icon, label, value, last, soft, primary }: { icon: keyof typeof ICONS; label: string; value: string; last?: boolean; soft: string; primary: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "26px 0", borderBottom: last ? "none" : `2px solid ${LINE}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 76, height: 76, borderRadius: 999, background: soft, marginRight: 28 }}>
        <Icon name={icon} size={38} color={primary} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", fontSize: 24, fontWeight: 600, letterSpacing: 3, color: MUTED }}>{label.toUpperCase()}</div>
        <div style={{ display: "flex", fontSize: 36, fontWeight: 600, color: TEXT, marginTop: 4, lineHeight: 1.25 }}>{value}</div>
      </div>
    </div>
  );
}

function PhoneCard({ site: s, qr, fonts, logoUrl, devBanner }: SiteCardTemplateProps) {
  const { width, height } = CARD_SIZE.phone;
  const { primary, accent, soft } = getTheme(s.themeKey, s.kind).palette;
  const what = s.kind === "hospital" ? "Hospital" : (s.category?.name ?? "Clinic");
  const rows: { icon: keyof typeof ICONS; label: string; value: string }[] = [
    ...(s.emergencyPhone ? [{ icon: "phone" as const, label: "24×7 emergency", value: formatPhone(s.emergencyPhone) }] : []),
    ...(s.phones[0] && s.phones[0] !== s.emergencyPhone ? [{ icon: "phone" as const, label: "Call", value: formatPhone(s.phones[0]) }] : []),
    {
      icon: "pin",
      label: "Address",
      // Skip the area when the first line already names it ("Sample Road, Wakad").
      value: s.address.line1.toLowerCase().includes(s.address.area.name.toLowerCase())
        ? s.address.line1
        : [s.address.line1, s.address.area.name].filter(Boolean).join(", "),
    },
    { icon: "clock", label: "Timings", value: hoursText(s) },
  ];
  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: PAPER, color: TEXT, fontFamily: fonts.body }}>
      {devBanner && <DevBanner name={devBanner} />}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: 900, paddingTop: 96, background: primary, position: "relative", overflow: "hidden", textAlign: "center" }}>
        <div style={{ display: "flex", position: "absolute", top: -220, right: -200, width: 640, height: 640, borderRadius: 999, border: "3px solid rgba(255,255,255,0.08)" }} />
        <div style={{ display: "flex", fontSize: 26, fontWeight: 600, letterSpacing: 8, color: accent }}>DIGITAL VISITING CARD</div>
        <div style={{ display: "flex", marginTop: 56 }}>
          <Logo url={logoUrl} name={s.name} size={280} primary={primary} soft={soft} fonts={fonts} />
        </div>
        <div style={{ display: "flex", fontFamily: fonts.display, fontWeight: 600, fontSize: nameSize(s.name, 80), lineHeight: 1.08, color: "#FFFFFF", marginTop: 48, padding: "0 60px" }}>{s.name}</div>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: accent, marginTop: 18 }}>{what}</div>
        <div style={{ display: "flex", fontSize: 32, color: "rgba(255,255,255,0.82)", marginTop: 10 }}>
          {s.address.area.name}, {s.address.city.name}
        </div>
      </div>

      <div style={{ display: "flex", padding: "0 72px", marginTop: -110, position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", background: "#FFFFFF", borderRadius: 40, padding: "18px 48px", boxShadow: "0 30px 60px -20px rgba(0,0,0,0.25)" }}>
          {rows.map((r, i) => (
            <PhoneRow key={`${r.label}-${i}`} icon={r.icon} label={r.label} value={r.value} last={i === rows.length - 1} soft={soft} primary={primary} />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", padding: "0 96px" }}>
        <div style={{ display: "flex", padding: 10, borderRadius: 28, border: `3px solid ${LINE}`, background: "#FFFFFF" }}>
          <QrBlock qr={qr} px={260} radius={20} color={primary} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 48, flex: 1 }}>
          <div style={{ display: "flex", fontFamily: fonts.display, fontWeight: 600, fontSize: 46, lineHeight: 1.12, color: primary }}>Scan for timings and directions</div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: TEXT, marginTop: 18 }}>{shortUrl(qr.url)}</div>
        </div>
      </div>
      <div style={{ display: "flex", flex: 1 }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 100, background: primary, color: "#FFFFFF", fontSize: 24 }}>
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

import { Clock, MapPin, MessageCircle, Phone, Siren } from "lucide-react";
import { cn } from "@/lib/cn";
import type { PublicEstablishment } from "@/templates/types";
import { THEME_ICONS } from "@/themes/icons";
import { getTheme, type ThemeIconKey, type ThemePalette } from "@/themes/specialty";

/**
 * Miniature clinic / hospital site in a specialty theme, for homepage
 * illustrations (hero stage, specialty designs, sample gallery). Purpose-built,
 * not the live template: no JSON-LD, no viewport breakpoints. Decorative:
 * callers wrap it in an aria-hidden, inert frame.
 *
 * No server-only imports: client islands render it too.
 */

export interface MiniSiteData {
  themeKey: string;
  themeName: string;
  kind: "clinic" | "hospital";
  name: string;
  category: string;
  area: string;
  icon: ThemeIconKey;
  palette: ThemePalette;
  points: [string, string, string];
  services: string[];
  doctors: { name: string; specialty: string }[];
  beds?: number;
  href: string;
}

/** Slim, serialisable view of a sample site (keeps client payloads small). */
export function toMiniSite(site: PublicEstablishment): MiniSiteData {
  const theme = getTheme(site.themeKey, site.kind);
  return {
    themeKey: theme.key,
    themeName: theme.name,
    kind: site.kind,
    name: site.name,
    category: site.kind === "hospital" ? "Hospital" : (site.category?.name ?? "Clinic"),
    area: `${site.address.area.name}, ${site.address.city.name}`,
    icon: theme.icon,
    palette: theme.palette,
    points: theme.points,
    services: site.services.slice(0, 6).map((s) => s.name),
    doctors: site.doctors.slice(0, 3).map((d) => ({ name: d.name, specialty: d.specialty ?? "" })),
    ...(site.beds?.total ? { beds: site.beds.total } : {}),
    href: `/designs/${theme.key}`,
  };
}

function initials(name: string) {
  const parts = name.replace(/^(Dr\.?|Vaidya)\s+/i, "").split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

function Buttons({ s, small }: { s: MiniSiteData; small?: boolean }) {
  const { primary } = s.palette;
  const items = [
    { icon: Phone, label: "Call" },
    { icon: MessageCircle, label: "WhatsApp" },
    { icon: MapPin, label: "Directions" },
  ];
  return (
    <div className={cn("flex gap-1.5", small && "gap-1")}>
      {items.map(({ icon: Icon, label }, i) => (
        <span
          key={label}
          className={cn("inline-flex items-center gap-1 rounded-md border font-semibold", small ? "px-1.5 py-1 text-[8px]" : "px-2 py-1.5 text-[9.5px]")}
          style={i === 0 ? { background: primary, borderColor: primary, color: "#fff" } : { background: "#fff", borderColor: "#E5E7EB", color: primary }}
        >
          <Icon className={small ? "size-2.5" : "size-3"} strokeWidth={2} />
          {label}
        </span>
      ))}
    </div>
  );
}

function Header({ s, wide }: { s: MiniSiteData; wide?: boolean }) {
  const Icon = THEME_ICONS[s.icon];
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2" style={{ background: s.palette.primary, color: "#fff" }}>
      <span className="flex min-w-0 items-center gap-1.5 font-display text-[11px] font-semibold">
        <Icon className="size-3 shrink-0" strokeWidth={2} />
        <span className="truncate">{s.name}</span>
      </span>
      {wide && (
        <span className="flex shrink-0 gap-2.5 text-[8.5px] opacity-80">
          <span>Services</span>
          <span>Doctors</span>
          <span>Timings</span>
          <span>Location</span>
        </span>
      )}
    </div>
  );
}

function EmergencyBar({ s }: { s: MiniSiteData }) {
  if (s.kind !== "hospital") return null;
  return (
    <div className="flex items-center justify-center gap-1 py-1 text-[8.5px] font-semibold text-white" style={{ background: s.palette.accent }}>
      <Siren className="size-2.5" strokeWidth={2.25} /> 24×7 Emergency
    </div>
  );
}

function OpenChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-leaf/10 px-1.5 py-0.5 text-[8.5px] font-semibold text-leaf-text">
      <span className="size-1 rounded-full bg-leaf" /> Open now
    </span>
  );
}

/** Phone-width miniature (designed at 242 px). */
export function MiniSitePhone({ site: s }: { site: MiniSiteData }) {
  const { primary, soft } = s.palette;
  return (
    <div className="bg-white text-left text-[10px] leading-snug text-body">
      <EmergencyBar s={s} />
      <Header s={s} />
      <div className="space-y-2 px-3 pb-3 pt-3" style={{ background: soft }}>
        <span className="inline-block rounded-full bg-white px-2 py-0.5 text-[8.5px] font-semibold" style={{ color: primary }}>
          {s.category}
        </span>
        <p className="font-display text-[17px] font-semibold leading-tight" style={{ color: primary }}>
          {s.name}
        </p>
        <p className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <MapPin className="size-2.5" strokeWidth={2} /> {s.area}
        </p>
        <div className="flex items-center gap-1.5 text-[9px]">
          {s.kind === "hospital" ? (
            <span className="font-semibold" style={{ color: primary }}>
              Open 24×7{s.beds ? ` · ${s.beds} beds` : ""}
            </span>
          ) : (
            <>
              <OpenChip /> <span>10 am – 1:30 pm</span>
            </>
          )}
        </div>
        <Buttons s={s} small />
      </div>
      <div className="px-3 pt-3">
        <p className="font-display text-[12px] font-semibold" style={{ color: primary }}>
          {s.kind === "hospital" ? "Departments" : "Services"}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {s.services.slice(0, 4).map((x) => (
            <span key={x} className="rounded-full px-2 py-0.5 text-[8.5px]" style={{ background: soft, color: primary }}>
              {x}
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-1.5 px-3 pb-5 pt-3">
        <p className="font-display text-[12px] font-semibold" style={{ color: primary }}>
          Doctors
        </p>
        {s.doctors.slice(0, 2).map((d) => (
          <div key={d.name} className="flex items-center gap-2 rounded-lg border border-line p-1.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full text-[8px] font-semibold" style={{ background: soft, color: primary }}>
              {initials(d.name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[9.5px] font-semibold text-ink">{d.name}</span>
              <span className="block truncate text-[8.5px] text-muted-foreground">{d.specialty}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Laptop-width miniature (designed at 520 px). */
export function MiniSiteLaptop({ site: s }: { site: MiniSiteData }) {
  const { primary, accent, soft } = s.palette;
  const Icon = THEME_ICONS[s.icon];
  return (
    <div className="bg-white text-left text-[10px] leading-snug text-body">
      <EmergencyBar s={s} />
      <Header s={s} wide />
      <div className="grid grid-cols-[1.4fr_1fr] items-center gap-4 px-5 py-5" style={{ background: soft }}>
        <div className="space-y-2">
          <span className="inline-block rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold" style={{ color: primary }}>
            {s.category} · {s.area}
          </span>
          <p className="font-display text-[22px] font-semibold leading-[1.1]" style={{ color: primary }}>
            {s.name}
          </p>
          <div className="flex items-center gap-1.5 text-[9.5px]">
            {s.kind === "hospital" ? (
              <span className="font-semibold" style={{ color: primary }}>
                Open 24×7{s.beds ? ` · ${s.beds} beds` : ""}
              </span>
            ) : (
              <>
                <OpenChip /> <Clock className="size-3 text-muted-foreground" strokeWidth={2} /> Today 10 am – 1:30 pm, 5 – 8:30 pm
              </>
            )}
          </div>
          <Buttons s={s} />
        </div>
        <div className="relative flex aspect-[4/3] items-center justify-center rounded-xl bg-white/70">
          <span className="absolute right-3 top-3 size-6 rounded-full" style={{ background: accent, opacity: 0.85 }} />
          <span className="absolute bottom-3 left-3 size-3 rounded-full" style={{ background: primary, opacity: 0.7 }} />
          <Icon className="size-14" strokeWidth={1.25} style={{ color: primary }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 px-5 pt-4">
        {s.services.slice(0, 3).map((x) => (
          <div key={x} className="rounded-lg border border-line p-2">
            <span className="mb-1 block h-1 w-6 rounded-full" style={{ background: accent }} />
            <span className="block truncate text-[9.5px] font-semibold text-ink">{x}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 px-5 pb-5 pt-3">
        {s.doctors.slice(0, 3).map((d) => (
          <div key={d.name} className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg p-1.5" style={{ background: soft }}>
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-[8px] font-semibold" style={{ color: primary }}>
              {initials(d.name)}
            </span>
            <span className="min-w-0 truncate text-[9px] font-semibold text-ink">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

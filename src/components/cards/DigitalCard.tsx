import { Clock, Globe, MapPin, MessageCircle, Phone, UserPlus } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { qrForUrl } from "@/lib/cards/qr";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { openDaysSummary } from "@/lib/timings";
import type { PublicDoctor } from "@/templates/types";

/** MediReach brand colours (teal and amber). */
const BRAND = { highlight: "#F2994A", ink: "#0A3F3F", brand: "#0E7C7B", soft: "#E0F2F1" };

/**
 * A digital visiting card in MediReach colours (HTML): photo, name, one-tap
 * Call / WhatsApp / Directions / Save contact, clinic, timings and a QR code.
 * Only the homepage preview uses it (`nameAs="p"`, `priority={false}`): real
 * doctors' cards are the phone card of their website design (CardView).
 */
export function DigitalCard({
  doctor: d,
  websiteUrl,
  className,
  nameAs: Name = "h1",
  priority = true,
  compact = false,
}: {
  doctor: PublicDoctor;
  websiteUrl: string;
  className?: string;
  /** The name's element: "h1" on the card page, "p" where the page has its own h1. */
  nameAs?: "h1" | "h2" | "p";
  /** Preload the photo (the card page's LCP); off for below-the-fold previews. */
  priority?: boolean;
  /** Shorter version for the homepage: smaller photo and QR, tighter spacing, clinic name + area only. */
  compact?: boolean;
}) {
  const clinic = d.clinics[0];
  const phone = d.phone ?? clinic?.phone;
  const hours = clinic ? openDaysSummary(clinic.timings) : "";
  const qr = qrForUrl(d.shareUrl);
  const p = BRAND;
  const vars = { "--dc-hl": p.highlight, "--dc-ink": p.ink, "--dc-brand": p.brand, "--dc-soft": p.soft } as CSSProperties;

  const actions = [
    ...(phone ? [{ label: "Call", href: `tel:+${phone}`, icon: Phone, external: false }] : []),
    ...(d.whatsapp
      ? [{ label: "WhatsApp", href: `https://wa.me/${d.whatsapp}?text=${encodeURIComponent(`Hello ${d.fullName}, I got your visiting card.`)}`, icon: MessageCircle, external: true }]
      : []),
    ...(clinic ? [{ label: "Directions", href: clinic.directionsUrl, icon: MapPin, external: true }] : []),
    { label: "Save", href: d.vcfUrl, icon: UserPlus, external: false, download: true },
  ];

  return (
    <article
      aria-label={`${d.fullName} – digital visiting card`}
      style={vars}
      className={cn(
        "mx-auto w-full max-w-[420px] overflow-hidden bg-surface shadow-lift ring-1 ring-ink/5",
        compact ? "rounded-[28px]" : "rounded-[32px]",
        className,
      )}
    >
      <div className={cn("mr-ink-bg relative overflow-hidden px-6 text-center text-paper", compact ? "pb-16 pt-6" : "pb-20 pt-8")}>
        <span aria-hidden className="absolute -right-16 -top-16 size-56 rounded-full border border-paper/10" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-(--dc-hl)">Digital visiting card</p>
        <div className={cn("mx-auto rounded-full bg-(--dc-hl) p-[5px]", compact ? "mt-4 size-[96px] p-1" : "mt-6 size-[132px]")}>
          <div className="relative size-full overflow-hidden rounded-full bg-(--dc-soft)">
            {d.photo ? (
              <Image src={d.photo.url} alt={d.photo.alt} fill priority={priority} sizes={compact ? "96px" : "132px"} className="object-cover" />
            ) : (
              <span aria-hidden className={cn("flex size-full items-center justify-center font-display font-semibold text-(--dc-ink)", compact ? "text-3xl" : "text-4xl")}>
                {d.firstName[0]}
                {d.lastName[0]}
              </span>
            )}
          </div>
        </div>
        <Name className={cn("font-display font-semibold leading-tight", compact ? "mt-3 text-[24px]" : "mt-5 text-[28px]")}>{d.fullName}</Name>
        {d.primarySpecialty && <p className="mt-1.5 font-semibold text-(--dc-hl)">{d.primarySpecialty.name}</p>}
        {d.degreesLine && <p className="mt-1 text-sm text-paper/75">{d.degreesLine}</p>}
      </div>

      <nav aria-label="Contact" className={cn("relative px-5", compact ? "-mt-10 px-4" : "-mt-11")}>
        <ul className="grid grid-cols-4 gap-1 rounded-2xl bg-surface p-2 shadow-lift ring-1 ring-ink/5">
          {actions.map(({ label, href, icon: Icon, external, ...a }) => (
            <li key={label}>
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener" } : {})}
                {...("download" in a && a.download ? { download: "" } : {})}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold text-(--dc-ink) transition hover:bg-(--dc-soft) active:scale-[.97]",
                  compact ? "min-h-[54px]" : "min-h-[64px]",
                )}
              >
                <span className={label === "WhatsApp" ? "text-leaf-text" : "text-(--dc-brand)"}>
                  <Icon className="size-5" strokeWidth={1.9} />
                </span>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <ul className={cn("px-6 text-sm", compact ? "space-y-2.5 py-4" : "space-y-4 pb-6 pt-6")}>
        {phone && (
          <li className="flex items-start gap-3">
            <Phone aria-hidden className="mt-0.5 size-4 shrink-0 text-(--dc-brand)" strokeWidth={1.9} />
            <a href={`tel:+${phone}`} className="font-semibold text-(--dc-ink)">
              {formatPhone(phone)}
            </a>
          </li>
        )}
        {clinic && (
          <li className="flex items-start gap-3">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-(--dc-brand)" strokeWidth={1.9} />
            <span>
              <span className="block font-semibold text-(--dc-ink)">{clinic.name}</span>
              <span className="text-body/80">{compact ? `${clinic.area.name}, ${clinic.city.name}` : clinic.fullAddress}</span>
            </span>
          </li>
        )}
        {hours && (
          <li className="flex items-start gap-3">
            <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-(--dc-brand)" strokeWidth={1.9} />
            <span className="text-body/80">{hours}</span>
          </li>
        )}
        <li className="flex items-start gap-3">
          <Globe aria-hidden className="mt-0.5 size-4 shrink-0 text-(--dc-brand)" strokeWidth={1.9} />
          <a href={websiteUrl} className="break-all font-semibold text-(--dc-brand) underline-offset-4 hover:underline">
            {d.shareUrl.replace(/^https?:\/\//, "")}
          </a>
        </li>
      </ul>

      <div className={cn("flex items-center gap-4 border-t border-line bg-paper px-6", compact ? "py-3.5" : "py-5")}>
        <div className="shrink-0 rounded-xl bg-white p-2 ring-1 ring-line">
          <svg width={compact ? 64 : 96} height={compact ? 64 : 96} viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges" role="img" aria-label={`QR code for ${d.shareUrl}`}>
            <path d={qr.path} fill={p.ink} />
          </svg>
        </div>
        <p className="text-sm text-body/80">
          <span className={cn("block font-display font-semibold text-(--dc-ink)", compact ? "text-base" : "text-lg")}>Scan with any phone</span>
          {compact ? "Opens the website." : "Opens the website with timings, directions and contact."}
        </p>
      </div>
    </article>
  );
}

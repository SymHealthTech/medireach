import { Clock, Globe, MapPin, MessageCircle, Phone, UserPlus } from "lucide-react";
import Image from "next/image";
import { qrForUrl } from "@/lib/cards/qr";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { openDaysSummary } from "@/lib/timings";
import type { PublicDoctor } from "@/templates/types";

/**
 * The live digital visiting card (HTML): photo, name, one-tap Call /
 * WhatsApp / Directions / Save contact, clinic, timings and a QR code to the
 * doctor's website. Shown to patients and in the doctor's card tools.
 */
export function DigitalCard({
  doctor: d,
  websiteUrl,
  className,
}: {
  doctor: PublicDoctor;
  websiteUrl: string;
  className?: string;
}) {
  const clinic = d.clinics[0];
  const phone = d.phone ?? clinic?.phone;
  const hours = clinic ? openDaysSummary(clinic.timings) : "";
  const qr = qrForUrl(d.shareUrl);

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
      className={cn(
        "mx-auto w-full max-w-[420px] overflow-hidden rounded-[32px] bg-surface shadow-lift ring-1 ring-ink/5",
        className,
      )}
    >
      <div className="mr-ink-bg relative overflow-hidden px-6 pb-20 pt-8 text-center text-paper">
        <span aria-hidden className="absolute -right-16 -top-16 size-56 rounded-full border border-paper/10" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-marigold">Digital visiting card</p>
        <div className="mx-auto mt-6 size-[132px] rounded-full bg-marigold p-[5px]">
          <div className="relative size-full overflow-hidden rounded-full bg-sage">
            {d.photo ? (
              <Image src={d.photo.url} alt={d.photo.alt} fill priority sizes="132px" className="object-cover" />
            ) : (
              <span aria-hidden className="flex size-full items-center justify-center font-display text-4xl font-semibold text-ink">
                {d.firstName[0]}
                {d.lastName[0]}
              </span>
            )}
          </div>
        </div>
        <h1 className="mt-5 font-display text-[28px] font-semibold leading-tight">{d.fullName}</h1>
        {d.primarySpecialty && <p className="mt-1.5 font-semibold text-marigold">{d.primarySpecialty.name}</p>}
        {d.degreesLine && <p className="mt-1 text-sm text-paper/75">{d.degreesLine}</p>}
      </div>

      <nav aria-label="Contact" className="relative -mt-11 px-5">
        <ul className="grid grid-cols-4 gap-1 rounded-2xl bg-surface p-2 shadow-lift ring-1 ring-ink/5">
          {actions.map(({ label, href, icon: Icon, external, ...a }) => (
            <li key={label}>
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener" } : {})}
                {...("download" in a && a.download ? { download: "" } : {})}
                className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold text-ink transition hover:bg-mint active:scale-[.97]"
              >
                <span className={label === "WhatsApp" ? "text-leaf-text" : "text-lagoon"}>
                  <Icon className="size-5" strokeWidth={1.9} />
                </span>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <ul className="space-y-4 px-6 pb-6 pt-6 text-sm">
        {phone && (
          <li className="flex items-start gap-3">
            <Phone aria-hidden className="mt-0.5 size-4 shrink-0 text-lagoon" strokeWidth={1.9} />
            <a href={`tel:+${phone}`} className="font-semibold text-ink">
              {formatPhone(phone)}
            </a>
          </li>
        )}
        {clinic && (
          <li className="flex items-start gap-3">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-lagoon" strokeWidth={1.9} />
            <span>
              <span className="block font-semibold text-ink">{clinic.name}</span>
              <span className="text-body/80">{clinic.fullAddress}</span>
            </span>
          </li>
        )}
        {hours && (
          <li className="flex items-start gap-3">
            <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-lagoon" strokeWidth={1.9} />
            <span className="text-body/80">{hours}</span>
          </li>
        )}
        <li className="flex items-start gap-3">
          <Globe aria-hidden className="mt-0.5 size-4 shrink-0 text-lagoon" strokeWidth={1.9} />
          <a href={websiteUrl} className="break-all font-semibold text-lagoon underline-offset-4 hover:underline">
            {d.shareUrl.replace(/^https?:\/\//, "")}
          </a>
        </li>
      </ul>

      <div className="flex items-center gap-4 border-t border-line bg-paper px-6 py-5">
        <div className="shrink-0 rounded-xl bg-white p-2 ring-1 ring-line">
          <svg width={96} height={96} viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges" role="img" aria-label={`QR code for ${d.shareUrl}`}>
            <path d={qr.path} fill="#0E3B3C" />
          </svg>
        </div>
        <p className="text-sm text-body/80">
          <span className="block font-display text-lg font-semibold text-ink">Scan with any phone</span>
          Opens the website with timings, directions and contact.
        </p>
      </div>
    </article>
  );
}

import Image from "next/image";
import { AlertTriangle, Globe, IdCard, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { ClinicHours } from "@/components/public/ClinicHours";
import { ChipList, listingBtn, listingCard, ListingSection, MoreLinks, QuickFactList, WebsiteCallout } from "@/components/public/ListingParts";
import { PublicFooter, PublicHeader } from "@/components/public/PublicShell";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { formatPhone } from "@/lib/phone";
import { establishmentBreadcrumbs, establishmentIntro, establishmentJsonLd, establishmentQuickFacts, establishmentSubheading, seoInputOf } from "@/lib/seo/establishment";
import type { PublicEstablishment } from "@/templates/types";

/**
 * A clinic's or hospital's MediReach listing (/[city]/clinic/[slug],
 * /[city]/hospital/[slug]): MediReach's own page about it, linking to its own
 * website on the subdomain. Different content from the website, so Google can
 * show both. Factual only: no ratings or reviews, ever.
 */
export function SiteListing({ site: s }: { site: PublicEstablishment }) {
  const crumbs = establishmentBreadcrumbs(s);
  const phone = s.phones[0];
  const initials = s.name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <JsonLd data={establishmentJsonLd(s, "listing")} />
      <PublicHeader />
      <main className="mx-auto max-w-content space-y-8 px-4 pt-4 sm:px-6 sm:pt-6">
        <Breadcrumbs crumbs={crumbs} />

        <header className={`${listingCard} flex flex-col gap-5 sm:flex-row sm:items-center`}>
          {s.logo ? (
            <Image src={s.logo.url} alt={s.logo.alt} width={112} height={112} priority className="size-28 shrink-0 rounded-2xl object-cover" />
          ) : (
            <span aria-hidden className="flex size-28 shrink-0 items-center justify-center rounded-2xl bg-lagoon font-display text-3xl font-semibold text-white">
              {initials}
            </span>
          )}
          <div className="min-w-0 flex-1 space-y-1.5">
            <h1 className="font-display text-[30px] font-semibold leading-[1.15] text-ink sm:text-4xl">{s.name}</h1>
            <p className="flex items-center gap-1.5 font-semibold text-lagoon">
              <MapPin aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
              {establishmentSubheading(s)}
            </p>
            {s.tagline && <p className="text-body">{s.tagline}</p>}
            <div className="flex flex-wrap gap-2 pt-3">
              <a href={s.websiteUrl} className={listingBtn.primary}>
                <Globe aria-hidden className="size-4" strokeWidth={1.9} /> Visit website
              </a>
              {phone && (
                <a href={`tel:+${phone}`} className={listingBtn.outline}>
                  <Phone aria-hidden className="size-4" strokeWidth={1.9} /> {formatPhone(phone)}
                </a>
              )}
              {s.emergencyPhone && s.emergencyPhone !== phone && (
                <a href={`tel:+${s.emergencyPhone}`} className={listingBtn.outline}>
                  <AlertTriangle aria-hidden className="size-4" strokeWidth={1.9} /> Emergency {formatPhone(s.emergencyPhone)}
                </a>
              )}
              {s.whatsapp && (
                <a href={`https://wa.me/${s.whatsapp}`} className={listingBtn.outline} rel="nofollow">
                  <MessageCircle aria-hidden className="size-4" strokeWidth={1.9} /> WhatsApp
                </a>
              )}
              <a href={s.directionsUrl} className={listingBtn.outline} rel="nofollow">
                <Navigation aria-hidden className="size-4" strokeWidth={1.9} /> Directions
              </a>
              {s.cardUrl && (
                <a href={s.cardUrl} className={listingBtn.outline} rel="nofollow">
                  <IdCard aria-hidden className="size-4" strokeWidth={1.9} /> Visiting card
                </a>
              )}
            </div>
          </div>
        </header>

        <ListingSection title={`About ${s.name}`}>
          <div className="max-w-3xl space-y-3 text-body">
            <p>{establishmentIntro(seoInputOf(s))}</p>
            {s.shortDescription && <p>{s.shortDescription}</p>}
          </div>
        </ListingSection>

        <ListingSection title="Timings and address">
          <div className={`${listingCard} grid gap-4 md:grid-cols-2`}>
            <div className="space-y-1">
              <p className="text-body">{s.address.fullAddress}</p>
              {s.address.landmark && <p className="text-sm text-muted-foreground">Landmark: {s.address.landmark}</p>}
              {s.address.parkingNote && <p className="text-sm text-muted-foreground">{s.address.parkingNote}</p>}
            </div>
            <div className="space-y-2">
              {s.is24x7 ? <p className="font-semibold text-leaf-text">Open 24 hours, all 7 days</p> : <ClinicHours timings={s.timings} />}
              {s.appointmentNote && <p className="text-sm text-muted-foreground">{s.appointmentNote}</p>}
              {s.visitingHours && <p className="text-sm text-muted-foreground">Visiting hours: {s.visitingHours}</p>}
            </div>
          </div>
        </ListingSection>

        {s.doctors.length > 0 && (
          <ListingSection title="Doctors">
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {s.doctors.map((d) => (
                <li key={d.id ?? d.name} className={listingCard}>
                  {d.url ? (
                    <a href={d.url} {...(d.external ? { rel: "noopener nofollow", target: "_blank" } : {})} className="font-display text-lg font-semibold text-ink hover:underline">
                      {d.name}
                    </a>
                  ) : (
                    <p className="font-display text-lg font-semibold text-ink">{d.name}</p>
                  )}
                  {(d.specialty || d.role) && <p className="text-sm text-body">{[d.specialty, d.role].filter(Boolean).join(" · ")}</p>}
                  {d.qualifications && <p className="text-sm text-muted-foreground">{d.qualifications}</p>}
                </li>
              ))}
            </ul>
          </ListingSection>
        )}

        {s.departments.length > 0 && (
          <ListingSection title="Departments">
            <ChipList items={s.departments.map((d) => d.name)} />
          </ListingSection>
        )}

        {s.services.length > 0 && (
          <ListingSection title="Services">
            <ChipList items={[...new Set(s.services.map((x) => x.name))]} />
          </ListingSection>
        )}

        {s.facilities.length > 0 && (
          <ListingSection title="Facilities">
            <ChipList items={[...new Set(s.facilities.map((x) => x.name))]} />
          </ListingSection>
        )}

        <ListingSection title="Quick facts">
          <QuickFactList facts={establishmentQuickFacts(s)} />
        </ListingSection>

        <WebsiteCallout name={s.name} url={s.websiteUrl} />

        <MoreLinks crumbs={crumbs} />
      </main>
      <PublicFooter>
        <p className="text-paper/70">Information provided by {s.name}. MediReach lists clinics and hospitals in alphabetical order and never ranks or rates them.</p>
      </PublicFooter>
    </>
  );
}

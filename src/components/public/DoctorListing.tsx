import { Globe, IdCard, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { ClinicHours } from "@/components/public/ClinicHours";
import { DoctorAvatar } from "@/components/public/DoctorAvatar";
import { ChipList, listingBtn, listingCard, ListingSection, MoreLinks, QuickFactList, WebsiteCallout } from "@/components/public/ListingParts";
import { PublicFooter, PublicHeader } from "@/components/public/PublicShell";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { formatPhone } from "@/lib/phone";
import { introSentence, primaryClinic, profileBreadcrumbs, profileJsonLd, profileSubheading, quickFacts } from "@/lib/seo/profile";
import type { PublicDoctor } from "@/templates/types";

/**
 * The doctor's MediReach listing (/[city]/doctor/[slug]): MediReach's own page
 * about the doctor, with the facts patients search for and a prominent link
 * to the doctor's own website on their subdomain. Different content from the
 * website, so Google can show both. No ratings or reviews, ever (NMC).
 */
export function DoctorListing({ doctor: d }: { doctor: PublicDoctor }) {
  const crumbs = profileBreadcrumbs(d);
  const clinic = primaryClinic(d);
  const phone = d.phone ?? clinic?.phone;
  const services = d.services.map((s) => s.name);
  const specialties = [d.primarySpecialty, ...d.secondarySpecialties].filter(Boolean).map((s) => s!.name);

  return (
    <>
      <JsonLd data={profileJsonLd(d, "listing")} />
      <PublicHeader />
      <main className="mx-auto max-w-content space-y-8 px-4 pt-4 sm:px-6 sm:pt-6">
        <Breadcrumbs crumbs={crumbs} />

        <header className={`${listingCard} flex flex-col gap-5 sm:flex-row sm:items-center`}>
          <DoctorAvatar name={d.fullName} photo={d.photo} size={112} sizes="112px" priority />
          <div className="min-w-0 flex-1 space-y-1.5">
            <h1 className="font-display text-[30px] font-semibold leading-[1.15] text-ink sm:text-4xl">{d.fullName}</h1>
            {d.degreesLine && <p className="text-body">{d.degreesLine}</p>}
            {profileSubheading(d) && (
              <p className="flex items-center gap-1.5 font-semibold text-lagoon">
                <MapPin aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
                {profileSubheading(d)}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-3">
              <a href={d.websiteUrl} className={listingBtn.primary}>
                <Globe aria-hidden className="size-4" strokeWidth={1.9} /> Visit website
              </a>
              {phone && (
                <a href={`tel:+${phone}`} className={listingBtn.outline}>
                  <Phone aria-hidden className="size-4" strokeWidth={1.9} /> {formatPhone(phone)}
                </a>
              )}
              {d.whatsapp && (
                <a href={`https://wa.me/${d.whatsapp}`} className={listingBtn.outline} rel="nofollow">
                  <MessageCircle aria-hidden className="size-4" strokeWidth={1.9} /> WhatsApp
                </a>
              )}
              {d.cardUrl && (
                <a href={d.cardUrl} className={listingBtn.outline} rel="nofollow">
                  <IdCard aria-hidden className="size-4" strokeWidth={1.9} /> Visiting card
                </a>
              )}
            </div>
          </div>
        </header>

        <ListingSection title={`About ${d.fullName}`}>
          <div className="max-w-3xl space-y-3 text-body">
            <p>{introSentence(d)}</p>
            {d.shortBio && <p>{d.shortBio}</p>}
          </div>
        </ListingSection>

        {d.clinics.length > 0 && (
          <ListingSection title={d.clinics.length === 1 ? "Clinic, timings and address" : "Clinics, timings and addresses"}>
            <ul className="grid gap-3 md:grid-cols-2">
              {d.clinics.map((c) => (
                <li key={c.id} className={`${listingCard} space-y-3`}>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink">{c.name}</h3>
                    <p className="text-sm text-body">{c.fullAddress}</p>
                  </div>
                  <ClinicHours timings={c.timings} />
                  {c.appointmentNote && <p className="text-sm text-muted-foreground">{c.appointmentNote}</p>}
                  <div className="flex flex-wrap gap-2">
                    <a href={c.directionsUrl} className={listingBtn.outline} rel="nofollow">
                      <Navigation aria-hidden className="size-4" strokeWidth={1.9} /> Directions
                    </a>
                    {c.phone && (
                      <a href={`tel:+${c.phone}`} className={listingBtn.outline}>
                        <Phone aria-hidden className="size-4" strokeWidth={1.9} /> {formatPhone(c.phone)}
                      </a>
                    )}
                    {c.site && (
                      <a href={c.site.url} className={listingBtn.outline}>
                        <Globe aria-hidden className="size-4" strokeWidth={1.9} /> {c.site.name} website
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </ListingSection>
        )}

        {(specialties.length > 0 || services.length > 0) && (
          <ListingSection title="Specialities and services">
            <ChipList items={[...new Set([...specialties, ...services])]} />
          </ListingSection>
        )}

        {d.conditionsTreated.length > 0 && (
          <ListingSection title="Conditions treated">
            <ChipList items={d.conditionsTreated} />
          </ListingSection>
        )}

        {d.qualifications.length > 0 && (
          <ListingSection title="Education">
            <ul className="space-y-1.5 text-body">
              {d.qualifications.map((q) => (
                <li key={`${q.degree}-${q.institute}`}>
                  <span className="font-semibold text-ink">
                    {q.degree}
                    {q.specialization ? ` (${q.specialization})` : ""}
                  </span>
                  {` – ${q.institute}${q.year ? `, ${q.year}` : ""}`}
                </li>
              ))}
            </ul>
          </ListingSection>
        )}

        <ListingSection title="Quick facts">
          <QuickFactList facts={quickFacts(d)} />
        </ListingSection>

        <WebsiteCallout name={d.fullName} url={d.websiteUrl} />

        <MoreLinks crumbs={crumbs} />
      </main>
      <PublicFooter>
        <p className="text-paper/70">
          Information provided by {d.fullName}. MediReach lists doctors in alphabetical order and never ranks or rates them.
        </p>
      </PublicFooter>
    </>
  );
}

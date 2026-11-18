import { DoctorCardGrid } from "@/components/public/DoctorCard";
import { PublicFooter, PublicHeader } from "@/components/public/PublicShell";
import { SiteCardGrid } from "@/components/public/SiteCard";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import type { HubLink } from "@/lib/public/hubs";
import { breadcrumbJsonLd, itemListJsonLd, siteItemListJsonLd, type Crumb } from "@/lib/seo/profile";
import { absUrl } from "@/lib/site";
import type { DoctorCardData, SiteCardData } from "@/templates/types";

export interface HubLinkGroup {
  title: string;
  links: HubLink[];
}

/** A list of clinics/hospitals on a hub, with its own heading. */
export interface HubSiteList {
  title: string;
  sites: SiteCardData[];
}

/**
 * Shared layout for every hub page: doctor hubs (city / specialty / area /
 * specialty+area) and clinic/hospital hubs. Lists are alphabetical only.
 */
export function HubPage({
  title,
  intro,
  crumbs,
  doctors,
  doctorsTitle,
  siteLists = [],
  emptyText = "No doctors are listed here yet.",
  emptyCta = "Are you a doctor? Get your page on MediReach",
  linkGroups,
}: {
  title: string;
  intro: string;
  crumbs: Crumb[];
  /** Omit on hubs that don't list doctors (city hub, clinic/hospital hubs). */
  doctors?: DoctorCardData[];
  /** Heading above the doctors when the hub also lists clinics/hospitals. */
  doctorsTitle?: string;
  /** Clinic/hospital lists (empty ones are hidden). */
  siteLists?: HubSiteList[];
  /** Shown when nothing at all is listed. */
  emptyText?: string;
  emptyCta?: string;
  linkGroups: HubLinkGroup[];
}) {
  const groups = linkGroups.filter((g) => g.links.length > 0);
  const lists = siteLists.filter((l) => l.sites.length > 0);
  const hasDoctors = Boolean(doctors?.length);
  const listsSomething = doctors !== undefined || siteLists.length > 0;
  const empty = listsSomething && !hasDoctors && lists.length === 0;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            ...(hasDoctors ? [itemListJsonLd(doctorsTitle ?? title, doctors!)] : []),
            ...lists.map((l) => siteItemListJsonLd(l.title, l.sites)),
            breadcrumbJsonLd(crumbs),
          ],
        }}
      />
      <PublicHeader />
      <main className="mx-auto max-w-content space-y-8 px-4 pt-4 sm:px-6 sm:pt-6">
        <Breadcrumbs crumbs={crumbs} />
        <header className="space-y-3">
          <h1 className="font-display text-[34px] font-semibold leading-[1.15] text-ink sm:text-5xl">{title}</h1>
          <p className="max-w-2xl text-body">{intro}</p>
        </header>

        {hasDoctors && (
          <section aria-label={doctorsTitle ?? "Doctors"} className="space-y-3">
            {doctorsTitle && <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">{doctorsTitle}</h2>}
            <DoctorCardGrid doctors={doctors!} />
            <p className="text-sm text-muted-foreground">Listed alphabetically by name.</p>
          </section>
        )}

        {lists.map((l) => (
          <section key={l.title} aria-label={l.title} className="space-y-3">
            {(hasDoctors || lists.length > 1 || siteLists.length > 1) && <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">{l.title}</h2>}
            <SiteCardGrid sites={l.sites} />
            <p className="text-sm text-muted-foreground">Listed alphabetically by name.</p>
          </section>
        ))}

        {empty && (
          <section className="rounded-xl border border-dashed border-line bg-surface p-8 text-center">
            <p className="text-body">{emptyText}</p>
            <a href={absUrl("/")} className="mt-3 inline-block font-semibold text-ink underline underline-offset-2">
              {emptyCta}
            </a>
          </section>
        )}

        {groups.map((g) => (
          <section key={g.title} aria-label={g.title} className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">{g.title}</h2>
            <ul className="flex flex-wrap gap-2">
              {g.links.map((l) => (
                <li key={l.url}>
                  <a
                    href={l.url}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm text-ink hover:border-ink/40"
                  >
                    {l.name}
                    <span className="text-muted-foreground">{l.count}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      <PublicFooter />
    </>
  );
}

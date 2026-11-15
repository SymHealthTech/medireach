import { DoctorCardGrid } from "@/components/public/DoctorCard";
import { PublicFooter, PublicHeader } from "@/components/public/PublicShell";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import type { HubLink } from "@/lib/public/hubs";
import { breadcrumbJsonLd, itemListJsonLd, type Crumb } from "@/lib/seo/profile";
import { absUrl } from "@/lib/site";
import type { DoctorCardData } from "@/templates/types";

export interface HubLinkGroup {
  title: string;
  links: HubLink[];
}

/** Shared layout for every hub page (city / specialty / area / specialty+area). */
export function HubPage({
  title,
  intro,
  crumbs,
  doctors,
  linkGroups,
}: {
  title: string;
  intro: string;
  crumbs: Crumb[];
  /** Omit on the city hub, which links to specialties and areas instead of listing everyone. */
  doctors?: DoctorCardData[];
  linkGroups: HubLinkGroup[];
}) {
  const groups = linkGroups.filter((g) => g.links.length > 0);
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [...(doctors ? [itemListJsonLd(title, doctors)] : []), breadcrumbJsonLd(crumbs)],
        }}
      />
      <PublicHeader />
      <main className="mx-auto max-w-content space-y-8 px-4 pt-4 sm:px-6 sm:pt-6">
        <Breadcrumbs crumbs={crumbs} />
        <header className="space-y-3">
          <h1 className="font-display text-[34px] font-semibold leading-[1.15] text-ink sm:text-5xl">{title}</h1>
          <p className="max-w-2xl text-body">{intro}</p>
        </header>

        {!doctors ? null : doctors.length > 0 ? (
          <section aria-label="Doctors">
            <DoctorCardGrid doctors={doctors} />
            <p className="mt-3 text-sm text-muted-foreground">Listed alphabetically by name.</p>
          </section>
        ) : (
          <section className="rounded-xl border border-dashed border-line bg-surface p-8 text-center">
            <p className="text-body">No doctors are listed here yet.</p>
            <a href={absUrl("/")} className="mt-3 inline-block font-semibold text-ink underline underline-offset-2">
              Are you a doctor? Get your page on MediReach
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

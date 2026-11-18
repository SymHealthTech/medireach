import { MapPin } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  establishmentBreadcrumbs,
  establishmentIntro,
  establishmentJsonLd,
  establishmentQuickFacts,
  establishmentSubheading,
  seoInputOf,
} from "@/lib/seo/establishment";
import { resolveSiteTemplate, type ReadyTemplates } from "@/templates/registry";
import type { PublicEstablishment } from "@/templates/types";

/**
 * The shared SEO wrapper around a clinic/hospital site template: JSON-LD, H1,
 * intro sentence, breadcrumbs and quick facts are rendered here, identically
 * for every design. Used by the public pages and the admin preview.
 */
export function SiteView({ site: s, ready, jsonLd = true }: { site: PublicEstablishment; ready?: ReadyTemplates; jsonLd?: boolean }) {
  const Template = resolveSiteTemplate(s.kind, s.siteTemplateId, ready);

  const heading = (
    <div>
      <h1 className="font-display text-[34px] font-semibold leading-[1.1] tracking-tight text-[var(--theme-primary)] sm:text-[44px] lg:text-[52px]">{s.name}</h1>
      <p className="mt-2 flex items-center gap-1.5 text-base font-semibold text-body/80 sm:text-lg">
        <MapPin aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
        {establishmentSubheading(s)}
      </p>
    </div>
  );

  const facts = establishmentQuickFacts(s);
  const quickFacts = (
    <dl className="grid gap-4 md:grid-cols-2">
      {facts.map((f) => (
        <div key={f.question} className="rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-ink/5">
          <dt className="font-semibold text-ink">{f.question}</dt>
          <dd className="mt-1.5 text-body/85">{f.answer}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <>
      {jsonLd && <JsonLd data={establishmentJsonLd(s)} />}
      <Template
        site={s}
        seo={{
          heading,
          intro: <p>{establishmentIntro(seoInputOf(s))}</p>,
          breadcrumbs: <Breadcrumbs crumbs={establishmentBreadcrumbs(s)} />,
          quickFacts,
        }}
      />
    </>
  );
}

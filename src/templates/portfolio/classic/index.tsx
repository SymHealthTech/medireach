import { Building2, GraduationCap, Mail, MapPin, Phone } from "lucide-react";
import { ClinicHours } from "@/components/public/ClinicHours";
import { DoctorAvatar } from "@/components/public/DoctorAvatar";
import { Gallery } from "@/components/public/Gallery";
import { formatPhone } from "@/lib/phone";
import type { PortfolioTemplateProps, PublicClinic } from "@/templates/types";
import { ContactActions } from "./ContactActions";

/**
 * Classic portfolio template (DESIGN_BRIEF.md §5). Presentation only: the H1,
 * intro sentence, breadcrumbs, quick facts, nearby doctors and JSON-LD come
 * from the shared wrapper, so every template emits identical SEO markup.
 *
 * NMC: no ratings, stars, review counts or testimonials anywhere.
 */

const CLINIC_TYPE_LABEL: Record<PublicClinic["type"], string> = {
  own_clinic: "Own clinic",
  hospital_visiting: "Visiting consultant",
  other: "Clinic",
};

const LINK_LABELS: Record<string, string> = {
  website: "Website",
  googleBusiness: "Google Business Profile",
  practo: "Practo",
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};

function Section({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-line bg-surface p-5 shadow-soft sm:p-6">
      <h2 id={id} className="font-display text-xl font-semibold text-ink sm:text-2xl">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className="rounded-full bg-sage px-3 py-1.5 text-sm text-ink">
          {item}
        </li>
      ))}
    </ul>
  );
}

function ClinicCard({ clinic }: { clinic: PublicClinic }) {
  return (
    <article className="rounded-xl border border-line bg-paper p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-ink">{clinic.name}</h3>
        <span className="rounded-full bg-sage px-2.5 py-0.5 text-xs font-medium text-ink">
          {CLINIC_TYPE_LABEL[clinic.type]}
        </span>
      </div>
      <address className="mt-2 flex gap-2 not-italic text-sm text-body">
        <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
        {clinic.fullAddress}
      </address>
      {clinic.phone && (
        <p className="mt-1.5 flex items-center gap-2 text-sm">
          <Phone aria-hidden className="h-4 w-4 text-muted" strokeWidth={1.75} />
          <a href={`tel:+${clinic.phone}`} className="text-ink underline-offset-2 hover:underline">
            {formatPhone(clinic.phone)}
          </a>
        </p>
      )}
      <div className="mt-4">
        <ClinicHours timings={clinic.timings} />
      </div>
      {clinic.appointmentNote && <p className="mt-3 text-sm text-body">{clinic.appointmentNote}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={clinic.directionsUrl}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border border-line bg-surface px-4 text-sm font-semibold text-ink hover:border-ink/40"
        >
          <MapPin aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Open in Maps
        </a>
        {typeof clinic.fee === "number" && (
          <span className="text-sm text-body">
            Consultation fee: <strong className="font-semibold text-ink">₹{clinic.fee.toLocaleString("en-IN")}</strong>
          </span>
        )}
      </div>
    </article>
  );
}

export default function ClassicPortfolio({ doctor: d, seo }: PortfolioTemplateProps) {
  const reg = [d.registration.council, d.registration.number].filter(Boolean).join(" ");
  const services = d.services.map((s) => s.name);

  return (
    <div className="space-y-5">
      {/* 1. Header card */}
      <header className="rounded-xl bg-paper pt-2 sm:pt-4">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left">
          <DoctorAvatar
            name={d.fullName}
            photo={d.photo}
            size={160}
            sizes="(min-width: 640px) 160px, 120px"
            priority
            ring
            className="!h-[120px] !w-[120px] sm:!h-[160px] sm:!w-[160px]"
          />
          <div className="min-w-0 space-y-2">
            {seo.heading}
            {d.degreesLine && <p className="text-body">{d.degreesLine}</p>}
            {reg && <p className="text-sm text-muted">Registration: {reg}</p>}
            {d.practiceSinceYear && <p className="text-sm text-muted">In practice since {d.practiceSinceYear}</p>}
          </div>
        </div>
        <div className="mt-5">
          <ContactActions doctor={d} variant="inline" />
        </div>
      </header>

      {/* 2. Intro + bio */}
      <Section title="About" id="about">
        <div className="space-y-3 text-body">
          {seo.intro}
          {d.shortBio && <p>{d.shortBio}</p>}
          {d.fullBioHtml && <div className="prose-bio" dangerouslySetInnerHTML={{ __html: d.fullBioHtml }} />}
          {d.languages.length > 0 && (
            <p className="text-sm text-muted">Languages: {d.languages.join(", ")}</p>
          )}
        </div>
      </Section>

      {/* 3. Clinics */}
      {d.clinics.length > 0 && (
        <Section title={d.clinics.length > 1 ? "Clinics and timings" : "Clinic and timings"} id="clinics">
          <div className="space-y-4">
            {d.clinics.map((c) => (
              <ClinicCard key={c.id} clinic={c} />
            ))}
          </div>
        </Section>
      )}

      {/* 4. Services and conditions */}
      {(services.length > 0 || d.conditionsTreated.length > 0) && (
        <Section title="Services" id="services">
          <div className="space-y-5">
            {services.length > 0 && <Chips items={services} />}
            {d.conditionsTreated.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted">Conditions treated</h3>
                <Chips items={d.conditionsTreated} />
              </div>
            )}
          </div>
        </Section>
      )}

      {/* 5. Qualifications */}
      {d.qualifications.length > 0 && (
        <Section title="Qualifications" id="qualifications">
          <ol className="relative space-y-5 border-l-2 border-sage pl-6">
            {d.qualifications.map((q, i) => (
              <li key={`${q.degree}-${i}`} className="relative">
                <span aria-hidden className="absolute -left-[33px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-marigold">
                  <GraduationCap className="h-2.5 w-2.5 text-ink" strokeWidth={2.5} />
                </span>
                <p className="font-semibold text-ink">
                  {q.degree}
                  {q.specialization && !q.degree.includes("(") ? ` (${q.specialization})` : ""}
                </p>
                <p className="text-sm text-body">
                  {q.institute}
                  {q.year ? `, ${q.year}` : ""}
                </p>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* 6. Awards, memberships, publications */}
      {(d.awards.length > 0 || d.memberships.length > 0 || d.publications.length > 0) && (
        <Section title="Awards and memberships" id="recognition">
          <div className="space-y-5">
            {d.awards.length > 0 && (
              <ul className="space-y-2">
                {d.awards.map((a) => (
                  <li key={`${a.title}-${a.year}`}>
                    <span className="font-semibold text-ink">{a.title}</span>
                    <span className="text-body">
                      {" "}
                      – {a.awardingBody}, {a.year}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {d.memberships.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted">Memberships</h3>
                <ul className="space-y-1.5">
                  {d.memberships.map((m) => (
                    <li key={m.name} className="flex gap-2 text-body">
                      <Building2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                      {m.name}
                      {m.since ? ` (since ${m.since})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {d.publications.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted">Publications</h3>
                <ul className="space-y-1.5 text-body">
                  {d.publications.map((p) => (
                    <li key={p.title}>
                      {p.url ? (
                        <a href={p.url} target="_blank" rel="noopener" className="text-ink underline underline-offset-2">
                          {p.title}
                        </a>
                      ) : (
                        p.title
                      )}
                      {[p.journal, p.year].filter(Boolean).length > 0 && (
                        <span className="text-muted"> – {[p.journal, p.year].filter(Boolean).join(", ")}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* 7. Gallery */}
      {d.gallery.length > 0 && (
        <Section title="Gallery" id="gallery">
          <Gallery images={d.gallery} />
        </Section>
      )}

      {/* 8. Beyond medicine */}
      {d.interests.length > 0 && (
        <Section title="Beyond medicine" id="interests">
          <Chips items={d.interests} />
        </Section>
      )}

      {/* Contact and links */}
      {(d.email || Object.keys(d.links).length > 0) && (
        <Section title="Contact and links" id="links">
          <ul className="space-y-2 text-body">
            {d.email && (
              <li className="flex items-center gap-2">
                <Mail aria-hidden className="h-4 w-4 text-muted" strokeWidth={1.75} />
                <a href={`mailto:${d.email}`} className="text-ink underline-offset-2 hover:underline">
                  {d.email}
                </a>
              </li>
            )}
            {Object.entries(d.links).map(([key, href]) => (
              <li key={key}>
                <a href={href} target="_blank" rel="noopener me" className="text-ink underline underline-offset-2">
                  {LINK_LABELS[key] ?? key}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <ContactActions doctor={d} variant="sticky" />
    </div>
  );
}

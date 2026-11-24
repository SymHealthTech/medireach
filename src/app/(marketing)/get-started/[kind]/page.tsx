import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sampleCardFaces } from "@/components/cards/SampleCardFace";
import { IntakeForm } from "@/components/intake/IntakeForm";
import { INTAKE_KINDS, type IntakeKind } from "@/lib/constants";
import { CARD_STYLES_BY_GROUP } from "@/lib/cards/styles";
import { DESIGN_OPTIONS, INTAKE_KIND_LABEL } from "@/lib/intake/form";
import { intakePlaces, intakeSiteTypes } from "@/lib/intake/places";
import { intakeFor, toView } from "@/lib/intake/server";
import { getIntakeEmail } from "@/lib/intake/session";
import { getPublicSiteData } from "@/lib/public/site-data";

const isKind = (k: string): k is IntakeKind => (INTAKE_KINDS as readonly string[]).includes(k);

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  const { kind } = await params;
  return { title: isKind(kind) ? `${INTAKE_KIND_LABEL[kind]} form` : "Get started", robots: { index: false, follow: true } };
}

/**
 * Self-fill website form. Always starts blank (so the next doctor or a second
 * form never sees the last one). With ?continue=1 (Continue page, Edit, or a
 * refresh after saving) a browser with a form session (lib/intake/session.ts)
 * gets its saved form of this kind back. A new form can start with designs
 * picked on a product page (?design=…&card=…).
 */
export default async function IntakeFormPage({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<{ continue?: string; design?: string; card?: string }> }) {
  const [{ kind }, sp] = await Promise.all([params, searchParams]);
  if (!isKind(kind)) notFound();
  const [email, site, places, siteTypes] = await Promise.all([getIntakeEmail(), getPublicSiteData(), intakePlaces(), kind === "doctor" ? undefined : intakeSiteTypes(kind)]);
  const saved = email ? await intakeFor(email, kind) : null;
  const resume = sp.continue === "1" && saved;
  const prefill = {
    ...(DESIGN_OPTIONS[kind].some((d) => d.ready && d.value === sp.design) && { websiteDesign: sp.design }),
    ...(CARD_STYLES_BY_GROUP[kind].some((c) => c.code === sp.card) && { cardStyle: sp.card }),
  };
  return (
    <main className="mr-hero-bg -mt-16 px-4 pt-24 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-3xl">
        <IntakeForm
          key={resume ? saved._id.toString() : "new"}
          kind={kind}
          initial={resume ? toView(saved) : null}
          waNumber={site.whatsappNumber}
          cardFaces={sampleCardFaces(kind)}
          savedRef={!resume && saved ? saved.ref : undefined}
          prefill={prefill}
          places={places}
          siteTypes={siteTypes}
        />
      </div>
    </main>
  );
}

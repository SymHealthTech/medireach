import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IntakeForm } from "@/components/intake/IntakeForm";
import { INTAKE_KINDS, type IntakeKind } from "@/lib/constants";
import { INTAKE_KIND_LABEL } from "@/lib/intake/form";
import { intakeFor, toView } from "@/lib/intake/server";
import { getIntakeEmail } from "@/lib/intake/session";
import { getPublicSiteData } from "@/lib/public/site-data";

const isKind = (k: string): k is IntakeKind => (INTAKE_KINDS as readonly string[]).includes(k);

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  const { kind } = await params;
  return { title: isKind(kind) ? `${INTAKE_KIND_LABEL[kind]} form` : "Get started", robots: { index: false, follow: true } };
}

/**
 * Self-fill website form. A browser with a form session (lib/intake/session.ts)
 * gets its saved form of this kind back; anyone else starts blank.
 */
export default async function IntakeFormPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isKind(kind)) notFound();
  const [email, site] = await Promise.all([getIntakeEmail(), getPublicSiteData()]);
  const saved = email ? await intakeFor(email, kind) : null;
  return (
    <main className="mr-hero-bg -mt-16 px-4 pt-24 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-3xl">
        <IntakeForm kind={kind} initial={saved ? toView(saved) : null} sessionEmail={email} waNumber={site.whatsappNumber} />
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { ContinueForms } from "@/components/intake/ContinueForms";
import { intakeName, type IntakeData } from "@/lib/intake/form";
import { intakesForEmail } from "@/lib/intake/server";
import { getIntakeEmail } from "@/lib/intake/session";

export const metadata: Metadata = { title: "Continue your form", robots: { index: false, follow: false } };

/** Return to saved website forms: email → one-time code → list of this email's forms. */
export default async function ContinuePage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const [{ email: emailParam }, session] = await Promise.all([searchParams, getIntakeEmail()]);
  const docs = session ? await intakesForEmail(session) : [];
  const forms = docs.map((d) => ({
    id: String(d._id),
    kind: d.kind,
    ref: d.ref,
    status: d.status,
    name: intakeName(d.kind, (d.data ?? {}) as IntakeData),
    lastSavedAt: new Date(d.lastSavedAt).toISOString(),
  }));
  return (
    <main className="mr-hero-bg -mt-16 px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-xl rounded-3xl bg-surface p-6 shadow-lift ring-1 ring-ink/5 sm:p-8">
        <ContinueForms sessionEmail={session} initialForms={session ? forms : null} defaultEmail={typeof emailParam === "string" ? emailParam.slice(0, 254) : ""} />
      </div>
    </main>
  );
}

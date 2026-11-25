import { notFound } from "next/navigation";
import { DoctorSelfEditor } from "@/components/account/DoctorSelfEditor";
import { UidBadge } from "@/components/account/UidBadge";
import { demoDoctor, demoDoctorForm, demoEditorOptions } from "@/fixtures/demo-doctors/dashboard";

/** Demo of the doctor's full self-editor (same screen as /account/profile; nothing is saved). */
export default async function DemoProfilePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const d = demoDoctor(key);
  if (!d) notFound();
  const form = demoDoctorForm(d);
  return (
    <main className="space-y-6 pb-24 pt-6 lg:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Your website</h1>
          <p className="mt-1 text-body">Update anything: your details, photos, services, clinics, timings, awards and design. Changes go live when you save.</p>
        </div>
        <UidBadge uid={form.uid!} />
      </div>
      <DoctorSelfEditor initial={form} options={demoEditorOptions()} demo />
    </main>
  );
}

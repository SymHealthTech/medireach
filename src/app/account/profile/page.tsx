import { DoctorSelfEditor } from "@/components/account/DoctorSelfEditor";
import { DOCTOR_SELF_STEPS, type DoctorSelfStep } from "@/lib/self-edit";
import { UidBadge } from "@/components/account/UidBadge";
import { requireDoctorPage } from "@/lib/auth/doctor";
import { docToForm } from "@/lib/doctors/server";
import { getDoctorSelfEditOptions } from "@/lib/self-edit-options";
import { ensureUid } from "@/lib/uid";
import { DoctorProfile } from "@/models/DoctorProfile";

export const dynamic = "force-dynamic";

/** The doctor's full self-editor: every part of their website (?tab= opens a section). */
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const me = await requireDoctorPage();
  const { tab } = await searchParams;
  const [options, uid] = await Promise.all([getDoctorSelfEditOptions(), ensureUid(DoctorProfile as never, me.doctor, "doctor")]);
  const initialTab: DoctorSelfStep = (DOCTOR_SELF_STEPS as readonly string[]).includes(tab ?? "") ? (tab as DoctorSelfStep) : "basics";
  return (
    <main className="space-y-6 pb-24 pt-6 lg:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Your website</h1>
          <p className="mt-1 text-body">Update anything: your details, photos, services, clinics, timings, awards and design. Changes go live when you save.</p>
        </div>
        <UidBadge uid={uid} />
      </div>
      <DoctorSelfEditor initial={docToForm(me.doctor.toObject())} options={options} initialTab={initialTab} />
    </main>
  );
}

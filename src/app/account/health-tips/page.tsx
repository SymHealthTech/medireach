import { HealthTipsSettings } from "@/components/account/HealthTipsSettings";
import { requireDoctorPage } from "@/lib/auth/doctor";
import { healthTipOptions } from "@/lib/health-tips";
import { Specialty } from "@/models/Specialty";

export const dynamic = "force-dynamic";

/** Show or hide the Health tips section, and pick which two general articles it shows. */
export default async function HealthTipsPage() {
  const me = await requireDoctorPage();
  const d = me.doctor;
  const ids = [d.primarySpecialtyId, ...(d.secondarySpecialtyIds ?? [])].filter(Boolean);
  const specialties = await Specialty.find({ _id: { $in: ids } }).select({ slug: 1 }).lean();
  const { options, autoPicks } = healthTipOptions(String(d._id), specialties.map((s) => s.slug));
  return (
    <main className="space-y-6 pb-24 pt-6 lg:pt-0">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Health tips</h1>
        <p className="mt-1 text-body">Two short, general health articles your patients can read on your website. Keep them, choose different ones, or hide the section.</p>
      </div>
      <HealthTipsSettings initial={{ show: d.showHealthTips !== false, slugs: d.healthTipSlugs ?? [] }} options={options} autoPicks={autoPicks} />
    </main>
  );
}

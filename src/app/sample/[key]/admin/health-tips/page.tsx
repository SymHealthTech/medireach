import { notFound } from "next/navigation";
import { HealthTipsSettings } from "@/components/account/HealthTipsSettings";
import { demoDoctor, demoHealthTips } from "@/fixtures/demo-doctors/dashboard";

/** Demo health tips settings (same screen as /account/health-tips; nothing is saved). */
export default async function DemoHealthTipsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const d = demoDoctor(key);
  if (!d) notFound();
  const { options, autoPicks } = demoHealthTips(d);
  return (
    <main className="space-y-6 pb-24 pt-6 lg:pt-0">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Health tips</h1>
        <p className="mt-1 text-body">Two short, general health articles your patients can read on your website. Keep them, choose different ones, or hide the section.</p>
      </div>
      <HealthTipsSettings initial={{ show: d.showHealthTips, slugs: [] }} options={options} autoPicks={autoPicks} demo />
    </main>
  );
}

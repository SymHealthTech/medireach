import { notFound } from "next/navigation";
import { ProfileEditor } from "@/components/account/ProfileEditor";
import { demoDoctor, demoProfile } from "@/fixtures/demo-doctors/dashboard";

/** Demo profile editor (same screen as /account/profile; nothing is saved). */
export default async function DemoProfilePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const d = demoDoctor(key);
  if (!d) notFound();
  return (
    <main className="space-y-6 pb-24 pt-6 lg:pt-0">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Profile</h1>
        <p className="mt-1 text-body">What patients read about you. Changes go live as soon as you save.</p>
      </div>
      <ProfileEditor initial={demoProfile(d)} demo />
    </main>
  );
}

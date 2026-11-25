import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DemoLoginForm } from "@/components/account/DemoLoginForm";
import { DoctorLoginShell } from "@/components/account/DoctorLoginShell";
import { DEMO_LOGIN, demoDoctor, demoName } from "@/fixtures/demo-doctors/dashboard";
import { DEMO_DOCTORS } from "@/fixtures/demo-doctors";

export const metadata: Metadata = { title: { absolute: "Doctor login (demo) – Website dashboard" }, robots: { index: false, follow: false } };

export function generateStaticParams() {
  return DEMO_DOCTORS.map((d) => ({ key: d.key }));
}

/** Demo login for the sample website dashboard: dummy email and password, shown on the page. */
export default async function DemoLoginPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const d = demoDoctor(key);
  if (!d) notFound();
  return (
    <DoctorLoginShell
      doctor={{ name: demoName(d), specialty: d.primarySpecialty.name, photo: d.photo.url, siteUrl: `/sample/${key}` }}
      footer={<p className="mt-6 text-xs text-muted-foreground">This is a demo. Real doctors log in with a one-time code sent to their email, no password needed.</p>}
    >
      <DemoLoginForm email={DEMO_LOGIN.email} password={DEMO_LOGIN.password} next={`/sample/${key}/admin`} />
    </DoctorLoginShell>
  );
}

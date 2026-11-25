import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LogOut } from "lucide-react";
import { AccountNav } from "@/components/account/AccountNav";
import { DoctorDashboardHeader } from "@/components/account/DoctorDashboardHeader";
import { demoDoctor, demoName } from "@/fixtures/demo-doctors/dashboard";

export const metadata: Metadata = { title: { absolute: "Website dashboard (demo)" }, robots: { index: false, follow: false } };

/**
 * Sample website dashboard shown to doctors: the same screens as a real
 * doctor's account (/account), filled with the demo doctor's data. Changes
 * stay on screen; nothing is saved.
 */
export default async function DemoAdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ key: string }> }) {
  const { key } = await params;
  const d = demoDoctor(key);
  if (!d) notFound();
  const base = `/sample/${key}/admin`;
  return (
    <div className="min-h-dvh bg-paper">
      <div className="bg-marigold px-4 py-2 text-center text-sm font-semibold text-white">Demo dashboard — the doctor, patients and requests are fictional. Changes are not saved.</div>
      <DoctorDashboardHeader
        name={demoName(d)}
        subtitle={`${d.primarySpecialty.name} · Website dashboard`}
        badge="Demo"
        actions={
          <Link href={`/sample/${key}/login`} className="inline-flex min-h-10 items-center gap-2 rounded-[10px] px-3 text-sm font-semibold text-ink hover:bg-mist">
            <LogOut className="size-4" /> Log out
          </Link>
        }
      />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 lg:pt-8">
        <AccountNav newCount={d.inquiries.filter((q) => q.status === "new").length} pageUrl={`/sample/${key}`} base={base} cardHref={`/sample/${key}/card`} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

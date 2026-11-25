import type { Metadata } from "next";
import Link from "next/link";
import { AccountNav } from "@/components/account/AccountNav";
import { LogoutButton } from "@/components/account/LogoutButton";
import { LogoWordmark } from "@/components/brand/Logo";
import { getCurrentAccount } from "@/lib/auth/doctor";
import { paths } from "@/lib/site";
import { Inquiry } from "@/models/Inquiry";
import { Specialty } from "@/models/Specialty";
import { DoctorDashboardHeader } from "@/components/account/DoctorDashboardHeader";

export const metadata: Metadata = { title: { absolute: "My account – MediReach" }, robots: { index: false, follow: false } };

/**
 * Account shell. Doctors get their own website dashboard (their name in the
 * header, no MediReach site navigation) with a sidebar (overview, appointment requests,
 * profile, health articles, visiting card); clinic and hospital owners keep
 * the single page. Each page re-checks the session itself.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentAccount();
  const doctor = me?.doctor;
  const newCount = doctor ? await Inquiry.countDocuments({ doctorId: doctor._id, status: "new" }) : 0;
  const live = doctor?.status === "published" && doctor.citySlug && doctor.slug;

  if (doctor) {
    const specialty = doctor.primarySpecialtyId ? await Specialty.findById(doctor.primarySpecialtyId).select({ name: 1 }).lean() : null;
    return (
      <div className="min-h-dvh bg-paper">
        <DoctorDashboardHeader name={me!.name} subtitle={[specialty?.name, "Website dashboard"].filter(Boolean).join(" · ")} actions={<LogoutButton />} />
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 lg:pt-8">
          <AccountNav newCount={newCount} pageUrl={live ? paths.doctor(doctor.citySlug!, doctor.slug!) : undefined} />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="MediReach home">
            <LogoWordmark className="text-xl" />
          </Link>
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}

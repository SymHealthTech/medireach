import type { Metadata } from "next";
import Link from "next/link";
import { AccountNav } from "@/components/account/AccountNav";
import { LogoutButton } from "@/components/account/LogoutButton";
import { LogoWordmark } from "@/components/brand/Logo";
import { getCurrentAccount } from "@/lib/auth/doctor";
import { paths } from "@/lib/site";
import { Inquiry } from "@/models/Inquiry";

export const metadata: Metadata = { title: { absolute: "My account – MediReach" }, robots: { index: false, follow: false } };

/**
 * Account shell. Doctors get a sidebar (overview, appointment requests,
 * profile, health articles, visiting card); clinic and hospital owners keep
 * the single page. Each page re-checks the session itself.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentAccount();
  const doctor = me?.doctor;
  const newCount = doctor ? await Inquiry.countDocuments({ doctorId: doctor._id, status: "new" }) : 0;
  const live = doctor?.status === "published" && doctor.citySlug && doctor.slug;
  const initials = (me?.name ?? "")
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className={`mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:px-6 ${doctor ? "max-w-6xl" : "max-w-3xl"}`}>
          <Link href="/" aria-label="MediReach home">
            <LogoWordmark className="text-xl" />
          </Link>
          <div className="flex items-center gap-3">
            {me && (
              <span className="hidden items-center gap-2 text-sm font-semibold text-ink sm:flex">
                <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-lagoon text-xs font-bold text-white">
                  {initials}
                </span>
                {me.name}
              </span>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>
      {doctor ? (
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 lg:pt-8">
          <AccountNav newCount={newCount} pageUrl={live ? paths.doctor(doctor.citySlug!, doctor.slug!) : undefined} />
          <div className="min-w-0">{children}</div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

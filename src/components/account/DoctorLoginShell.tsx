import Image from "next/image";
import { CalendarCheck, IdCard, Newspaper, UserRound } from "lucide-react";

const WHAT = [
  { icon: CalendarCheck, text: "See appointment requests from your website" },
  { icon: UserRound, text: "Update your profile, services and timings" },
  { icon: Newspaper, text: "Choose your health tips" },
  { icon: IdCard, text: "Share your digital visiting card" },
];

/**
 * Full-screen login for a doctor's website dashboard: a photo panel with what
 * they can do, and the form. Used by the real login (/doctor-login) and the
 * demo login (/sample/{key}/login). No MediReach site navigation.
 */
export function DoctorLoginShell({
  doctor,
  children,
  footer,
}: {
  doctor?: { name: string; specialty?: string; photo?: string; siteUrl?: string };
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="grid min-h-dvh bg-paper lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden lg:block">
        <Image src="/templates/clinic-modern/hero-2.jpg" alt="" fill priority sizes="55vw" className="object-cover" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-[#0b2545]/95 via-[#0b2545]/85 to-[#0f766e]/80" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          {doctor ? (
            <div className="flex items-center gap-4">
              {doctor.photo && (
                <span className="relative size-16 overflow-hidden rounded-2xl ring-2 ring-white/40">
                  <Image src={doctor.photo} alt="" fill sizes="64px" className="object-cover object-top" />
                </span>
              )}
              <span>
                <span className="block text-xl font-bold">{doctor.name}</span>
                {doctor.specialty && <span className="block text-sm text-teal-200">{doctor.specialty}</span>}
              </span>
            </div>
          ) : (
            <span />
          )}
          <div>
            <p className="max-w-md text-[40px] font-extrabold leading-[1.1] tracking-tight">Your website, in your hands.</p>
            <p className="mt-3 max-w-md text-white/75">Log in to your website dashboard.</p>
            <ul className="mt-10 space-y-4">
              {WHAT.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                    <Icon aria-hidden className="size-5 text-teal-300" strokeWidth={1.8} />
                  </span>
                  <span className="text-white/90">{text}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-white/55">Website by MediReach</p>
        </div>
      </aside>

      <div className="flex flex-col justify-center px-5 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          {doctor && (
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              {doctor.photo && (
                <span className="relative size-12 overflow-hidden rounded-xl">
                  <Image src={doctor.photo} alt="" fill sizes="48px" className="object-cover object-top" />
                </span>
              )}
              <span>
                <span className="block font-bold text-ink">{doctor.name}</span>
                {doctor.specialty && <span className="block text-sm text-muted-foreground">{doctor.specialty}</span>}
              </span>
            </div>
          )}
          {children}
          {doctor?.siteUrl && (
            <a href={doctor.siteUrl} className="mt-8 inline-block text-sm font-semibold text-lagoon hover:text-ink">
              ← Back to the website
            </a>
          )}
          {footer}
        </div>
      </div>
    </main>
  );
}

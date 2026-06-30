"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoWordmark } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SosButton } from "@/components/app/SosButton";
import { SosAlertModal } from "@/components/app/SosAlertModal";
import { LogoutButton } from "@/components/app/LogoutButton";
import { DOCTOR_MENU_ITEMS } from "@/components/app/DoctorMenu";
import { RECEPTIONIST_MENU_ITEMS } from "@/components/app/ReceptionistMenu";
import { ReceptionistProfileCard } from "@/components/app/ReceptionistProfileCard";
import { DoctorProfileCard } from "@/components/app/DoctorProfileCard";
import { registerServiceWorker, enablePush } from "@/lib/client/push";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/constants";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const DOCTOR_NAV: NavItem[] = [
  { href: "/app/queue", label: "Today", icon: "🩺" },
  { href: "/app/recent", label: "Records", icon: "📁" },
  { href: "/app/menu", label: "Menu", icon: "☰" },
];

const RECEPTIONIST_NAV: NavItem[] = [
  { href: "/app/queue", label: "Today", icon: "🗒️" },
  { href: "/app/recent", label: "Recent", icon: "📞" },
  { href: "/app/menu", label: "Menu", icon: "☰" },
];

export function AppShell({ role, name, doctorAppId = "", doctorClinicName = "", children }: { role: Role; name: string; doctorAppId?: string; doctorClinicName?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const nav = role === "receptionist" ? RECEPTIONIST_NAV : DOCTOR_NAV;
  // Primary nav items (Today + Records) — Menu is replaced by inline items on desktop
  const primaryNav = nav.filter((item) => item.href !== "/app/menu");
  const allMenuItems = role === "receptionist" ? RECEPTIONIST_MENU_ITEMS : DOCTOR_MENU_ITEMS;
  const primaryHrefs = new Set(primaryNav.map((n) => n.href));
  const menuItems = allMenuItems.filter((item) => !primaryHrefs.has(item.href));

  useEffect(() => {
    registerServiceWorker();
    if (role === "doctor") enablePush();
  }, [role]);

  return (
    <div className="min-h-screen">
      {role === "doctor" && <SosAlertModal />}
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3 lg:px-6">
          <Link href="/app/queue">
            <LogoWordmark className="text-lg" />
          </Link>
          <div className="flex items-center gap-2">
            {role === "doctor" && <SosButton />}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar — desktop only */}
        <aside className="hidden lg:block lg:fixed lg:top-[57px] lg:bottom-0 lg:w-60 lg:z-10">
          <nav className="flex flex-col border-r border-line bg-surface-raised h-full overflow-y-auto">
            <div className="flex flex-col gap-1 p-4">
              {/* Primary nav */}
              {primaryNav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand/10 text-brand"
                        : "text-ink-muted hover:bg-surface hover:text-ink",
                    )}
                  >
                    <span className="text-base" aria-hidden>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}

              <div className="my-2 border-t border-line" />

              {/* All menu items */}
              {menuItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand/10 text-brand"
                        : "text-ink-muted hover:bg-surface hover:text-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-auto p-4 border-t border-line space-y-3">
              {role === "doctor" && (
                <DoctorProfileCard name={name} appId={doctorAppId} clinicName={doctorClinicName} />
              )}
              {role === "receptionist" && (
                <ReceptionistProfileCard name={name} compact />
              )}
              <LogoutButton />
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 pb-20 lg:pb-0 lg:pl-60">
          <div className="mx-auto max-w-3xl px-4 py-6 lg:max-w-full lg:px-12">{children}</div>
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface-raised lg:hidden">
        <div className="mx-auto flex max-w-3xl">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-3 text-xs font-medium",
                  active ? "text-brand" : "text-ink-muted",
                )}
              >
                <span className="text-lg" aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

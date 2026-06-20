"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoWordmark } from "@/components/brand/Logo";
import { apiPost } from "@/lib/client/api";
import { cn } from "@/lib/cn";

/** Admin console chrome (spec §6). Sidebar nav + logout. */
const NAV = [
  { href: "/console", label: "Dashboard" },
  { href: "/console/doctors", label: "Doctors" },
  { href: "/console/sponsors", label: "Sponsors" },
  { href: "/console/leads", label: "Leads" },
  { href: "/console/grievances", label: "Grievances" },
  { href: "/console/content", label: "Content" },
  { href: "/console/audit", label: "Audit log" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await apiPost("/api/auth/logout").catch(() => {});
    router.push("/console/login");
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-line bg-surface-raised md:w-60 md:border-b-0 md:border-r">
        <div className="p-4">
          <LogoWordmark className="text-base" />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/console" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium",
                  active ? "bg-brand text-brand-fg" : "text-ink-muted hover:bg-line/40",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <button onClick={logout} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-sos hover:bg-sos/10">
            Log out
          </button>
        </nav>
      </aside>
      <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}

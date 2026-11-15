import { cookies } from "next/headers";
import { AdminShell } from "@/components/admin/AdminShell";
import { SIDEBAR_COOKIE, THEME_COOKIE } from "@/components/admin/prefs";
import { requireAdminPage } from "@/lib/auth/admin";

/**
 * Authenticated dashboard layout. The role is re-checked against the database
 * here (and again in every page and server action).
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  const store = await cookies();

  return (
    <AdminShell
      user={{ name: admin.name, email: admin.email, role: admin.role }}
      initialDark={store.get(THEME_COOKIE)?.value === "dark"}
      initialCollapsed={store.get(SIDEBAR_COOKIE)?.value === "collapsed"}
    >
      {children}
    </AdminShell>
  );
}

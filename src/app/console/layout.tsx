import { getSession } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * Console layout (spec §6). Wraps authenticated admin pages in the console
 * chrome; the login page (the only console route reachable without an admin
 * session — middleware enforces the rest) renders bare.
 */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session?.role === "admin") return <AdminShell>{children}</AdminShell>;
  return <>{children}</>;
}

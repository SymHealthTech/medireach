import {
  Building2,
  CreditCard,
  Globe,
  IdCard,
  LayoutDashboard,
  ListTree,
  Palette,
  Search,
  Settings,
  UserRound,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { AdminRole } from "@/lib/constants";

/**
 * Dashboard navigation (MEDIREACH_BUILD_PROMPT.md Phase 4 order). `roles`
 * hides items a role can't use; every page also enforces its own roles
 * server-side, so hiding is a convenience, not the security boundary.
 */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: readonly AdminRole[];
}

const ALL: readonly AdminRole[] = ["superadmin", "admin", "sales"];
const ADMINS: readonly AdminRole[] = ["superadmin", "admin"];

export const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, roles: ALL },
  { href: "/admin/doctors", label: "Doctors", icon: UserRound, roles: ALL },
  { href: "/admin/pages", label: "Portfolio pages", icon: Globe, roles: ALL },
  { href: "/admin/cards", label: "Visiting cards", icon: IdCard, roles: ALL },
  { href: "/admin/templates", label: "Design templates", icon: Palette, roles: ADMINS },
  { href: "/admin/hospitals", label: "Hospitals", icon: Building2, roles: ALL },
  { href: "/admin/payments", label: "Payments", icon: CreditCard, roles: ADMINS },
  { href: "/admin/update-requests", label: "Update requests", icon: Wrench, roles: ADMINS },
  { href: "/admin/leads", label: "Leads", icon: Users, roles: ALL },
  { href: "/admin/masters", label: "Master lists", icon: ListTree, roles: ADMINS },
  { href: "/admin/seo", label: "SEO", icon: Search, roles: ADMINS },
  { href: "/admin/settings", label: "Settings", icon: Settings, roles: ADMINS },
];

/** Bottom tab bar on mobile: Overview, Doctors, [+ New doctor], Leads, More. */
export const MOBILE_TABS = ["/admin", "/admin/doctors", "/admin/leads"] as const;

export const NEW_DOCTOR_HREF = "/admin/doctors/new";

export function navForRole(role: AdminRole): NavItem[] {
  return NAV_ITEMS.filter((i) => i.roles.includes(role));
}

/** Active item for a pathname (longest matching prefix; Overview only on exact match). */
export function activeNavItem(pathname: string, items: NavItem[] = NAV_ITEMS): NavItem | undefined {
  return items
    .filter((i) => (i.href === "/admin" ? pathname === "/admin" : pathname === i.href || pathname.startsWith(`${i.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export const ROLE_LABEL: Record<AdminRole, string> = {
  superadmin: "Super admin",
  admin: "Admin",
  sales: "Sales",
};


/** Roles allowed on a section, from the same config the menu uses. */
export function rolesFor(href: string): readonly AdminRole[] {
  const item = NAV_ITEMS.find((i) => i.href === href);
  if (!item) throw new Error(`No nav item for ${href}`);
  return item.roles;
}

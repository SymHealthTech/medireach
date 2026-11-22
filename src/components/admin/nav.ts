import {
  Building2,
  ClipboardList,
  CreditCard,
  Globe,
  Hospital,
  IdCard,
  LayoutDashboard,
  ListTree,
  Palette,
  Search,
  Settings,
  TrendingUp,
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
  /** Shorter label for the mobile tab bar. */
  short?: string;
}

const ALL: readonly AdminRole[] = ["superadmin", "admin", "sales"];
const ADMINS: readonly AdminRole[] = ["superadmin", "admin"];

export const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, roles: ALL },
  { href: "/admin/doctors", label: "Doctors", icon: UserRound, roles: ALL },
  { href: "/admin/establishments?kind=clinic", label: "Clinics", icon: Building2, roles: ALL },
  { href: "/admin/establishments?kind=hospital", label: "Hospitals", icon: Hospital, roles: ALL },
  { href: "/admin/pages", label: "Sites", icon: Globe, roles: ALL },
  { href: "/admin/cards", label: "Visiting cards", icon: IdCard, roles: ALL },
  { href: "/admin/templates", label: "Designs & themes", icon: Palette, roles: ADMINS },
  { href: "/admin/payments", label: "Payments & renewals", icon: CreditCard, roles: ADMINS },
  { href: "/admin/sales", label: "Sales executives", short: "Sales", icon: TrendingUp, roles: ADMINS },
  { href: "/admin/update-requests", label: "Update requests", icon: Wrench, roles: ADMINS },
  { href: "/admin/intakes", label: "Website forms", short: "Forms", icon: ClipboardList, roles: ALL },
  { href: "/admin/leads", label: "Leads", icon: Users, roles: ALL },
  { href: "/admin/masters", label: "Master lists", icon: ListTree, roles: ADMINS },
  { href: "/admin/seo", label: "SEO", icon: Search, roles: ADMINS },
  { href: "/admin/settings", label: "Settings", icon: Settings, roles: ADMINS },
];

/** Bottom tab bar on mobile: Overview, Doctors, [+ New], Clinics, More (DESIGN_BRIEF.md §6). */
export const MOBILE_TABS = ["/admin", "/admin/doctors", "/admin/establishments?kind=clinic"] as const;

export const NEW_DOCTOR_HREF = "/admin/doctors/new";

/** Choices behind the "+ New" button (top bar and mobile). */
export const NEW_ITEMS = [
  { href: NEW_DOCTOR_HREF, label: "Doctor", description: "Portfolio page and visiting card" },
  { href: "/admin/establishments/new?kind=clinic", label: "Clinic", description: "Clinic website and card" },
  { href: "/admin/establishments/new?kind=hospital", label: "Hospital", description: "Small hospital website and card" },
] as const;

/**
 * What "+ New" offers on a page: inside Doctors only a new doctor, inside
 * Clinics only a clinic, inside Hospitals only a hospital; elsewhere all three.
 */
export function newItemsFor(active: NavItem | undefined): readonly (typeof NEW_ITEMS)[number][] {
  const only = (label: (typeof NEW_ITEMS)[number]["label"]) => NEW_ITEMS.filter((n) => n.label === label);
  if (active?.href === "/admin/doctors") return only("Doctor");
  if (active?.href === "/admin/establishments?kind=clinic") return only("Clinic");
  if (active?.href === "/admin/establishments?kind=hospital") return only("Hospital");
  return NEW_ITEMS;
}

export function navForRole(role: AdminRole): NavItem[] {
  return NAV_ITEMS.filter((i) => i.roles.includes(role));
}

const pathOf = (href: string) => href.split("?")[0]!;
const queryOf = (href: string) => new URLSearchParams(href.split("?")[1] ?? "");

/**
 * Active item for a pathname (longest matching prefix; Overview only on exact
 * match). Items that share a path (Clinics / Hospitals) are told apart by the
 * query (`?kind=hospital`); without one, the first of them is active.
 */
export function activeNavItem(pathname: string, items: NavItem[] = NAV_ITEMS, search = ""): NavItem | undefined {
  const params = new URLSearchParams(search);
  const matches = items
    .filter((i) => {
      const p = pathOf(i.href);
      return p === "/admin" ? pathname === "/admin" : pathname === p || pathname.startsWith(`${p}/`);
    })
    .sort((a, b) => pathOf(b.href).length - pathOf(a.href).length);
  const best = matches.filter((m) => pathOf(m.href) === pathOf(matches[0]?.href ?? ""));
  return best.find((m) => [...queryOf(m.href)].every(([k, v]) => params.get(k) === v)) ?? best[0];
}

export const ROLE_LABEL: Record<AdminRole, string> = {
  superadmin: "Super admin",
  admin: "Admin",
  sales: "Sales",
};


/** Roles allowed on a section, from the same config the menu uses. */
export function rolesFor(href: string): readonly AdminRole[] {
  const item = NAV_ITEMS.find((i) => i.href === href || pathOf(i.href) === href);
  if (!item) throw new Error(`No nav item for ${href}`);
  return item.roles;
}

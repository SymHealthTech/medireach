"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ExternalLink,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Sun,
} from "lucide-react";
import { LogoMark, LogoWordmark } from "@/components/brand/Logo";
import { CommandSearch } from "@/components/admin/CommandSearch";
import { SIDEBAR_COOKIE, THEME_COOKIE } from "@/components/admin/prefs";
import {
  activeNavItem,
  MOBILE_TABS,
  NEW_DOCTOR_HREF,
  navForRole,
  ROLE_LABEL,
  type NavItem,
} from "@/components/admin/nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { logoutAction } from "@/app/admin/login/actions";
import { cn } from "@/lib/cn";
import type { AdminRole } from "@/lib/constants";

/**
 * Dashboard shell (DESIGN_BRIEF.md §4):
 *  - ≥1024px: ink sidebar, 248px, collapsible to 72px icons
 *  - 768–1023px: collapsed 72px icon sidebar
 *  - <768px: top bar + bottom tab bar (Overview, Doctors, +, Leads, More)
 * Light by default; dark mode is a per-user cookie, applied to this wrapper
 * (SSR, no flash) and to <html> while mounted so portals (menus, dialogs,
 * toasts) match.
 */

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/admin; max-age=31536000; samesite=lax`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase();
}

export interface ShellUser {
  name: string;
  email: string;
  role: AdminRole;
}

export function AdminShell({
  user,
  initialDark,
  initialCollapsed,
  children,
}: {
  user: ShellUser;
  initialDark: boolean;
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Built here (not passed from the server) because nav items hold icon components.
  const nav = navForRole(user.role);
  const [dark, setDark] = useState(initialDark);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    return () => document.documentElement.classList.remove("dark");
  }, [dark]);

  useEffect(() => setMoreOpen(false), [pathname]);

  const active = activeNavItem(pathname, nav);
  const title = pathname === NEW_DOCTOR_HREF ? "New doctor" : (active?.label ?? "Dashboard");

  function toggleTheme() {
    setDark((d) => {
      setCookie(THEME_COOKIE, d ? "light" : "dark");
      return !d;
    });
  }
  function toggleSidebar() {
    setCollapsed((c) => {
      setCookie(SIDEBAR_COOKIE, c ? "expanded" : "collapsed");
      return !c;
    });
  }

  const tabs = MOBILE_TABS.map((href) => nav.find((n) => n.href === href)).filter((n): n is NavItem => Boolean(n));
  const moreItems = nav.filter((n) => !(MOBILE_TABS as readonly string[]).includes(n.href));

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("min-h-dvh bg-background text-foreground", dark && "dark")}>
        {/* Sidebar (tablet + desktop) */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 hidden flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
            "w-[72px]",
            !collapsed && "lg:w-[248px]",
          )}
          aria-label="Main navigation"
        >
          <div className={cn("flex h-16 items-center px-[18px]", !collapsed && "lg:px-6")}>
            <Link href="/admin" aria-label="MediReach dashboard" className="flex items-center">
              <LogoMark className={cn("ring-1 ring-white/15 rounded-[8px]", !collapsed && "lg:hidden")} />
              <LogoWordmark tone="light" className={cn("hidden", !collapsed && "lg:inline-flex")} />
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-2">
            <ul className="space-y-1">
              {nav.map((item) => {
                const isActive = active?.href === item.href;
                const link = (
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground",
                      isActive && "bg-sidebar-hover text-sidebar-foreground",
                    )}
                  >
                    {isActive && (
                      <span aria-hidden className="absolute inset-y-2 -left-3 w-1 rounded-r-full bg-marigold" />
                    )}
                    <item.icon className="size-5 shrink-0" strokeWidth={1.75} />
                    <span className={cn("sr-only truncate", !collapsed && "lg:not-sr-only")}>{item.label}</span>
                  </Link>
                );
                return (
                  <li key={item.href}>
                    <Tooltip>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right" className={cn(!collapsed && "lg:hidden")}>
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="hidden border-t border-white/10 p-3 lg:block">
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen className="size-5" strokeWidth={1.75} /> : <PanelLeftClose className="size-5" strokeWidth={1.75} />}
              <span className={cn("sr-only", !collapsed && "lg:not-sr-only")}>Collapse</span>
            </button>
          </div>
        </aside>

        <div className={cn("flex min-h-dvh flex-col md:pl-[72px]", !collapsed && "lg:pl-[248px]")}>
          {/* Top bar */}
          <header className="sticky top-0 z-30 border-b border-line bg-background/90 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-dashboard items-center gap-3 px-4 md:px-6">
              <Link href="/admin" className="md:hidden" aria-label="Dashboard home">
                <LogoMark />
              </Link>
              <h1 className="min-w-0 flex-1 truncate font-display text-xl font-semibold text-ink md:text-2xl">{title}</h1>

              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="hidden h-10 w-64 items-center gap-2 rounded-lg border border-line bg-card px-3 text-sm text-muted-foreground hover:border-ink/30 lg:flex"
              >
                <Search className="size-4" strokeWidth={1.75} />
                Search…
                <kbd className="ml-auto rounded border border-line px-1.5 text-[11px] font-medium">Ctrl K</kbd>
              </button>
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSearchOpen(true)} aria-label="Search">
                <Search className="size-5" strokeWidth={1.75} />
              </Button>

              <Button asChild className="hidden md:inline-flex">
                <Link href={NEW_DOCTOR_HREF}>
                  <Plus /> New doctor
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="rounded-full outline-offset-2" aria-label="Account menu">
                    <Avatar className="size-10">
                      <AvatarFallback className="bg-sage font-semibold text-ink">{initials(user.name)}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="font-normal">
                    <p className="font-semibold text-foreground">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); toggleTheme(); }}>
                    {dark ? <Sun /> : <Moon />}
                    {dark ? "Light mode" : "Dark mode"}
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="/" target="_blank" rel="noopener">
                      <ExternalLink /> View site
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <form action={logoutAction}>
                    <DropdownMenuItem asChild>
                      <button type="submit" className="w-full">
                        <LogOut /> Log out
                      </button>
                    </DropdownMenuItem>
                  </form>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="mx-auto w-full max-w-dashboard flex-1 px-4 pb-28 pt-6 md:px-6 md:pb-10">{children}</main>
        </div>

        {/* Bottom tab bar (mobile) */}
        <nav
          aria-label="Main navigation"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
          <ul className="grid h-16 grid-cols-5 items-center">
            {tabs.slice(0, 2).map((t) => (
              <TabLink key={t.href} item={t} active={active?.href === t.href} />
            ))}
            <li className="flex justify-center">
              <Link
                href={NEW_DOCTOR_HREF}
                aria-label="New doctor"
                className="-mt-7 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft ring-4 ring-background active:scale-[.98]"
              >
                <Plus className="size-6" strokeWidth={2} />
              </Link>
            </li>
            {tabs.slice(2).map((t) => (
              <TabLink key={t.href} item={t} active={active?.href === t.href} />
            ))}
            <li>
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className={cn(
                  "flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground",
                  moreItems.some((m) => m.href === active?.href) && "text-ink",
                )}
              >
                <Menu className="size-5" strokeWidth={1.75} />
                More
              </button>
            </li>
          </ul>
        </nav>

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle className="font-display text-xl">More</SheetTitle>
              <SheetDescription className="sr-only">Other dashboard sections</SheetDescription>
            </SheetHeader>
            <ul className="grid grid-cols-1 gap-1 overflow-y-auto px-4 pb-6">
              {moreItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-accent",
                      active?.href === item.href && "bg-accent text-accent-foreground",
                    )}
                  >
                    <item.icon className="size-5 text-muted-foreground" strokeWidth={1.75} />
                    {item.label}
                  </Link>
                </li>
              ))}
              <li className="mt-2 border-t border-line pt-2">
                <form action={logoutAction}>
                  <button type="submit" className="flex h-12 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-accent">
                    <LogOut className="size-5 text-muted-foreground" strokeWidth={1.75} />
                    Log out
                  </button>
                </form>
              </li>
            </ul>
          </SheetContent>
        </Sheet>

        <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} nav={nav} />
        <Toaster theme={dark ? "dark" : "light"} />
      </div>
    </TooltipProvider>
  );
}

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground",
          active && "text-ink",
        )}
      >
        <item.icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
        {item.label}
      </Link>
    </li>
  );
}

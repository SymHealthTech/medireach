import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { RESERVED_SUBDOMAINS } from "@/config/reserved";
import { ADMIN_ROLES } from "@/lib/constants";
import { ROOT_HOSTNAME, SITE_URL, paths } from "@/lib/site";
import { subdomainError } from "@/lib/slug";

/**
 * Edge middleware.
 *
 * 1. Doctor subdomains (amit.medireach.co.in, amit.localhost:3000 in dev):
 *    REWRITE (not redirect) to the canonical /[city]/doctor/[slug] page, so the
 *    address bar keeps the subdomain while the page's canonical / JSON-LD /
 *    links all point at the apex folder URL. Unknown or unpublished → 404.
 *    /admin, /account, /api, /login are never served on subdomains.
 * 2. www → apex.
 * 3. /admin/** session gate (defense-in-depth; server actions re-check roles).
 * 4. /account/** needs a doctor session cookie (the page re-verifies it).
 *
 * `app.medireach.co.in` belongs to the separate clinic-software project, so it
 * never reaches this app.
 */

const NOT_FOUND_PATH = "/__not-found"; // fails slug validation in /[city] → notFound()
const BLOCKED_ON_SUBDOMAIN = ["/admin", "/account", "/api", "/login", "/go"];

// Per-instance lookup cache; the API route is also CDN-cached.
const LOOKUP_TTL_MS = 60_000;
const lookupCache = new Map<string, { at: number; route: { citySlug: string; slug: string } | null }>();

async function lookupSubdomain(sub: string): Promise<{ citySlug: string; slug: string } | null> {
  const hit = lookupCache.get(sub);
  if (hit && Date.now() - hit.at < LOOKUP_TTL_MS) return hit.route;
  const res = await fetch(`${SITE_URL}/api/public/subdomain/${encodeURIComponent(sub)}`, {
    headers: { accept: "application/json" },
  });
  if (res.status !== 200 && res.status !== 404) throw new Error(`subdomain lookup failed: ${res.status}`);
  const route = res.status === 200 ? ((await res.json()) as { citySlug: string; slug: string }) : null;
  lookupCache.set(sub, { at: Date.now(), route });
  return route;
}

/** "amit" for amit.medireach.co.in; null for the apex, www, or unrelated hosts. */
function subdomainOf(hostname: string): string | null {
  if (!hostname.endsWith(`.${ROOT_HOSTNAME}`)) return null;
  const sub = hostname.slice(0, -(ROOT_HOSTNAME.length + 1));
  return sub.includes(".") ? null : sub;
}

function rewriteTo(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.rewrite(url);
}

async function handleSubdomain(req: NextRequest, sub: string) {
  const path = req.nextUrl.pathname;

  if (BLOCKED_ON_SUBDOMAIN.some((p) => path === p || path.startsWith(`${p}/`))) {
    return rewriteTo(req, NOT_FOUND_PATH);
  }
  // Let crawlers read robots/sitemaps and Next's own assets.
  if (path === "/robots.txt" || path.startsWith("/sitemap") || path.startsWith("/_next/")) {
    return NextResponse.next();
  }

  if ((RESERVED_SUBDOMAINS as readonly string[]).includes(sub) || subdomainError(sub) !== null) {
    return rewriteTo(req, NOT_FOUND_PATH);
  }

  let route: { citySlug: string; slug: string } | null;
  try {
    route = await lookupSubdomain(sub);
  } catch (err) {
    console.error("[middleware]", err);
    return new NextResponse("Temporarily unavailable", { status: 503, headers: { "Retry-After": "30" } });
  }
  if (!route) return rewriteTo(req, NOT_FOUND_PATH);

  const profile = paths.doctor(route.citySlug, route.slug);
  if (path === "/") return rewriteTo(req, profile);
  if (path === "/contact.vcf") return rewriteTo(req, `${profile}/contact.vcf`);
  if (path === "/card") return rewriteTo(req, `${profile}/card`);
  if (path === "/opengraph-image" || path.startsWith("/opengraph-image")) {
    return rewriteTo(req, `${profile}${path}`);
  }

  // Anything else (hub links, etc.) lives on the apex.
  return NextResponse.redirect(`${SITE_URL}${path}${req.nextUrl.search}`, 308);
}

async function handleAdmin(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path === "/admin/login") return NextResponse.next();
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session || !(ADMIN_ROLES as readonly string[]).includes(session.role)) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export async function middleware(req: NextRequest) {
  const hostname = (req.headers.get("host") ?? req.nextUrl.host).split(":")[0]!.toLowerCase();

  if (hostname === `www.${ROOT_HOSTNAME}`) {
    return NextResponse.redirect(`${SITE_URL}${req.nextUrl.pathname}${req.nextUrl.search}`, 308);
  }

  const sub = subdomainOf(hostname);
  if (sub) return handleSubdomain(req, sub);

  const path = req.nextUrl.pathname;
  if (path === "/admin" || path.startsWith("/admin/")) return handleAdmin(req);
  if (path === "/account" || path.startsWith("/account/")) {
    const hasSession = req.cookies.has("next-auth.session-token") || req.cookies.has("__Secure-next-auth.session-token");
    if (!hasSession) return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except static build assets and image optimisation.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { RESERVED_SUBDOMAINS, SAMPLE_SUBDOMAINS } from "@/config/reserved";
import { STORED_ADMIN_ROLES } from "@/lib/constants";
import { ROOT_HOSTNAME, SITE_URL, sitePath, type SiteRoute } from "@/lib/site";
import { subdomainError } from "@/lib/slug";

/**
 * Edge middleware.
 *
 * 0. Sample subdomains (draditisample.medireach.co.in): rewrite to the
 *    built-in /sample/{key} pages (config/reserved.ts SAMPLE_SUBDOMAINS).
 * 1. Site subdomains (amit.medireach.co.in, shreeskin.medireach.co.in,
 *    amit.localhost:3000 in dev): doctors and clinics/hospitals share one
 *    namespace. "/" is REWRITTEN to the site's own website,
 *    /[city]/doctor/[slug]/website (…/clinic/…, …/hospital/…), whose canonical
 *    is the subdomain itself. The folder URL on the apex is the separate
 *    MediReach listing, so Google can show both. /robots.txt and /sitemap.xml
 *    are the subdomain's own. Unknown or unpublished → 404.
 *    /admin, /account, /api, /login are never served on subdomains, and the
 *    internal …/website pages are never served on the apex.
 * 2. www → apex.
 * 3. /admin/** session gate (defense-in-depth; server actions re-check roles).
 * 4. /account/** needs a doctor session cookie (the page re-verifies it).
 *
 * `clinicapp.medireach.co.in` belongs to the clinic software (separate repo and
 * Vercel project), so it
 * never reaches this app.
 */

const NOT_FOUND_PATH = "/__not-found"; // fails slug validation in /[city] → notFound()
const BLOCKED_ON_SUBDOMAIN = ["/admin", "/account", "/api", "/login", "/go"];
/** Internal pages only ever served on a subdomain (see handleSubdomain). */
const WEBSITE_ONLY = /^\/[^/]+\/(doctor|clinic|hospital)\/[^/]+\/website\/?$/;
const WEBSITE_SITEMAP_PATH = "/website-sitemap";

// Per-instance lookup cache; the API route is also CDN-cached.
const LOOKUP_TTL_MS = 60_000;
const lookupCache = new Map<string, { at: number; route: SiteRoute | null }>();

async function lookupSubdomain(sub: string): Promise<SiteRoute | null> {
  const hit = lookupCache.get(sub);
  if (hit && Date.now() - hit.at < LOOKUP_TTL_MS) return hit.route;
  const res = await fetch(`${SITE_URL}/api/public/subdomain/${encodeURIComponent(sub)}`, {
    headers: { accept: "application/json" },
  });
  if (res.status !== 200 && res.status !== 404) throw new Error(`subdomain lookup failed: ${res.status}`);
  const body = res.status === 200 ? ((await res.json()) as Partial<SiteRoute>) : null;
  // A response without `kind` (CDN-cached during a deploy) is a doctor route.
  const route = body?.citySlug && body.slug ? { kind: body.kind ?? "doctor", citySlug: body.citySlug, slug: body.slug } : null;
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
  // Let crawlers read robots.txt (it names this subdomain's own sitemap) and Next's own assets.
  // Static icons from public/ (logo, apple-icon) load directly instead of bouncing to the apex.
  // Design photos (public/templates/…) and demo-doctor photos (public/demo/…) too, so subdomain sites don't bounce them.
  if (
    path === "/robots.txt" ||
    path.startsWith("/_next/") ||
    /^\/[\w-]+\.(png|ico)$/.test(path) ||
    /^\/(templates|demo)\/[\w/.-]+\.(jpe?g|png|webp|avif)$/.test(path)
  ) {
    return NextResponse.next();
  }

  // Built-in sample doctors (homepage visiting cards): served from /sample/{key}, no lookup.
  const sample = SAMPLE_SUBDOMAINS[sub];
  if (sample) {
    if (path === "/" || path === "/card" || path === "/contact.vcf" || path === "/login" || path === "/admin" || path.startsWith("/admin/")) {
      return rewriteTo(req, `/sample/${sample}${path === "/" ? "" : path}`);
    }
    return NextResponse.redirect(`${SITE_URL}${path}${req.nextUrl.search}`, 308);
  }

  if ((RESERVED_SUBDOMAINS as readonly string[]).includes(sub) || subdomainError(sub) !== null) {
    return rewriteTo(req, NOT_FOUND_PATH);
  }

  let route: SiteRoute | null;
  try {
    route = await lookupSubdomain(sub);
  } catch (err) {
    console.error("[middleware]", err);
    return new NextResponse("Temporarily unavailable", { status: 503, headers: { "Retry-After": "30" } });
  }
  if (!route) return rewriteTo(req, NOT_FOUND_PATH);

  const profile = sitePath(route);
  if (path === "/") return rewriteTo(req, `${profile}/website`);
  // This website's own sitemap (just its home page), named in robots.txt.
  if (path === "/sitemap.xml") return rewriteTo(req, `${WEBSITE_SITEMAP_PATH}/${sub}`);
  // The contact file is doctor-only; every site has a card page.
  if (route.kind === "doctor" && path === "/contact.vcf") return rewriteTo(req, `${profile}/contact.vcf`);
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
  if (!session || !(STORED_ADMIN_ROLES as readonly string[]).includes(session.role)) {
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
  // The website pages and their sitemaps belong to the subdomains: the apex has the listing.
  if (WEBSITE_ONLY.test(path) || path.startsWith(`${WEBSITE_SITEMAP_PATH}/`)) return rewriteTo(req, NOT_FOUND_PATH);
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

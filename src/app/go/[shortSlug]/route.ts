import { getRouteByShortSlug } from "@/lib/public/data";
import { DOCTOR_SHORT_SLUG_PREFIX } from "@/config/reserved";
import { SLUG_RE } from "@/lib/slug";
import { absUrl, paths } from "@/lib/site";

/**
 * Short links: /dr-amit-shah (rewritten here by next.config.mjs) → 301 to the
 * canonical /pune/doctor/dr-amit-shah-general-physician. Unknown → 404.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ shortSlug: string }> }) {
  const { shortSlug } = await params;
  const route =
    shortSlug.startsWith(DOCTOR_SHORT_SLUG_PREFIX) && SLUG_RE.test(shortSlug)
      ? await getRouteByShortSlug(shortSlug)
      : null;

  if (!route) {
    return new Response(
      `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Page not found | MediReach</title>` +
        `<p style="font-family:system-ui;padding:2rem">This doctor page doesn't exist. <a href="${absUrl("/")}">Go to MediReach</a></p>`,
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  return new Response(null, {
    status: 301,
    headers: {
      Location: absUrl(paths.doctor(route.citySlug, route.slug)),
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}

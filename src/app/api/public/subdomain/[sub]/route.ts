import { getRouteBySubdomain } from "@/lib/public/data";
import { subdomainError } from "@/lib/slug";

/**
 * Subdomain → profile route lookup used by the edge middleware (which can't
 * talk to MongoDB). Cached at the CDN for a minute; data comes from the
 * tag-cached query, so publishing updates it promptly.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ sub: string }> }) {
  const { sub } = await params;
  const route = subdomainError(sub) === null ? await getRouteBySubdomain(sub) : null;
  return Response.json(route ?? { error: "not_found" }, {
    status: route ? 200 : 404,
    headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
  });
}

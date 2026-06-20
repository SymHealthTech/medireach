import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { audit } from "@/lib/api/audit";
import { Content } from "@/models/Content";
import { CONTENT_DEFAULTS } from "@/lib/content";

/**
 * Content management (spec §6.6): edit Privacy Policy / Medical Disclaimer /
 * User Guide without a code deploy. GET returns the current (or default) copy;
 * PUT upserts the edited copy.
 */
const SLUGS = ["privacy-policy", "medical-disclaimer", "user-guide"] as const;
type Slug = (typeof SLUGS)[number];

function assertSlug(slug: string): asserts slug is Slug {
  if (!(SLUGS as readonly string[]).includes(slug)) throw Errors.notFound("Unknown content page.");
}

export const GET = route<{ slug: string }>({ roles: Roles.adminOnly }, async (_req, _ctx, { slug }) => {
  assertSlug(slug);
  const doc = await Content.findOne({ slug }).lean();
  const value = doc ? { title: doc.title, body: doc.body } : CONTENT_DEFAULTS[slug];
  return jsonOk(value);
});

const schema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().max(50_000),
});

export const PUT = route<{ slug: string }>({ roles: Roles.adminOnly }, async (req, ctx, { slug }) => {
  assertSlug(slug);
  const { title, body } = await parseBody(req, schema);
  await Content.updateOne({ slug }, { $set: { title, body } }, { upsert: true });
  await audit(ctx, "admin.content.update", { meta: { slug } });
  return jsonOk({ ok: true });
});

import { getCurrentAdmin } from "@/lib/auth/admin";
import { isObjectId } from "@/lib/admin/list";
import { isSales, ownedScope } from "@/lib/admin/scope";
import { Establishment } from "@/models/Establishment";
import { loadSiteForCard } from "@/lib/cards/admin";
import { CARD_FILES, siteCardFileResponse, type CardFile } from "@/lib/cards/render";

/** Dashboard clinic/hospital card downloads (drafts too). Staff only, never cached. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; file: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("Forbidden", { status: 403 });
  const { id, file } = await params;
  if (!isObjectId(id) || !(file in CARD_FILES)) return new Response("Not found", { status: 404 });
  // Sales executives: only their own cards.
  if (isSales(admin) && !(await Establishment.exists({ _id: id, ...ownedScope(admin) }))) return new Response("Not found", { status: 404 });
  const site = await loadSiteForCard(id);
  if (!site) return new Response("Not found", { status: 404 });
  return siteCardFileResponse(site, file as CardFile, {
    cacheControl: "private, no-store",
    download: new URL(req.url).searchParams.get("download") === "1",
  });
}

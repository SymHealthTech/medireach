import { getCurrentAdmin } from "@/lib/auth/admin";
import { isObjectId } from "@/lib/admin/list";
import { isSales, ownedScope } from "@/lib/admin/scope";
import { DoctorProfile } from "@/models/DoctorProfile";
import { loadDoctorForCard } from "@/lib/cards/admin";
import { CARD_FILES, cardFileResponse, type CardFile } from "@/lib/cards/render";
import { getReadyTemplates } from "@/lib/public/templates";

/** Dashboard card downloads (works for drafts too). Staff only, never cached. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; file: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("Forbidden", { status: 403 });
  const { id, file } = await params;
  if (!isObjectId(id) || !(file in CARD_FILES)) return new Response("Not found", { status: 404 });
  // Sales executives: only their own cards.
  if (isSales(admin) && !(await DoctorProfile.exists({ _id: id, ...ownedScope(admin) }))) return new Response("Not found", { status: 404 });
  const doctor = await loadDoctorForCard(id);
  if (!doctor) return new Response("Not found", { status: 404 });
  return cardFileResponse(doctor, file as CardFile, {
    ready: await getReadyTemplates(),
    cacheControl: "private, no-store",
    download: new URL(req.url).searchParams.get("download") === "1",
  });
}

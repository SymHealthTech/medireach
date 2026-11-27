"use server";

import { z } from "zod";
import { ActionError, adminAction, auditCtx, objectId } from "@/lib/admin/action";
import { createEditCode, EDIT_UNLOCK_HOURS, redeemEditCode } from "@/lib/admin/edit-unlock";
import { assertOwned } from "@/lib/admin/scope";
import { audit } from "@/lib/api/audit";
import { hitRateLimit } from "@/lib/api/rate-limit";
import { editCodeEmail } from "@/lib/auth/login-email";
import { sendEmail } from "@/lib/integrations/email";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";

/**
 * Sales executives and live websites: they ask for the owner's code (emailed
 * to the doctor's / owner's login email), type it in, and can then update the
 * live site for a while. Super admins edit live sites directly.
 */

const target = z.object({ kind: z.enum(["doctor", "site"]), id: objectId });

async function load(kind: "doctor" | "site", id: string) {
  if (kind === "doctor") {
    const d = await DoctorProfile.findById(id).select({ salesAdminId: 1, status: 1, ownerEmail: 1, title: 1, firstName: 1, lastName: 1, displayName: 1 }).lean();
    return d && { ...d, name: d.displayName || `${d.title || "Dr."} ${d.firstName} ${d.lastName}`, entity: "DoctorProfile" };
  }
  const e = await Establishment.findById(id).select({ salesAdminId: 1, status: 1, ownerEmail: 1, name: 1 }).lean();
  return e && { ...e, entity: "Establishment" };
}

/** "as***@gmail.com": enough for the sales executive to tell the owner where to look. */
const masked = (email: string) => email.replace(/^(.{1,2})[^@]*(@.*)$/, "$1***$2");

export const sendEditCodeAction = adminAction({ schema: target, roles: ["sales"] }, async ({ kind, id }, admin) => {
  const doc = await load(kind, id);
  assertOwned(admin, doc);
  if (doc!.status !== "published") throw new ActionError("This website isn't live, so no code is needed.");
  if (!doc!.ownerEmail) {
    throw new ActionError(
      kind === "doctor"
        ? "This doctor has no login email yet, so we can't send them a code. Ask the super admin to add it, or to make the change."
        : "This site has no owner login email yet, so we can't send a code. Ask the super admin to add it, or to make the change.",
    );
  }
  const limit = await hitRateLimit(`edit-code:send:${admin.id}:${id}`, 5, 60 * 60_000);
  if (!limit.allowed) throw new ActionError("Several codes were sent in the last hour. Please wait before asking for another.");
  const code = await createEditCode(admin.id, id);
  const sent = await sendEmail({ to: doc!.ownerEmail, ...editCodeEmail({ name: doc!.name, code, salesName: admin.name, siteName: doc!.name, hours: EDIT_UNLOCK_HOURS }) });
  if (!sent.ok) throw new ActionError("The code couldn't be emailed. Please try again in a minute.");
  await audit(auditCtx(admin), "site.edit_code_sent", { entity: doc!.entity, entityId: id, diff: { to: doc!.ownerEmail } });
  return { to: masked(doc!.ownerEmail) };
});

export const redeemEditCodeAction = adminAction({ schema: target.extend({ code: z.string().trim() }), roles: ["sales"] }, async ({ kind, id, code }, admin) => {
  const doc = await load(kind, id);
  assertOwned(admin, doc);
  const limit = await hitRateLimit(`edit-code:check:${admin.id}`, 20, 15 * 60_000);
  if (!limit.allowed) throw new ActionError("Too many tries. Please wait a few minutes.");
  const until = await redeemEditCode(admin.id, id, code.replace(/\s/g, ""));
  if (!until) throw new ActionError("That code is wrong or has expired. Ask the owner for the latest code, or send a new one.", { code: "Wrong or expired code." });
  await audit(auditCtx(admin), "site.edit_unlocked", { entity: doc!.entity, entityId: id, diff: { until: until.toISOString() } });
  return { until: until.toISOString() };
});

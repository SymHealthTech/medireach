"use server";

import { z } from "zod";
import { ActionError, adminAction, auditCtx, objectId } from "@/lib/admin/action";
import { audit } from "@/lib/api/audit";
import { assignIntakeToSales, giveSiteToSales } from "@/lib/visits/match";
import { Admin } from "@/models/Admin";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";
import { Intake } from "@/models/Intake";

/**
 * Super admin: give a doctor / clinic / hospital website to a sales executive
 * (or take it back). They then see and work on it. The website form it was
 * made from follows, so its visit shows "Form filled" in their work list.
 */
export const assignSiteSalesAction = adminAction(
  { schema: z.object({ kind: z.enum(["doctor", "site"]), id: objectId, salesAdminId: objectId.nullable() }), roles: ["superadmin"] },
  async ({ kind, id, salesAdminId }, admin) => {
    const exec = salesAdminId ? await Admin.findOne({ _id: salesAdminId, role: "sales" }).select({ _id: 1, name: 1, staffId: 1 }).lean() : null;
    if (salesAdminId && !exec) throw new ActionError("That sales executive was not found.");
    const site =
      kind === "doctor" ? await DoctorProfile.findById(id).select({ _id: 1 }).lean() : await Establishment.findById(id).select({ _id: 1, kind: 1 }).lean();
    if (!site) throw new ActionError("Website not found.");
    const siteKind = kind === "doctor" ? "doctor" : ((site as { kind: "clinic" | "hospital" }).kind ?? "clinic");
    await giveSiteToSales(siteKind, id, exec?._id ?? null, { onlyIfUnowned: false });
    for (const f of await Intake.find({ "convertedTo.id": site._id }).select({ _id: 1 }).lean()) await assignIntakeToSales(String(f._id), salesAdminId);
    await audit(auditCtx(admin), "site.assign_sales", {
      entity: kind === "doctor" ? "DoctorProfile" : "Establishment",
      entityId: id,
      diff: { to: exec ? `${exec.name} (${exec.staffId ?? "no ID"})` : "nobody" },
    });
    return { name: exec?.name ?? null };
  },
);

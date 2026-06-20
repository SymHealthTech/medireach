import { z } from "zod";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { audit } from "@/lib/api/audit";
import { markInvoicePaid } from "@/lib/billing/invoicing";

/**
 * Manually mark an invoice paid (spec §6.2) — e.g. an offline/cash payment or a
 * credit/adjustment. Reuses the shared markInvoicePaid (resumes access if it
 * clears the last outstanding invoice). Recorded with an admin note + audited.
 */
const schema = z.object({ note: z.string().trim().max(300).optional() });

export const POST = route<{ id: string }>({ roles: Roles.adminOnly }, async (req, ctx, { id }) => {
  const { note } = await parseBody(req, schema);
  await markInvoicePaid(id, { by: "doctor", adminNote: note ?? "Manually marked paid by admin." });
  await audit(ctx, "admin.invoice.mark-paid", { targetType: "Invoice", targetId: id, meta: { note } });
  return jsonOk({ ok: true });
});

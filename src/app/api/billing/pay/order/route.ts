import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody, fields } from "@/lib/api/validate";
import { requireDoctorId } from "@/lib/api/context";
import { loadDoctor } from "@/lib/api/account";
import { Invoice } from "@/models/Invoice";
import { createOrder, publicKeyId } from "@/lib/integrations/razorpay";

/**
 * Start payment for an outstanding invoice (spec §11). Verifies the invoice
 * belongs to this doctor and is unpaid, then creates a Razorpay order carrying
 * the invoiceId in notes so the webhook backstop can reconcile it.
 */
const schema = z.object({ invoiceId: fields.objectId });

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const { invoiceId } = await parseBody(req, schema);
  const doctorId = requireDoctorId(ctx);

  const invoice = await Invoice.findOne({ _id: invoiceId, doctorId });
  if (!invoice) throw Errors.notFound("Invoice not found.");
  if (invoice.status === "paid") throw Errors.conflict("This invoice is already paid.");

  const doctor = await loadDoctor(ctx);
  try {
    const order = await createOrder(invoice.amount, `inv-${invoice._id}`, {
      invoiceId: String(invoice._id),
      doctorId,
      purpose: "subscription",
    });
    return jsonOk({
      orderId: order.id,
      amount: order.amount,
      keyId: publicKeyId(),
      prefill: { name: doctor.name, email: doctor.email, contact: doctor.mobile },
    });
  } catch (err) {
    console.error("[billing] order failed:", err);
    throw Errors.badRequest("Could not start payment. Please try again.");
  }
});

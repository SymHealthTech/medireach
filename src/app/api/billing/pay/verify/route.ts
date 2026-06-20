import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody, fields } from "@/lib/api/validate";
import { requireDoctorId } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";
import { Invoice } from "@/models/Invoice";
import { verifyPaymentSignature } from "@/lib/integrations/razorpay";
import { markInvoicePaid } from "@/lib/billing/invoicing";

/**
 * Confirm an invoice payment (spec §11, §15.3): verify the Razorpay signature
 * before marking anything paid, then mark the invoice paid and resume access if
 * the doctor was paused. The webhook is a backstop for the same outcome.
 */
const schema = z.object({
  invoiceId: fields.objectId,
  orderId: z.string().trim().min(1),
  paymentId: z.string().trim().min(1),
  signature: z.string().trim().min(1),
});

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const { invoiceId, orderId, paymentId, signature } = await parseBody(req, schema);
  const doctorId = requireDoctorId(ctx);

  const invoice = await Invoice.findOne({ _id: invoiceId, doctorId });
  if (!invoice) throw Errors.notFound("Invoice not found.");

  if (!verifyPaymentSignature(orderId, paymentId, signature)) {
    throw Errors.badRequest("Payment could not be verified. If money was deducted, contact support.");
  }

  await markInvoicePaid(invoice._id, { paymentId, orderId, by: "doctor" });
  await audit(ctx, "billing.invoice.paid", { targetType: "Invoice", targetId: invoice._id });
  return jsonOk({ ok: true });
});

import { type NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/integrations/razorpay";
import { Invoice } from "@/models/Invoice";
import { markInvoicePaid } from "@/lib/billing/invoicing";

/**
 * Razorpay webhook (spec §15.3) — the cryptographic-verification backstop for
 * payment confirmation. The raw body is verified against the
 * `x-razorpay-signature` header BEFORE anything is trusted; an unverified
 * webhook is a direct path to free account access, so verification is
 * non-negotiable and happens first. Always returns 200 once verified so
 * Razorpay doesn't retry indefinitely, even if our handling no-ops.
 */
export async function POST(req: NextRequest) {
  // Read the RAW body — signature is computed over the exact bytes.
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(rawBody) as RazorpayEvent;
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    await handleEvent(event);
  } catch (err) {
    // Log but still 200 — we've verified authenticity; retries won't help a bug.
    console.error("[razorpay webhook] handling error:", err);
  }

  return NextResponse.json({ ok: true });
}

interface RazorpayEvent {
  event: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; notes?: Record<string, string> } };
    order?: { entity?: { id?: string; notes?: Record<string, string> } };
    payment_link?: { entity?: { id?: string; notes?: Record<string, string> } };
  };
}

async function handleEvent(event: RazorpayEvent): Promise<void> {
  const notes =
    event.payload?.payment?.entity?.notes ??
    event.payload?.order?.entity?.notes ??
    event.payload?.payment_link?.entity?.notes ??
    {};
  const paymentId = event.payload?.payment?.entity?.id;
  const orderId = event.payload?.payment?.entity?.order_id ?? event.payload?.order?.entity?.id;

  switch (event.event) {
    case "payment.captured":
    case "order.paid": {
      const invoiceId = notes.invoiceId;
      if (invoiceId) {
        await markInvoicePaid(invoiceId, { paymentId, orderId, by: "doctor" });
      }
      return;
    }
    case "payment_link.paid": {
      // Sponsor paid via the shared link (§8). Settle the doctor's oldest
      // outstanding invoice on their behalf.
      const doctorId = notes.doctorId;
      if (doctorId) {
        const inv = await Invoice.findOne({
          doctorId,
          status: { $in: ["pending", "overdue"] },
        }).sort({ cycleNumber: 1 });
        if (inv) await markInvoicePaid(inv._id, { paymentId, by: "sponsor" });
      }
      return;
    }
    default:
      // Ignore unrelated events.
      return;
  }
}

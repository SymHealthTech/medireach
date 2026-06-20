import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import { requireEnv } from "@/lib/env";

/**
 * Razorpay integration (spec §11, §15.3). Used for the ₹99 joining fee and, in
 * Phase 5, usage-based cycle invoices + payment links. Two non-negotiables:
 *  - Payment signatures are verified before any account state changes.
 *  - Webhook payloads are cryptographically verified before being trusted
 *    (§15.3 — an unverified webhook is a direct path to free account access).
 */

let client: Razorpay | null = null;
function getClient(): Razorpay {
  if (!client) {
    client = new Razorpay({
      key_id: requireEnv("RAZORPAY_KEY_ID"),
      key_secret: requireEnv("RAZORPAY_KEY_SECRET"),
    });
  }
  return client;
}

export interface CreatedOrder {
  id: string;
  amount: number; // paise
  currency: string;
}

/** Create an order for `amountInr` rupees. Returns the order for the client SDK. */
export async function createOrder(
  amountInr: number,
  receipt: string,
  notes: Record<string, string> = {},
): Promise<CreatedOrder> {
  const order = await getClient().orders.create({
    amount: Math.round(amountInr * 100),
    currency: "INR",
    receipt,
    notes,
  });
  return { id: order.id, amount: Number(order.amount), currency: order.currency };
}

function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Verify the checkout callback signature: HMAC_SHA256(order_id|payment_id). */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const expected = createHmac("sha256", requireEnv("RAZORPAY_KEY_SECRET"))
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeEqualHex(expected, signature);
}

/** Verify a webhook payload signature against the raw request body (§15.3). */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const expected = createHmac("sha256", requireEnv("RAZORPAY_WEBHOOK_SECRET"))
    .update(rawBody)
    .digest("hex");
  return safeEqualHex(expected, signature);
}

/** Public key id for the client checkout SDK (safe to expose). */
export function publicKeyId(): string {
  return requireEnv("RAZORPAY_KEY_ID");
}

export interface CreatedPaymentLink {
  id: string;
  shortUrl: string;
}

/**
 * Create a shareable Razorpay payment link (spec §8, §11) — used to bill a
 * sponsoring medical store directly for a doctor's subscription in exchange for
 * the prescription-footer placement. We do NOT have Razorpay auto-notify the
 * store by SMS (no SMS anywhere in the product); the returned short_url is shown
 * in the app for the doctor to share with the store directly.
 */
export async function createPaymentLink(opts: {
  amountInr: number;
  description: string;
  customerName: string;
  contact: string;
  notes?: Record<string, string>;
}): Promise<CreatedPaymentLink> {
  // The razorpay SDK types don't fully cover paymentLink; call through a typed
  // shape rather than `any`.
  const client = getClient() as unknown as {
    paymentLink: {
      create: (params: Record<string, unknown>) => Promise<{ id: string; short_url: string }>;
    };
  };
  const link = await client.paymentLink.create({
    amount: Math.round(opts.amountInr * 100),
    currency: "INR",
    description: opts.description,
    customer: { name: opts.customerName, contact: opts.contact },
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: opts.notes ?? {},
  });
  return { id: link.id, shortUrl: link.short_url };
}

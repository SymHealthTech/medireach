"use client";

/**
 * Loads the Razorpay Checkout script on demand and opens the payment modal.
 * Resolves with the checkout response (payment id, order id, signature) which
 * the caller sends to the server for signature verification (spec §11/§15.3).
 */

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface CheckoutConfig {
  keyId: string;
  orderId: string;
  amount: number;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the payment module."));
    document.body.appendChild(script);
  });
}

export async function openCheckout(config: CheckoutConfig): Promise<RazorpayResponse> {
  await loadScript();
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) return reject(new Error("Payment module unavailable."));
    const rzp = new window.Razorpay({
      key: config.keyId,
      order_id: config.orderId,
      amount: config.amount,
      currency: "INR",
      name: config.name,
      description: config.description,
      prefill: config.prefill,
      theme: { color: "#0E7C7B" },
      handler: (response: RazorpayResponse) => resolve(response),
      modal: { ondismiss: () => reject(new Error("Payment was cancelled.")) },
    });
    rzp.open();
  });
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { apiPost } from "@/lib/client/api";
import { openCheckout } from "@/lib/client/razorpay";
import { BILLING } from "@/lib/constants";

/**
 * Onboarding step 6 (spec §5.3, §11): pay the ₹99 joining fee via Razorpay.
 * On success the server verifies the signature and activates the account
 * immediately, returning the doctor's permanent app ID.
 */
interface OrderResp {
  orderId: string;
  amount: number;
  keyId: string;
  prefill: { name: string; email: string; contact: string };
}

export function PaymentStep({ onDone }: { onDone: (appId: string | null) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function skipPayment() {
    setError(null);
    setLoading(true);
    try {
      const result = await apiPost<{ appId: string | null }>("/api/onboarding/payment/skip");
      onDone(result.appId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function pay() {
    setError(null);
    setLoading(true);
    try {
      const order = await apiPost<OrderResp>("/api/onboarding/payment/order");
      const result = await openCheckout({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        name: "MediReach",
        description: "Joining fee",
        prefill: order.prefill,
      });
      const verified = await apiPost<{ appId: string | null }>("/api/onboarding/payment/verify", {
        orderId: result.razorpay_order_id,
        paymentId: result.razorpay_payment_id,
        signature: result.razorpay_signature,
      });
      onDone(verified.appId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-ink">Activate your account</h1>
        <p className="text-sm text-ink-muted">
          A one-time joining fee confirms your registration and starts your billing cycle.
        </p>
      </div>

      <div className="rounded-xl bg-surface p-4 text-center">
        <p className="text-3xl font-bold text-ink">₹{BILLING.JOINING_FEE_INR}</p>
        <p className="text-sm text-ink-muted">one-time joining fee</p>
      </div>

      {error && (
        <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="alert">
          {error}
        </p>
      )}

      <Button variant="primary" size="lg" className="w-full" onClick={pay} disabled={loading}>
        {loading ? "Processing…" : `Pay ₹${BILLING.JOINING_FEE_INR} & activate`}
      </Button>
      <p className="text-center text-xs text-ink-muted">
        Then ₹{BILLING.MONTHLY_MINIMUM_INR}/cycle minimum + ₹{BILLING.PER_PATIENT_INR} per patient.
        No free trial — billing starts today.
      </p>
      {process.env.NODE_ENV !== "production" && (
        <button
          type="button"
          className="w-full text-xs text-ink-muted hover:underline"
          onClick={skipPayment}
          disabled={loading}
        >
          [Dev] Skip payment & activate
        </button>
      )}
    </div>
  );
}

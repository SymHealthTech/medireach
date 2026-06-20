import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { loadDoctor } from "@/lib/api/account";
import { createOrder, publicKeyId } from "@/lib/integrations/razorpay";
import { BILLING } from "@/lib/constants";

/**
 * Onboarding step 6 (spec §5.3, §11): create the ₹99 joining-fee order. The
 * profile + document steps must be done first. Returns the order id + public
 * key for the Razorpay checkout SDK on the client.
 */
export const POST = route({ roles: Roles.doctorOnly }, async (_req, ctx) => {
  const doctor = await loadDoctor(ctx);

  if (doctor.onboardingStep >= 7 && doctor.accountStatus !== "incomplete-onboarding") {
    throw Errors.conflict("This account is already active.");
  }
  if (doctor.onboardingStep < 5) {
    throw Errors.badRequest("Complete your profile and verification document first.");
  }

  try {
    const order = await createOrder(BILLING.JOINING_FEE_INR, `joining-${doctor._id}`, {
      doctorId: doctor._id.toString(),
      purpose: "joining-fee",
    });
    return jsonOk({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: publicKeyId(),
      prefill: { name: doctor.name, email: doctor.email, contact: doctor.mobile },
    });
  } catch (err) {
    console.error("[onboarding] razorpay order failed:", err);
    throw Errors.badRequest("Could not start payment. Please try again in a moment.");
  }
});

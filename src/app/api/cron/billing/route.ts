import { type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, jsonOk } from "@/lib/api/errors";
import { assertCron } from "@/lib/api/cron";
import { Doctor } from "@/models/Doctor";
import { Invoice } from "@/models/Invoice";
import { Sponsor } from "@/models/Sponsor";
import { PrescriptionTemplate } from "@/models/PrescriptionTemplate";
import { lastCompletedCycle, dayInCurrentCycle } from "@/lib/billing/cycle";
import { generateInvoiceForCycle } from "@/lib/billing/invoicing";
import { pushToDoctor } from "@/lib/integrations/push";
import { BILLING } from "@/lib/constants";

/**
 * Daily billing job (spec §11, §14). One job iterating every doctor against
 * their individual fixed cycle (not five fixed-time jobs):
 *   - close the just-ended cycle → generate its invoice (idempotent),
 *   - Day 25 → fire the "bill ready in 5 days" reminder,
 *   - any invoice unpaid past its Day-40 grace end → pause access (data is
 *     preserved); if a sponsor was the payer, liability reverts to the doctor
 *     and the footer is pulled (§8 / §16.4).
 * Pure dates from cycleStartDate — late payment never shifts the schedule (§11).
 *
 * Notifications go out as VAPID web push to the doctor's registered devices —
 * never SMS (the doctor is an app user with a push subscription).
 */
export async function GET(req: NextRequest) {
  try {
    assertCron(req);
    await connectToDatabase();
    const now = new Date();

    const doctors = await Doctor.find({
      accountStatus: { $in: ["active", "paused"] },
      cycleStartDate: { $ne: null },
    }).select("_id cycleStartDate accountStatus pendingUnsubscribe unsubscribeEffectiveAt");

    let invoicesCreated = 0;
    let remindersSent = 0;
    let paused = 0;
    let unsubscribed = 0;

    for (const doctor of doctors) {
      if (!doctor.cycleStartDate) continue;

      // End-of-cycle unsubscribe takes effect now (§12).
      if (
        doctor.pendingUnsubscribe &&
        doctor.unsubscribeEffectiveAt &&
        doctor.unsubscribeEffectiveAt.getTime() <= now.getTime()
      ) {
        doctor.accountStatus = "unsubscribed";
        doctor.pendingUnsubscribe = false;
        await doctor.save();
        unsubscribed++;
        continue; // no further billing for an unsubscribed account
      }

      // 1) Close the previous cycle → invoice.
      const closed = lastCompletedCycle(doctor.cycleStartDate, now);
      if (closed) {
        const res = await generateInvoiceForCycle(doctor._id, closed);
        if (res.created) invoicesCreated++;
      }

      // 2) Day-25 reminder (web push to the doctor's devices).
      if (dayInCurrentCycle(doctor.cycleStartDate, now) === BILLING.REMINDER_DAY) {
        await pushToDoctor(String(doctor._id), {
          title: "MediReach billing",
          body: "Your bill will be ready in 5 days.",
          url: "/app/billing",
        });
        remindersSent++;
      }

      // 3) Grace-end → pause unpaid invoices.
      const overdue = await Invoice.find({
        doctorId: doctor._id,
        status: { $in: ["pending", "overdue"] },
        graceEndDate: { $lte: now },
      });
      for (const inv of overdue) {
        if (inv.status === "pending") {
          inv.status = "overdue";
        }
        // Sponsor failed to pay by the deadline → revert liability to the doctor
        // and pull the footer placement for the next cycle (§8 / §16.4).
        if (inv.payer === "sponsor") {
          inv.payer = "doctor";
          await Sponsor.updateOne({ doctorId: doctor._id }, { $set: { paymentResponsibility: "lapsed" } });
          await PrescriptionTemplate.updateOne({ doctorId: doctor._id }, { $unset: { footer: "" } });
        }
        await inv.save();

        if (doctor.accountStatus !== "paused") {
          doctor.accountStatus = "paused";
          await doctor.save();
          await pushToDoctor(String(doctor._id), {
            title: "MediReach — access paused",
            body: "Access is paused due to a pending payment. Your data is safe and resumes immediately on payment.",
            url: "/app/billing",
          });
          paused++;
        }
      }
    }

    return jsonOk({ ok: true, doctors: doctors.length, invoicesCreated, remindersSent, paused, unsubscribed });
  } catch (err) {
    return errorResponse(err);
  }
}

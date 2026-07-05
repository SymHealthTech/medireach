import "server-only";
import type { HydratedDocument } from "mongoose";
import type { DoctorDoc } from "@/models/Doctor";
import { Errors } from "@/lib/api/errors";
import { currentCycle } from "@/lib/billing/cycle";
import type { Tier } from "@/lib/constants";

/**
 * Tier-change rules (Change 6), centralized so the doctor's Billing screen, the
 * admin doctor view, and the billing cron all apply identical timing semantics.
 * No mid-cycle proration in either direction — the timing rules are what avoid
 * it.
 *
 * Mutates the passed hydrated doctor document; the caller is responsible for
 * `.save()`. Pure w.r.t. external services.
 */

/**
 * UPGRADE Starter → Pro. IMMEDIATE: voice/AI unlock right away (`tier` flips to
 * `pro`). The CURRENT cycle keeps billing at its existing tier — we snapshot
 * `currentCycleTier` to the pre-upgrade tier so the in-progress cycle is not
 * retro-billed as Pro; Pro per-patient billing begins at the next cycle's Day 1.
 * Also cancels any pending downgrade (upgrading supersedes it).
 */
export function applyUpgrade(doctor: HydratedDocument<DoctorDoc>): void {
  const pendingWasDowngrade = doctor.tierChangePending?.toTier === "starter";
  if (doctor.tier === "pro" && !pendingWasDowngrade) {
    throw Errors.badRequest("This account is already on the Pro plan.");
  }
  // Freeze the current cycle's billing tier before flipping access. If it was
  // never snapshotted (legacy record), capture the tier in effect right now.
  if (doctor.currentCycleTier == null) doctor.currentCycleTier = doctor.tier;
  doctor.tier = "pro";
  doctor.tierChangePending = null;
}

/**
 * DOWNGRADE Pro → Starter. Takes effect at the NEXT cycle boundary, never
 * immediately: the doctor keeps voice/AI until the current paid cycle ends. We
 * record `tierChangePending`; the billing cron applies it at rollover. The
 * current cycle continues to bill as Pro (currentCycleTier unchanged).
 */
export function scheduleDowngrade(doctor: HydratedDocument<DoctorDoc>): void {
  if (!doctor.cycleStartDate) {
    throw Errors.badRequest("Billing has not started for this account yet.");
  }
  if (doctor.tier === "starter" && doctor.tierChangePending?.toTier !== "pro") {
    throw Errors.badRequest("This account is already on the Starter plan.");
  }
  const effectiveAtCycleStart = currentCycle(doctor.cycleStartDate).periodEnd;
  doctor.tier = "pro"; // ensure access is retained through the current cycle
  doctor.tierChangePending = { toTier: "starter", effectiveAtCycleStart };
}

/**
 * ADMIN FORCE — apply a tier change immediately in either direction, bypassing
 * the next-cycle timing (audited by the caller). Snapshots the current cycle's
 * billing tier to the target so the change also affects the in-progress cycle's
 * invoice, and clears any pending change.
 */
export function forceTier(doctor: HydratedDocument<DoctorDoc>, toTier: Tier): void {
  doctor.tier = toTier;
  doctor.currentCycleTier = toTier;
  doctor.tierChangePending = null;
}

/**
 * Apply a due pending tier change at a cycle rollover. Returns true if a change
 * was applied. Idempotent — clears the pending field once applied, so a repeat
 * cron run on a later day is a no-op.
 */
export function applyPendingTierChange(
  doctor: HydratedDocument<DoctorDoc>,
  now: Date,
): boolean {
  const pending = doctor.tierChangePending;
  if (pending && pending.effectiveAtCycleStart.getTime() <= now.getTime()) {
    doctor.tier = pending.toTier;
    doctor.tierChangePending = null;
    return true;
  }
  return false;
}

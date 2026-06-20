import "server-only";
import { Doctor } from "@/models/Doctor";
import { Receptionist } from "@/models/Receptionist";
import type { Role } from "@/lib/constants";
import type { TrustedDevice } from "@/models/Doctor";

/**
 * Resolve a clinic user (doctor or receptionist) by their login identifier
 * (spec §5.3, §15.1). A doctor logs in with registered email OR mobile; a
 * receptionist logs in with their username. Returns a normalized shape used by
 * the login + OTP routes so they don't branch on role everywhere.
 */
export interface ResolvedClinicUser {
  id: string;
  role: Extract<Role, "doctor" | "receptionist">;
  name: string;
  doctorId: string; // tenant scope (doctor's own id, or receptionist's link)
  email?: string; // OTP/recovery channel (Change 3); receptionists have none
  mobile?: string;
  passwordHash: string;
  trustedDevices: TrustedDevice[];
  // doctor-only lifecycle gate
  accountStatus?: string;
  onboardingComplete?: boolean;
  // receptionist-only: embedded in the session and checked per request
  tokenVersion?: number;
}

export async function resolveClinicUser(
  identifier: string,
): Promise<ResolvedClinicUser | null> {
  const id = identifier.trim().toLowerCase();

  // Doctor by email or mobile (mobile stored without country code).
  const mobileGuess = id.replace(/^\+?91/, "").replace(/\D/g, "");
  const doctor = await Doctor.findOne({
    $or: [{ email: id }, { mobile: mobileGuess || id }],
  });
  if (doctor) {
    return {
      id: doctor._id.toString(),
      role: "doctor",
      name: doctor.name,
      doctorId: doctor._id.toString(),
      email: doctor.email,
      mobile: doctor.mobile,
      passwordHash: doctor.passwordHash,
      trustedDevices: doctor.trustedDevices,
      accountStatus: doctor.accountStatus,
      onboardingComplete: doctor.onboardingStep >= 7,
    };
  }

  const receptionist = await Receptionist.findOne({ username: id, active: true });
  if (receptionist) {
    return {
      id: receptionist._id.toString(),
      role: "receptionist",
      name: receptionist.name,
      doctorId: receptionist.doctorId.toString(),
      mobile: receptionist.mobile,
      passwordHash: receptionist.passwordHash,
      trustedDevices: receptionist.trustedDevices,
      tokenVersion: receptionist.tokenVersion,
    };
  }

  return null;
}

/**
 * Per-request liveness check for a receptionist session (Change 1). Returns
 * false — invalidating the session — if the account has been deleted,
 * deactivated, or had its password changed (tokenVersion bumped) since the token
 * was issued. Doctor/admin sessions don't carry a tokenVersion and skip this.
 */
export async function isReceptionistSessionValid(
  userId: string,
  tokenVersion: number | undefined,
): Promise<boolean> {
  const r = await Receptionist.findById(userId).select("active tokenVersion").lean();
  if (!r || !r.active) return false;
  return r.tokenVersion === (tokenVersion ?? 0);
}

/** Persist a new trusted-device entry onto the correct collection. */
export async function appendTrustedDevice(
  userId: string,
  role: "doctor" | "receptionist",
  device: TrustedDevice,
): Promise<void> {
  if (role === "doctor") {
    await Doctor.updateOne({ _id: userId }, { $push: { trustedDevices: device } });
  } else {
    await Receptionist.updateOne({ _id: userId }, { $push: { trustedDevices: device } });
  }
}

"use server";

import { z } from "zod";
import { ActionError, adminAction, auditCtx, objectId, requiredText } from "@/lib/admin/action";
import { audit, shallowDiff } from "@/lib/api/audit";
import { hashPassword } from "@/lib/auth/password";
import { ADMIN_ROLES, GST_MODES, PRICE_KEYS, type PriceKey } from "@/lib/constants";
import { nextStaffId } from "@/lib/admin/staff";
import { getSettings } from "@/lib/settings";
import { Admin } from "@/models/Admin";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";
import { Setting, SETTINGS_KEY } from "@/models/Setting";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/public/tags";

const ADMINS = ["superadmin"] as const;
const price = z.number().int().min(0).max(1_000_000);
const digits = z
  .string()
  .trim()
  .transform((s) => s.replace(/[^\d]/g, ""))
  .refine((s) => s === "" || /^\d{10,13}$/.test(s), "Enter the number with country code, e.g. 9198XXXXXXXX.")
  .transform((s) => (s.length === 10 ? `91${s}` : s) || undefined);

// Schemas live at module level: Next treats inline callbacks inside an
// exported action's arguments as server actions.
const settingsSchema = z.object({
  prices: z.object(Object.fromEntries(PRICE_KEYS.map((k) => [k, price])) as Record<PriceKey, typeof price>),
  renewalGraceDays: z.number().int().min(0).max(365),
  contactPhone: digits,
  whatsappNumber: digits,
  gstMode: z.enum(GST_MODES),
  whatsappShareTemplate: z
    .string()
    .trim()
    .min(5)
    .max(500)
    .refine((s) => s.includes("{link}"), "Include {link} where the page link should go."),
});

export const saveSettingsAction = adminAction(
  { schema: settingsSchema, roles: ADMINS },
  async (input, admin) => {
    const before = await getSettings();
    // Dotted price paths: replacing the whole `prices` object would wipe keys this form doesn't send.
    const { prices, ...rest } = input;
    const priceSet = Object.fromEntries(Object.entries(prices).map(([k, v]) => [`prices.${k}`, v]));
    await Setting.updateOne({ key: SETTINGS_KEY }, { $set: { ...rest, ...priceSet }, $setOnInsert: { key: SETTINGS_KEY } }, { upsert: true });
    revalidateTag(CACHE_TAGS.settings); // marketing pages show prices and contact numbers
    await audit(auditCtx(admin), "settings.update", {
      entity: "Setting",
      diff: shallowDiff(
        { prices: before.prices, renewalGraceDays: before.renewalGraceDays, contactPhone: before.contactPhone, whatsappNumber: before.whatsappNumber, gstMode: before.gstMode, whatsappShareTemplate: before.whatsappShareTemplate },
        input,
      ),
    });
    return { ok: true };
  },
);

/** Save the banned-phrase list, or `null` to go back to the defaults in config/banned-phrases.ts. */
export const saveBannedPhrasesAction = adminAction(
  { schema: z.object({ phrases: z.array(z.string().trim().min(1).max(60)).max(500).nullable() }), roles: ADMINS },
  async ({ phrases }, admin) => {
    const unique = phrases ? [...new Set(phrases.map((p) => p.toLowerCase()))] : null;
    if (unique && unique.length === 0) throw new ActionError("The list can't be empty. Use “Reset to defaults” instead.");
    await Setting.updateOne(
      { key: SETTINGS_KEY },
      unique ? { $set: { bannedPhrases: unique } } : { $unset: { bannedPhrases: 1 } },
      { upsert: true },
    );
    await audit(auditCtx(admin), "settings.banned_phrases", { entity: "Setting", diff: { count: unique?.length ?? "defaults" } });
    return { count: unique?.length ?? null };
  },
);

// --- Dashboard users (superadmin only) ------------------------------------
//
// Super admins log in with their email. Sales executives log in with a staff
// ID made here ("MRS-1001") and the password the super admin sets; they can't
// change it themselves (only a super admin can reset it).

const password = z.string().min(12, "Use at least 12 characters.").max(200);
const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .refine((s) => s === "" || z.string().email().safeParse(s).success, "Enter a valid email.")
  .transform((s) => s || undefined);
const mobile = z
  .string()
  .trim()
  .transform((s) => s.replace(/[^\d]/g, "").replace(/^(91|0)(?=\d{10}$)/, ""))
  .refine((s) => s === "" || /^[6-9]\d{9}$/.test(s), "Enter a 10-digit mobile number.")
  .transform((s) => s || undefined);

async function activeSuperadmins(excludeId?: string) {
  return Admin.countDocuments({ role: { $in: ["superadmin", "admin"] }, active: true, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
}

// The email index became "unique when present" (sales executives may have none): bring old databases in line once.
let indexesSynced = false;
async function syncAdminIndexes() {
  if (indexesSynced) return;
  await Admin.syncIndexes();
  indexesSynced = true;
}

async function assertEmailFree(email: string | undefined, excludeId?: string) {
  if (email && (await Admin.exists({ email, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }))) {
    throw new ActionError("An account with that email already exists.", { email: "Already used by another user." });
  }
}

const userFields = z.object({
  name: requiredText(80, "Name"),
  email: optionalEmail,
  mobile,
  role: z.enum(ADMIN_ROLES),
});
const needsEmail = (v: { role: string; email?: string }) => v.role !== "superadmin" || Boolean(v.email);
const emailRequired = { message: "A super admin logs in with their email: enter one.", path: ["email"] };

export const createAdminUserAction = adminAction(
  { schema: userFields.extend({ password }).refine(needsEmail, emailRequired), roles: ["superadmin"] },
  async ({ name, email, mobile: phone, role, password: pw }, admin) => {
    await syncAdminIndexes();
    await assertEmailFree(email);
    const staffId = role === "sales" ? await nextStaffId() : undefined;
    const user = await Admin.create({ name, email, mobile: phone, role, staffId, active: true, passwordHash: await hashPassword(pw) });
    await audit(auditCtx(admin), "admin_user.create", { entity: "Admin", entityId: user._id, diff: { name, email, role, staffId } });
    return { id: String(user._id), loginId: staffId ?? email!, name };
  },
);

export const updateAdminUserAction = adminAction(
  { schema: userFields.extend({ id: objectId, active: z.boolean() }).refine(needsEmail, emailRequired), roles: ["superadmin"] },
  async ({ id, name, email, mobile: phone, role, active }, admin) => {
    const user = await Admin.findById(id);
    if (!user) throw new ActionError("User not found.");
    if (id === admin.id && (role !== "superadmin" || !active)) throw new ActionError("You can't demote or deactivate yourself.");
    if (user.role !== "sales" && (role !== "superadmin" || !active) && (await activeSuperadmins(id)) === 0) {
      throw new ActionError("There must be at least one active super admin.");
    }
    await syncAdminIndexes();
    await assertEmailFree(email, id);
    const before = { name: user.name, email: user.email, mobile: user.mobile, role: user.role, active: user.active };
    user.set({ name, email, mobile: phone, role, active });
    if (role === "sales" && !user.staffId) user.staffId = await nextStaffId();
    await user.save();
    await audit(auditCtx(admin), "admin_user.update", { entity: "Admin", entityId: id, diff: shallowDiff(before, { name, email, mobile: phone, role, active }) });
    return { id };
  },
);

export const resetAdminPasswordAction = adminAction(
  { schema: z.object({ id: objectId, password }), roles: ["superadmin"] },
  async ({ id, password: pw }, admin) => {
    const res = await Admin.updateOne({ _id: id }, { $set: { passwordHash: await hashPassword(pw) } });
    if (res.matchedCount === 0) throw new ActionError("User not found.");
    await audit(auditCtx(admin), "admin_user.password_reset", { entity: "Admin", entityId: id });
    return { id };
  },
);

/**
 * Remove a dashboard user. They are signed out at once. Their doctors, clinics
 * and hospitals stay (with their name as the sales executive) and are then
 * looked after by the super admin; reassign them on each Review step.
 */
export const deleteAdminUserAction = adminAction({ schema: z.object({ id: objectId }), roles: ["superadmin"] }, async ({ id }, admin) => {
  if (id === admin.id) throw new ActionError("You can't delete your own account.");
  const user = await Admin.findById(id).lean();
  if (!user) throw new ActionError("User not found.");
  if (user.role !== "sales" && (await activeSuperadmins(id)) === 0) throw new ActionError("There must be at least one active super admin.");
  await Admin.deleteOne({ _id: id });
  const owner = { salesAdminId: user._id };
  const [doctors, sites] = await Promise.all([
    DoctorProfile.updateMany(owner, { $unset: { salesAdminId: 1 } }),
    Establishment.updateMany(owner, { $unset: { salesAdminId: 1 } }),
  ]);
  await audit(auditCtx(admin), "admin_user.delete", {
    entity: "Admin",
    entityId: id,
    diff: { name: user.name, staffId: user.staffId, email: user.email, role: user.role, websites: doctors.modifiedCount + sites.modifiedCount },
  });
  return { id };
});

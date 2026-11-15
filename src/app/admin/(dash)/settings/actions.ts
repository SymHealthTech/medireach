"use server";

import { z } from "zod";
import { ActionError, adminAction, auditCtx, objectId, requiredText } from "@/lib/admin/action";
import { audit, shallowDiff } from "@/lib/api/audit";
import { hashPassword } from "@/lib/auth/password";
import { ADMIN_ROLES, GST_MODES } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import { Admin } from "@/models/Admin";
import { Setting, SETTINGS_KEY } from "@/models/Setting";

const ADMINS = ["superadmin", "admin"] as const;
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
  prices: z.object({ gp: price, consultant: price, update: price }),
  foundingTotal: z.number().int().min(0).max(10_000),
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
    await Setting.updateOne({ key: SETTINGS_KEY }, { $set: input, $setOnInsert: { key: SETTINGS_KEY } }, { upsert: true });
    await audit(auditCtx(admin), "settings.update", {
      entity: "Setting",
      diff: shallowDiff(
        { prices: before.prices, foundingTotal: before.foundingTotal, contactPhone: before.contactPhone, whatsappNumber: before.whatsappNumber, gstMode: before.gstMode, whatsappShareTemplate: before.whatsappShareTemplate },
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

// --- Admin users (superadmin only) -----------------------------------------

const password = z.string().min(12, "Use at least 12 characters.").max(200);

async function activeSuperadmins(excludeId?: string) {
  return Admin.countDocuments({ role: "superadmin", active: true, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
}

export const createAdminUserAction = adminAction(
  {
    schema: z.object({
      name: requiredText(80, "Name"),
      email: z.string().trim().toLowerCase().email("Enter a valid email."),
      role: z.enum(ADMIN_ROLES),
      password,
    }),
    roles: ["superadmin"],
  },
  async ({ name, email, role, password: pw }, admin) => {
    if (await Admin.exists({ email })) throw new ActionError("An account with that email already exists.", { email: "Already exists." });
    const user = await Admin.create({ name, email, role, active: true, passwordHash: await hashPassword(pw) });
    await audit(auditCtx(admin), "admin_user.create", { entity: "Admin", entityId: user._id, diff: { email, role } });
    return { id: String(user._id) };
  },
);

export const updateAdminUserAction = adminAction(
  {
    schema: z.object({ id: objectId, name: requiredText(80, "Name"), role: z.enum(ADMIN_ROLES), active: z.boolean() }),
    roles: ["superadmin"],
  },
  async ({ id, name, role, active }, admin) => {
    const user = await Admin.findById(id);
    if (!user) throw new ActionError("User not found.");
    if (id === admin.id && (role !== "superadmin" || !active)) throw new ActionError("You can't demote or deactivate yourself.");
    if (user.role === "superadmin" && (role !== "superadmin" || !active) && (await activeSuperadmins(id)) === 0) {
      throw new ActionError("There must be at least one active super admin.");
    }
    const before = { name: user.name, role: user.role, active: user.active };
    user.set({ name, role, active });
    await user.save();
    await audit(auditCtx(admin), "admin_user.update", { entity: "Admin", entityId: id, diff: shallowDiff(before, { name, role, active }) });
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

import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import { Admin } from "@/models/Admin";

/**
 * Create (or, with `resetPassword`, re-password) the first superadmin.
 * Idempotent: an existing account is left alone unless asked.
 */

const inputSchema = z.object({
  email: z.string().trim().toLowerCase().email("ADMIN_EMAIL must be a valid email."),
  password: z
    .string()
    .min(12, "ADMIN_PASSWORD must be at least 12 characters.")
    .max(200)
    .refine((p) => !/^(.)\1+$/.test(p), "ADMIN_PASSWORD is too simple."),
  name: z.string().trim().min(1).max(80).default("Admin"),
});

export type SeedAdminResult = "created" | "exists" | "password_reset";

export async function seedSuperadmin(
  input: { email?: string; password?: string; name?: string },
  opts: { resetPassword?: boolean } = {},
): Promise<SeedAdminResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(" "));
  const { email, password, name } = parsed.data;

  await Admin.syncIndexes();
  const existing = await Admin.findOne({ email });
  if (existing) {
    if (!opts.resetPassword) return "exists";
    existing.passwordHash = await hashPassword(password);
    existing.active = true;
    await existing.save();
    return "password_reset";
  }
  await Admin.create({ email, name, passwordHash: await hashPassword(password), role: "superadmin", active: true });
  return "created";
}

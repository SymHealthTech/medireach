import "server-only";
import { z, type ZodTypeAny } from "zod";
import { ForbiddenError, requireAdmin, type CurrentAdmin } from "@/lib/auth/admin";
import { ADMIN_ROLES, type AdminRole } from "@/lib/constants";

/**
 * Server-action wrapper for the dashboard. Every mutation goes through it:
 *   1. re-checks the caller's role against the database (never the client),
 *   2. validates input with zod,
 *   3. turns expected failures into a typed result the UI can show as a toast
 *      or inline field errors — nothing leaks a stack trace.
 * Audit logging is done inside each handler, where the diff is known.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Thrown inside handlers for user-facing failures ("Slug already taken"). */
export class ActionError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ActionError";
  }
}

export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function adminAction<S extends ZodTypeAny, T>(
  opts: { schema: S; roles?: readonly AdminRole[] },
  handler: (input: z.output<S>, admin: CurrentAdmin) => Promise<T>,
): (raw: z.input<S>) => Promise<ActionResult<T>> {
  return async (raw) => {
    try {
      const admin = await requireAdmin(opts.roles ?? ADMIN_ROLES);
      const parsed = opts.schema.safeParse(raw);
      if (!parsed.success) {
        const fieldErrors = fieldErrorsOf(parsed.error);
        return { ok: false, error: Object.values(fieldErrors)[0] ?? "Please check the form.", fieldErrors };
      }
      const data = await handler(parsed.data, admin);
      return { ok: true, data };
    } catch (err) {
      if (err instanceof ActionError) return { ok: false, error: err.message, fieldErrors: err.fieldErrors };
      if (err instanceof ForbiddenError) return { ok: false, error: err.message };
      if (err && typeof err === "object" && "code" in err && (err as { code: unknown }).code === 11000) {
        return { ok: false, error: "That value is already in use." };
      }
      console.error("[admin action]", err);
      return { ok: false, error: "Something went wrong. Please try again." };
    }
  };
}

/** Audit context for an admin (shape expected by lib/api/audit). */
export function auditCtx(admin: CurrentAdmin) {
  return { userId: admin.id, role: admin.role, name: admin.name } as const;
}

// Reusable field schemas -----------------------------------------------------

export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id.");
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : undefined));
export const requiredText = (max: number, label = "This field") =>
  z.string().trim().min(1, `${label} is required.`).max(max, `Use at most ${max} characters.`);
export const indianMobile = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s-]/g, "").replace(/^(\+?91)(?=\d{10}$)/, ""))
  .refine((s) => s === "" || /^[6-9]\d{9}$/.test(s), "Enter a 10-digit mobile number.")
  .transform((s) => (s ? s : undefined));
export const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((s) => s === "" || /^https?:\/\/\S+$/i.test(s), "Enter a full link starting with https://")
  .transform((s) => (s ? s : undefined));
export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .refine((s) => s === "" || z.string().email().safeParse(s).success, "Enter a valid email address.")
  .transform((s) => (s ? s : undefined));

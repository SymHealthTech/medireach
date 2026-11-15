"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { audit } from "@/lib/api/audit";
import { clientIpFrom, hitRateLimit } from "@/lib/api/rate-limit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { safeAdminNext } from "@/lib/auth/redirect";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";
import { Admin } from "@/models/Admin";

export interface LoginState {
  error?: string;
  email?: string;
}

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  password: z.string().min(1, "Enter your password.").max(200),
  next: z.string().optional(),
});

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 5; // spec: 5 tries / 15 min per IP
const MAX_PER_EMAIL = 10; // slows distributed guessing against one account

// Compared against when the email doesn't exist, so response time doesn't
// reveal which emails have accounts. A real bcrypt hash, made once per instance.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword(randomUUID()));

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details.", email };

  const ip = clientIpFrom(await headers());
  const [byIp, byEmail] = await Promise.all([
    hitRateLimit(`admin-login:ip:${ip}`, MAX_PER_IP, WINDOW_MS),
    hitRateLimit(`admin-login:email:${parsed.data.email}`, MAX_PER_EMAIL, WINDOW_MS),
  ]);
  if (!byIp.allowed || !byEmail.allowed) {
    const minutes = Math.ceil(Math.max(byIp.retryAfterSeconds, byEmail.retryAfterSeconds) / 60);
    return { error: `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, email };
  }

  await connectToDatabase();
  const admin = await Admin.findOne({ email: parsed.data.email, active: true });
  const ok = await verifyPassword(parsed.data.password, admin?.passwordHash ?? (await getDummyHash()));
  if (!admin || !ok) return { error: "Email or password is incorrect.", email };

  admin.lastLoginAt = new Date();
  await admin.save();
  await setSessionCookie({ sub: String(admin._id), role: admin.role, name: admin.name });
  await audit({ userId: String(admin._id), role: admin.role, name: admin.name }, "admin.login", {
    entity: "Admin",
    entityId: admin._id,
    diff: { ip },
  });

  redirect(safeAdminNext(parsed.data.next));
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/admin/login");
}

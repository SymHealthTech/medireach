/**
 * `npm run seed:admin` — create the first superadmin from ADMIN_EMAIL /
 * ADMIN_PASSWORD (and optional ADMIN_NAME). Safe to re-run: an existing
 * account is untouched unless you pass `--reset-password`.
 */
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { seedSuperadmin } from "@/lib/seed/admin";

async function main() {
  await connectToDatabase();
  const result = await seedSuperadmin(
    { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, name: process.env.ADMIN_NAME },
    { resetPassword: process.argv.includes("--reset-password") },
  );
  const messages = {
    created: "Created superadmin",
    exists: "Superadmin already exists (unchanged; pass --reset-password to change the password)",
    password_reset: "Password reset for",
  } as const;
  console.log(`${messages[result]}: ${process.env.ADMIN_EMAIL} in database "${env.mongoDbName()}".`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());

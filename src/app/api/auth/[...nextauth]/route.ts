import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/doctor-auth";

/** NextAuth endpoints for doctor magic-link login (callback, session, sign-out). */
type Ctx = { params: Promise<{ nextauth: string[] }> };

async function handler(req: Request, ctx: Ctx) {
  return NextAuth(req as never, { params: await ctx.params } as never, authOptions());
}

export { handler as GET, handler as POST };

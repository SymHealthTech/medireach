import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogoWordmark } from "@/components/brand/Logo";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentAdmin()) redirect("/admin");
  const { next } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <LogoWordmark className="text-[28px]" />
        </div>
        <div className="rounded-xl border border-line bg-surface p-6 shadow-soft sm:p-8">
          <h1 className="font-display text-2xl font-semibold text-ink">Log in to the dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">For the MediReach team.</p>
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}

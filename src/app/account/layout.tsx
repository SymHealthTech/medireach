import type { Metadata } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/account/LogoutButton";
import { LogoWordmark } from "@/components/brand/Logo";

export const metadata: Metadata = { title: { absolute: "My page – MediReach" }, robots: { index: false, follow: false } };

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="MediReach home">
            <LogoWordmark className="text-xl" />
          </Link>
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}

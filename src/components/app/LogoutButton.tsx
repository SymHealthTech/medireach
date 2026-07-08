"use client";

import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";
import { clearMeCache } from "@/lib/client/useMe";

/** Logout control (spec §12 / §5.2). Clears the session and returns to login. */
export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await apiPost("/api/auth/logout").catch(() => {});
    clearMeCache(); // don't let the next account inherit this identity in-tab
    router.push("/login");
  }
  return (
    <button
      onClick={logout}
      className="w-full rounded-xl border border-line px-4 py-3 text-left font-medium text-sos hover:bg-sos/10"
    >
      Log out
    </button>
  );
}

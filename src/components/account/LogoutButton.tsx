"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void signOut({ callbackUrl: "/login" });
      }}
      className="inline-flex min-h-11 items-center gap-2 rounded-[10px] px-3 text-sm font-medium text-ink hover:bg-sage disabled:opacity-60"
    >
      <LogOut className="size-4" strokeWidth={1.75} /> Log out
    </button>
  );
}

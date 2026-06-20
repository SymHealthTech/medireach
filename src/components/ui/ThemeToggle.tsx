"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Dark/light toggle (spec §2, §12 "Mode"). Persists to localStorage; the
 * pre-paint script in the root layout reads it to avoid a flash.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("mr-theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line text-ink hover:bg-line/40",
        className,
      )}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { Role, Tier } from "@/lib/constants";

export interface Me {
  userId: string;
  role: Role;
  doctorId: string | null;
  name: string;
  // Subscription tier for clinic roles (null for admin). `pro` unlocks voice/AI.
  tier: Tier | null;
}

// ── Cross-navigation cache ────────────────────────────────────────────────────
// Client-side navigation remounts every page, so the previous implementation
// re-fetched /api/me — and its `doctor.tier` DB read — on *every* route change.
// A module-level cache (shared by all mounts for the life of the page) fetches
// it once, so subsequent navigations resolve synchronously with no network trip
// and no loading flash. Cleared on logout so a different account can't inherit
// the previous identity within the same tab.
let cache: Me | null = null;
let inflight: Promise<Me | null> | null = null;

function fetchMe(): Promise<Me | null> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetch("/api/me")
    .then((r) => (r.ok ? r.json() : null))
    .then((data: Me | null) => {
      cache = data;
      return data;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Drop the cached identity (call on logout / account switch). */
export function clearMeCache(): void {
  cache = null;
  inflight = null;
}

/** Fetch the current signed-in identity for role-aware client rendering. */
export function useMe(): { me: Me | null; loading: boolean } {
  const [me, setMe] = useState<Me | null>(cache);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    if (cache) {
      setMe(cache);
      setLoading(false);
      return;
    }
    let active = true;
    fetchMe().then((data) => {
      if (!active) return;
      setMe(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { me, loading };
}

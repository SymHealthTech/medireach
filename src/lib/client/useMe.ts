"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/lib/constants";

export interface Me {
  userId: string;
  role: Role;
  doctorId: string | null;
  name: string;
}

/** Fetch the current signed-in identity for role-aware client rendering. */
export function useMe(): { me: Me | null; loading: boolean } {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => active && setMe(data))
      .catch(() => active && setMe(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { me, loading };
}

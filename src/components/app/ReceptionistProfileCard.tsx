"use client";

import { useEffect, useState } from "react";

interface Extra {
  username: string;
  clinicName: string;
}

interface Props {
  /** Name from the session — shown immediately without waiting for the API. */
  name: string;
  /** Compact layout for the desktop sidebar; full card for the mobile menu. */
  compact?: boolean;
}

/**
 * Receptionist identity card shown in the sidebar (desktop) and menu (mobile).
 * Name comes from the session prop so it renders instantly; username and clinic
 * name are fetched from the API and fill in once ready.
 */
export function ReceptionistProfileCard({ name, compact }: Props) {
  const [extra, setExtra] = useState<Extra | null>(null);

  useEffect(() => {
    fetch("/api/receptionist/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setExtra({ username: d.username, clinicName: d.clinicName }))
      .catch(() => {});
  }, []);

  if (compact) {
    return (
      <div className="rounded-xl border border-line bg-surface p-3 space-y-0.5">
        <p className="text-sm font-bold text-ink truncate">{name}</p>
        {extra?.username && (
          <p className="text-xs text-ink-muted truncate">@{extra.username}</p>
        )}
        {extra?.clinicName && (
          <p className="text-xs text-ink-muted truncate">{extra.clinicName}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface-raised p-5 shadow-sm space-y-1">
      <p className="text-base font-bold text-ink">{name}</p>
      <p className="text-sm text-ink-muted">
        @{extra?.username ?? "—"}
      </p>
      {extra?.clinicName && (
        <p className="text-sm text-ink-muted">{extra.clinicName}</p>
      )}
    </div>
  );
}

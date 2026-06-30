"use client";

interface Props {
  name: string;
  appId: string;
  clinicName: string;
}

export function DoctorProfileCard({ name, appId, clinicName }: Props) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3 space-y-0.5">
      <p className="text-sm font-bold text-ink truncate">{name}</p>
      {appId && (
        <p className="text-xs text-ink-muted truncate font-mono">{appId}</p>
      )}
      {clinicName && (
        <p className="text-xs text-ink-muted truncate">{clinicName}</p>
      )}
    </div>
  );
}

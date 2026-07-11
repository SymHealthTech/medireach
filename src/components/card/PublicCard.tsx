import type { PublicCardData } from "@/lib/visiting-card";
import { doctorDisplayName } from "@/lib/doctorName";

/**
 * The Digital Visiting Card, rendered exactly as a patient sees it. Deliberately
 * built from FIXED light colours (never the app's theme tokens) so it always
 * reads as a bright, trustworthy medical page on the public route — regardless
 * of the visitor's system dark-mode setting — and so the doctor's in-app preview
 * is a faithful, pixel-accurate view of the real thing.
 *
 * Pure presentational: no client JS, no server-only imports, so it can be
 * rendered inside both the public server page and the doctor's client-side
 * management screen. Every action is a plain anchor.
 */

/** Normalize an Indian mobile to a wa.me-compatible number (country code, digits only). */
function waNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

const WA_MESSAGE = "Hello Doctor, I'd like to book an appointment";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#0E7C7B]/10 px-3 py-1 text-sm font-medium text-[#0B6160]">
      {children}
    </span>
  );
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-[#0E7C7B]">{icon}</span>
      <div className="min-w-0 text-[15px] leading-relaxed text-slate-700">{children}</div>
    </div>
  );
}

export function PublicCard({ data }: { data: PublicCardData }) {
  const initials = data.name
    .replace(/^dr\.?\s*/i, "")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const displayName = doctorDisplayName(data.name);
  const wa = waNumber(data.whatsappNumber);

  return (
    <div className="mx-auto w-full max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(2,32,32,0.12)] ring-1 ring-black/5">
      {/* Cover / banner */}
      <div className="relative h-40 w-full sm:h-48">
        {data.coverPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.coverPhotoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#0E7C7B] via-[#12938F] to-[#0B6160]" />
        )}
        {/* Circular profile photo overlapping the banner */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-[#E6F2F1] shadow-md">
            {data.profilePhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.profilePhotoUrl}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-[#0E7C7B]">
                {initials || "DR"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Identity — name, degree, registration number, designation, then intro */}
      <div className="px-6 pt-16 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{displayName}</h1>
        {data.degree && <p className="mt-1 text-[15px] font-medium text-[#0E7C7B]">{data.degree}</p>}
        {data.registrationNumber && (
          <p className="mt-1 text-xs font-medium text-slate-400">
            Reg. No. {data.registrationNumber}
          </p>
        )}
        {data.designation && (
          <p className="mt-1.5 text-sm font-semibold text-slate-600">{data.designation}</p>
        )}
        {data.tagline && (
          <p className="mx-auto mt-3 max-w-[40ch] text-[15px] leading-relaxed text-slate-500">
            {data.tagline}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 grid grid-cols-1 gap-3 px-6 sm:grid-cols-2">
        {data.callNumber && (
          <a
            href={`tel:${data.callNumber}`}
            className="col-span-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#F2994A] px-5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-[#DA8A43] sm:col-span-2"
          >
            <IconPhone /> Call
          </a>
        )}
        {wa && (
          <a
            href={`https://wa.me/${wa}?text=${encodeURIComponent(WA_MESSAGE)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-[#1FB855]"
          >
            <IconWhatsApp /> WhatsApp
          </a>
        )}
        {data.mapsLink && (
          <a
            href={data.mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#0E7C7B] bg-white px-5 text-[15px] font-semibold text-[#0E7C7B] transition-colors hover:bg-[#0E7C7B]/5 ${
              wa ? "" : "sm:col-span-2"
            }`}
          >
            <IconPin /> Get Directions
          </a>
        )}
      </div>

      {/* Info */}
      <div className="mt-7 space-y-4 border-t border-slate-100 px-6 pt-6">
        {data.clinicName && (
          <InfoRow icon={<IconClinic />}>
            <p className="font-semibold text-slate-900">{data.clinicName}</p>
            {data.clinicAddress && <p className="text-slate-600">{data.clinicAddress}</p>}
          </InfoRow>
        )}
        {data.clinicTimings && (
          <InfoRow icon={<IconClock />}>
            <span>{data.clinicTimings}</span>
          </InfoRow>
        )}
        {data.languages.length > 0 && (
          <InfoRow icon={<IconGlobe />}>
            <span>{data.languages.join(", ")}</span>
          </InfoRow>
        )}
      </div>

      {/* Services */}
      {data.services.length > 0 && (
        <div className="mt-5 px-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Services
          </p>
          <div className="flex flex-wrap gap-2">
            {data.services.map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 border-t border-slate-100 px-6 py-5 text-center">
        <p className="text-xs font-medium text-slate-400">
          Powered by <span className="text-[#0E7C7B]">MediReach</span>
        </p>
      </div>
    </div>
  );
}

/* ── Inline icons (no dependency) ──────────────────────────────────────────── */
const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M6.6 10.8a15.5 15.5 0 006.6 6.6l2.2-2.2a1 1 0 011-.24 11.3 11.3 0 003.5.56 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.3 11.3 0 00.56 3.5 1 1 0 01-.24 1z"
        fill="currentColor"
      />
    </svg>
  );
}
function IconWhatsApp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm5.8 14.13c-.24.68-1.42 1.32-1.96 1.36-.5.04-.5.4-3.15-.66-2.66-1.06-4.3-3.76-4.42-3.93-.13-.17-1.05-1.4-1.05-2.67 0-1.27.67-1.9.9-2.16.24-.26.52-.32.7-.32l.5.01c.16 0 .38-.06.59.45.24.58.8 2 .87 2.14.07.14.12.31.02.5-.1.19-.14.31-.28.48l-.42.49c-.14.14-.28.29-.12.57.16.28.72 1.18 1.54 1.91 1.06.95 1.95 1.24 2.23 1.38.28.14.44.12.6-.07.17-.19.7-.81.88-1.09.18-.28.36-.23.6-.14.24.09 1.55.73 1.82.86.27.14.44.21.5.32.07.11.07.63-.17 1.31z" />
    </svg>
  );
}
function IconPin() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <path d="M12 21s-6-5.3-6-10a6 6 0 1112 0c0 4.7-6 10-6 10z" />
      <circle cx="12" cy="11" r="2.2" />
    </svg>
  );
}
function IconClinic() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <path d="M4 21V9l8-5 8 5v12" />
      <path d="M9 21v-5h6v5" />
      <path d="M12 8.5v3M10.5 10h3" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.5 2.5 14.5 0 17M12 3.5c-2.5 2.5-2.5 14.5 0 17" />
    </svg>
  );
}

import type { PublicDoctor } from "@/templates/types";

/** vCard 3.0 for "Save contact". Pure, so it can be tested. */

function esc(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

/** Fold lines longer than 75 octets (RFC 6350 §3.2). */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 74) parts.push(line.slice(i, i + 74));
  return parts.join("\r\n ");
}

export function doctorVcard(d: PublicDoctor): string {
  const clinic = d.clinics[0];
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(d.lastName)};${esc(d.firstName)};;${esc(d.title)};`,
    `FN:${esc(d.fullName)}`,
    d.primarySpecialty ? `TITLE:${esc(d.primarySpecialty.name)}` : null,
    clinic ? `ORG:${esc(clinic.name)}` : null,
    d.phone ? `TEL;TYPE=CELL,VOICE:+${d.phone}` : null,
    clinic?.phone && clinic.phone !== d.phone ? `TEL;TYPE=WORK,VOICE:+${clinic.phone}` : null,
    d.email ? `EMAIL;TYPE=INTERNET:${esc(d.email)}` : null,
    clinic
      ? `ADR;TYPE=WORK:;;${esc([clinic.addressLine1, clinic.addressLine2].filter(Boolean).join(", "))};${esc(
          `${clinic.area.name}, ${clinic.city.name}`,
        )};${esc(clinic.state)};${esc(clinic.pincode)};India`
      : null,
    `URL:${d.shareUrl}`,
    d.degreesLine ? `NOTE:${esc(d.degreesLine)}` : null,
    "END:VCARD",
  ].filter((l): l is string => Boolean(l));
  return lines.map(fold).join("\r\n") + "\r\n";
}

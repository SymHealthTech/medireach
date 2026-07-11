/**
 * Doctor names are stored WITHOUT the "Dr." prefix — the sign-up form shows a
 * fixed "Dr." adornment so doctors type only their name. Display sites add the
 * prefix for presentation. This helper does that idempotently: if a legacy name
 * already begins with "Dr"/"Dr." it is left as-is, so we never render "Dr. Dr.".
 */
export function doctorDisplayName(name?: string | null): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "";
  return /^dr\.?\s/i.test(trimmed) ? trimmed : `Dr. ${trimmed}`;
}

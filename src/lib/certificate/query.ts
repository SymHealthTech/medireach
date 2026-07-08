import type { FilterQuery } from "mongoose";
import type { CertificateDoc } from "@/models/Certificate";
import { CERTIFICATE_TYPES, type CertificateType } from "@/lib/certificate/types";

/**
 * Build the Mongo filter for the Certificate Records search (legal retrieval) —
 * the fields an authority query would use: patient name, certificate type, and
 * the issue-date range. Kept pure so it can be unit-tested without a database.
 * The doctor scope is applied separately by the scoped-query helpers; this only
 * assembles the search predicates.
 */
export interface CertificateListParams {
  /** Patient name substring (case-insensitive). */
  q?: string | null;
  /** Exact certificate type. */
  type?: string | null;
  /** Issue-date range, inclusive, as `yyyy-mm-dd`. */
  from?: string | null;
  to?: string | null;
}

/** Escape a user string for safe use inside a RegExp. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isCertType(v: string): v is CertificateType {
  return (CERTIFICATE_TYPES as readonly string[]).includes(v);
}

export function buildCertificateListFilter(params: CertificateListParams): FilterQuery<CertificateDoc> {
  const filter: FilterQuery<CertificateDoc> = {};

  const q = (params.q ?? "").trim();
  if (q) filter.patientName = { $regex: escapeRegex(q), $options: "i" };

  const type = (params.type ?? "").trim();
  if (type && isCertType(type)) filter.type = type;

  // Range on the certificate's issue date. `to` is made inclusive by extending
  // to the end of that day.
  const range: Record<string, Date> = {};
  const from = (params.from ?? "").trim();
  const to = (params.to ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) range.$gte = new Date(`${from}T00:00:00`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) range.$lte = new Date(`${to}T23:59:59.999`);
  if (Object.keys(range).length) filter.certificateDate = range;

  return filter;
}

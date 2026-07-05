import { TAX } from "@/lib/constants";

/**
 * Tax breakup for one invoice/total. With INCLUSIVE pricing the `total` is what
 * the doctor pays and never changes; `taxableValue` + `taxAmount` are derived
 * from it. Split is IGST (inter-state) or CGST+SGST (intra-state).
 */
export interface TaxBreakup {
  enabled: boolean;
  rate: number; // %
  sac: string;
  taxableValue: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  interState: boolean;
}

/** Round to 2 decimals (paise). */
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Inter-state supply → IGST; same-state → CGST+SGST. Defaults to inter-state
 * (IGST) when either the seller's or the clinic's state code is unknown, which
 * is the safe assumption for a nationwide customer base.
 */
export function isInterStateSupply(clinicStateCode: string | undefined | null): boolean {
  const seller = TAX.SELLER_STATE_CODE;
  if (!seller || !clinicStateCode) return true;
  return clinicStateCode !== seller;
}

/**
 * Back-compute GST from a tax-inclusive total. When tax is disabled (or rate 0)
 * the whole amount is the taxable value with zero tax, so callers can render the
 * result unconditionally. `interState` selects IGST vs CGST/SGST — defaults to
 * inter-state (most doctors are in a different state from the seller).
 */
export function computeInclusiveTax(
  total: number,
  opts: { interState?: boolean; enabled?: boolean; rate?: number } = {},
): TaxBreakup {
  const interState = opts.interState ?? true;
  const enabled = opts.enabled ?? TAX.ENABLED;
  const rate = opts.rate ?? TAX.RATE;
  const t = round2(total);

  if (!enabled || rate <= 0) {
    return {
      enabled: false,
      rate: 0,
      sac: TAX.SAC,
      taxableValue: t,
      taxAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: t,
      interState,
    };
  }

  const taxable = round2(t / (1 + rate / 100));
  const tax = round2(t - taxable);

  return {
    enabled: true,
    rate,
    sac: TAX.SAC,
    taxableValue: taxable,
    taxAmount: tax,
    cgst: interState ? 0 : round2(tax / 2),
    sgst: interState ? 0 : round2(tax / 2),
    igst: interState ? tax : 0,
    total: t,
    interState,
  };
}

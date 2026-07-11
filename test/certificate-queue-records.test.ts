import { describe, expect, it } from "vitest";
import { buildCertificateListFilter } from "@/lib/certificate/query";
import {
  RECORD,
  VISIT_MODES,
  DEFAULT_VISIT_MODE,
  BILLABLE_VISIT_MODES,
  isCertificatePurpose,
  isQuickServicePurpose,
  visitPurposeLabel,
} from "@/lib/constants";

/**
 * Part A/B pure logic: the Certificate Records search filter, the 3-year
 * retention constant, and the visit-mode enum. The billing exclusion and visit
 * completion are DB-query changes covered by the route logic, not unit-tested
 * here (they'd need a live mongod).
 */

describe("buildCertificateListFilter", () => {
  it("is empty when no params are given", () => {
    expect(buildCertificateListFilter({})).toEqual({});
  });

  it("builds a case-insensitive name regex and escapes regex metacharacters", () => {
    const f = buildCertificateListFilter({ q: "A.Rao (Sr)" });
    expect(f.patientName).toEqual({ $regex: "A\\.Rao \\(Sr\\)", $options: "i" });
  });

  it("accepts a valid certificate type and ignores an invalid one", () => {
    expect(buildCertificateListFilter({ type: "unfit" }).type).toBe("unfit");
    expect(buildCertificateListFilter({ type: "nonsense" }).type).toBeUndefined();
  });

  it("builds an inclusive issue-date range (to extends to end of day)", () => {
    const f = buildCertificateListFilter({ from: "2026-01-01", to: "2026-01-31" });
    const range = f.certificateDate as { $gte: Date; $lte: Date };
    expect(range.$gte.getTime()).toBe(new Date("2026-01-01T00:00:00").getTime());
    expect(range.$lte.getTime()).toBe(new Date("2026-01-31T23:59:59.999").getTime());
  });

  it("supports a one-sided range and ignores malformed dates", () => {
    expect((buildCertificateListFilter({ from: "2026-01-01" }).certificateDate as { $gte?: Date }).$gte).toBeInstanceOf(Date);
    expect(buildCertificateListFilter({ to: "not-a-date" }).certificateDate).toBeUndefined();
  });
});

describe("retention + visit-mode constants", () => {
  it("retains certificates for 3 years, longer than the 1-year visit purge", () => {
    expect(RECORD.CERTIFICATE_RETENTION_DAYS).toBe(365 * 3);
    expect(RECORD.CERTIFICATE_RETENTION_DAYS).toBeGreaterThan(RECORD.RETENTION_DAYS);
  });

  it("defines the certificate-only visit mode with consultation as default", () => {
    expect(VISIT_MODES).toContain("certificate_only");
    expect(VISIT_MODES).toContain("consultation");
    expect(DEFAULT_VISIT_MODE).toBe("consultation");
  });

  it("includes the expanded visit purposes", () => {
    for (const p of ["followup", "certificate", "nebulisation", "dressing", "bp_checkup", "outside_injection"]) {
      expect(VISIT_MODES).toContain(p);
    }
  });
});

describe("visit purpose helpers + billing", () => {
  it("bills only full consultations/follow-ups", () => {
    expect(BILLABLE_VISIT_MODES).toEqual(["consultation", "followup"]);
  });

  it("treats the legacy certificate_only value as a certificate", () => {
    expect(isCertificatePurpose("certificate")).toBe(true);
    expect(isCertificatePurpose("certificate_only")).toBe(true);
    expect(isCertificatePurpose("consultation")).toBe(false);
    expect(isCertificatePurpose(null)).toBe(false);
  });

  it("flags quick-service purposes but not full visits or legacy null", () => {
    for (const p of ["certificate", "certificate_only", "nebulisation", "dressing", "bp_checkup", "outside_injection"]) {
      expect(isQuickServicePurpose(p)).toBe(true);
    }
    expect(isQuickServicePurpose("consultation")).toBe(false);
    expect(isQuickServicePurpose("followup")).toBe(false);
    expect(isQuickServicePurpose(null)).toBe(false);
  });

  it("labels purposes for display, including the legacy alias and null", () => {
    expect(visitPurposeLabel("bp_checkup")).toBe("BP checkup");
    expect(visitPurposeLabel("certificate_only")).toBe("Certificate");
    expect(visitPurposeLabel(null)).toBe("Consultation");
  });
});

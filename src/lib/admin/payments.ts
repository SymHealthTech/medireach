import "server-only";
import { Types, type FilterQuery } from "mongoose";
import { isObjectId, oneOf, param, type SearchParams } from "@/lib/admin/list";
import { PAYMENT_MODES, PAYMENT_PURPOSES } from "@/lib/constants";
import type { PaymentDoc } from "@/models/Payment";

/** Payment list filter from search params (shared by the page and CSV export). */
export function paymentFilter(sp: SearchParams): { filter: FilterQuery<PaymentDoc>; month?: string } {
  const filter: FilterQuery<PaymentDoc> = {};
  const mode = oneOf(param(sp, "mode"), PAYMENT_MODES);
  if (mode) filter.mode = mode;
  const purpose = oneOf(param(sp, "purpose"), PAYMENT_PURPOSES);
  if (purpose) filter.purpose = purpose;
  const doctor = param(sp, "doctor");
  // ObjectIds (not strings): this filter is also used in aggregations, which don't cast.
  if (isObjectId(doctor)) filter.doctorId = new Types.ObjectId(doctor);
  const hospital = param(sp, "hospital");
  if (isObjectId(hospital)) filter.hospitalId = new Types.ObjectId(hospital);
  const month = param(sp, "month");
  if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    const from = new Date(Date.UTC(y!, m! - 1, 1) - 5.5 * 3600_000);
    const to = new Date(Date.UTC(y!, m!, 1) - 5.5 * 3600_000);
    filter.date = { $gte: from, $lt: to };
    return { filter, month };
  }
  return { filter };
}

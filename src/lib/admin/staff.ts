import "server-only";
import { STAFF_ID_PREFIX } from "@/lib/constants";
import { Counter } from "@/models/Counter";

/** Next sales executive login ID: MRS-1001, MRS-1002… (never reused). */
export async function nextStaffId(): Promise<string> {
  const c = await Counter.findOneAndUpdate({ _id: "staff:sales" }, { $inc: { seq: 1 } }, { new: true, upsert: true }).lean();
  return `${STAFF_ID_PREFIX}-${1000 + c!.seq}`;
}

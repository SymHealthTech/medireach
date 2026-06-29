import { Types } from "mongoose";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { requireDoctorId } from "@/lib/api/context";
import { Expense, EXPENSE_CATEGORIES } from "@/models/Expense";

const IST_MS = 5.5 * 60 * 60 * 1000;

function dateToISTMonth(date: Date): string {
  const ist = new Date(date.getTime() + IST_MS);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const PUT = route(
  { roles: Roles.doctorOnly },
  async (req, ctx, params: { id: string }) => {
    const doctorId = requireDoctorId(ctx);
    const body = (await req.json()) as Record<string, unknown>;

    const expense = await Expense.findOne({
      _id: new Types.ObjectId(params.id),
      doctorId: new Types.ObjectId(doctorId),
    });
    if (!expense) throw Errors.notFound("Expense not found.");

    const { category, billNumber, date, vendorName, description, totalAmount, paidAmount, isNA } = body;

    if (category !== undefined) {
      if (!EXPENSE_CATEGORIES.includes(category as never)) throw Errors.badRequest("Invalid category.");
      expense.category = category as (typeof EXPENSE_CATEGORIES)[number];
    }
    if (billNumber !== undefined) expense.billNumber = String(billNumber);
    if (date !== undefined) {
      const d = new Date(date as string);
      if (isNaN(d.getTime())) throw Errors.badRequest("Invalid date.");
      expense.date = d;
      expense.month = dateToISTMonth(d);
    }
    if (vendorName !== undefined) expense.vendorName = String(vendorName).trim();
    if (description !== undefined) expense.description = String(description);
    if (typeof totalAmount === "number") expense.totalAmount = totalAmount;
    if (typeof paidAmount === "number") expense.paidAmount = paidAmount;
    if (isNA !== undefined) expense.isNA = !!isNA;

    await expense.save();
    return jsonOk({ ok: true });
  },
);

export const DELETE = route(
  { roles: Roles.doctorOnly },
  async (_req, ctx, params: { id: string }) => {
    const doctorId = requireDoctorId(ctx);
    const result = await Expense.deleteOne({
      _id: new Types.ObjectId(params.id),
      doctorId: new Types.ObjectId(doctorId),
    });
    if (result.deletedCount === 0) throw Errors.notFound("Expense not found.");
    return jsonOk({ ok: true });
  },
);

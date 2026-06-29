import { Types } from "mongoose";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { requireDoctorId } from "@/lib/api/context";
import {
  Expense,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
} from "@/models/Expense";

const IST_MS = 5.5 * 60 * 60 * 1000;
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function dateToISTMonth(date: Date): string {
  const ist = new Date(date.getTime() + IST_MS);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym: string): string {
  const [year, month] = ym.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export const GET = route({ roles: Roles.doctorOnly }, async (_req, ctx) => {
  const doctorId = requireDoctorId(ctx);

  const expenses = await Expense.find({ doctorId: new Types.ObjectId(doctorId) })
    .sort({ date: -1 })
    .lean();

  const monthMap = new Map<string, {
    month: string;
    label: string;
    total: number;
    expenses: unknown[];
  }>();

  for (const e of expenses) {
    const ym = e.month;
    if (!monthMap.has(ym)) {
      monthMap.set(ym, { month: ym, label: monthLabel(ym), total: 0, expenses: [] });
    }
    const g = monthMap.get(ym)!;
    if (!e.isNA) g.total += e.totalAmount;
    g.expenses.push({
      _id: e._id.toString(),
      category: e.category,
      categoryLabel: EXPENSE_CATEGORY_LABELS[e.category],
      billNumber: e.billNumber,
      date: e.date.toISOString(),
      vendorName: e.vendorName,
      description: e.description,
      totalAmount: e.totalAmount,
      paidAmount: e.paidAmount,
      balance: e.isNA ? 0 : Math.max(0, e.totalAmount - e.paidAmount),
      isNA: e.isNA,
    });
  }

  const months = Array.from(monthMap.values()).sort((a, b) =>
    b.month.localeCompare(a.month),
  );
  return jsonOk({ months });
});

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const doctorId = requireDoctorId(ctx);
  const body = (await req.json()) as Record<string, unknown>;

  const { category, billNumber, date, vendorName, description, totalAmount, paidAmount, isNA } = body;

  if (!EXPENSE_CATEGORIES.includes(category as never)) throw Errors.badRequest("Invalid category.");
  if (!date) throw Errors.badRequest("Date is required.");
  if (!String(vendorName ?? "").trim()) throw Errors.badRequest("Vendor name is required.");
  if (typeof totalAmount !== "number" || totalAmount < 0) throw Errors.badRequest("Invalid total amount.");
  const paid = typeof paidAmount === "number" ? paidAmount : 0;

  const expDate = new Date(date as string);
  if (isNaN(expDate.getTime())) throw Errors.badRequest("Invalid date.");

  const expense = await Expense.create({
    doctorId: new Types.ObjectId(doctorId),
    category,
    billNumber: String(billNumber ?? ""),
    date: expDate,
    vendorName: String(vendorName).trim(),
    description: String(description ?? ""),
    totalAmount,
    paidAmount: paid,
    isNA: !!isNA,
    month: dateToISTMonth(expDate),
  });

  return jsonOk({ _id: expense._id.toString() }, 201);
});

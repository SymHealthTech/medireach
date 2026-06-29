import mongoose, { Schema, type Model, type Types } from "mongoose";

export const EXPENSE_CATEGORIES = [
  "rent",
  "electricity",
  "medicine",
  "salary",
  "equipment",
  "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: "Monthly Rent",
  electricity: "Light / Electricity",
  medicine: "Medicine Purchase",
  salary: "Staff Salary",
  equipment: "Equipment",
  other: "Other",
};

export interface ExpenseDoc {
  _id: Types.ObjectId;
  doctorId: Types.ObjectId;
  category: ExpenseCategory;
  billNumber: string;
  date: Date;
  vendorName: string;
  description: string;
  totalAmount: number;
  paidAmount: number;
  isNA: boolean; // e.g. rent when own clinic
  month: string; // "YYYY-MM" — set on write, used for fast grouping
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<ExpenseDoc>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    billNumber: { type: String, default: "" },
    date: { type: Date, required: true },
    vendorName: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0, default: 0 },
    isNA: { type: Boolean, default: false },
    month: { type: String, required: true },
  },
  { timestamps: true },
);

expenseSchema.index({ doctorId: 1, month: -1 });

export const Expense: Model<ExpenseDoc> =
  (mongoose.models.Expense as Model<ExpenseDoc>) ||
  mongoose.model<ExpenseDoc>("Expense", expenseSchema);

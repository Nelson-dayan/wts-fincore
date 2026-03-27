import { model, models } from "mongoose";
import { expenseSchema } from "@/lib/db/schemas/expense.schema";

export const ExpenseModel = models.Expense ?? model("Expense", expenseSchema);

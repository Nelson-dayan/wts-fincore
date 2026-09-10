import { AccountingPeriodModel } from "@/lib/db/models";

/**
 * Asserts that a business/financial date is not locked within any closed
 * accounting period. Throws a validation error if the date falls inside a locked period.
 */
export async function assertPeriodNotLocked(date: Date | string | number): Promise<void> {
  const targetDate = new Date(date);
  if (isNaN(targetDate.getTime())) return;

  const closedPeriod = await AccountingPeriodModel.findOne({
    startDate: { $lte: targetDate },
    endDate: { $gte: targetDate },
    isClosed: true,
  }).lean();

  if (closedPeriod) {
    throw new Error(
      `The business date falls inside the closed accounting period "${closedPeriod.name}". Modifications to this period are locked.`
    );
  }
}

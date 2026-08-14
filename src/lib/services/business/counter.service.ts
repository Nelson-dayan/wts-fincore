import mongoose from "mongoose";
import { CounterModel, SequenceReservationModel } from "@/lib/db/models";

/**
 * Allocates the next atomic, collision-free sequential number for a specific
 * key scoped by fiscal year, logging a sequence reservation audit trail record.
 */
export async function getNextFiscalSequence(
  key: string,
  fiscalYear: string,
  entityType: "Invoice" | "Quotation" | "PurchaseOrder",
  userId: string,
  entityId?: string,
  companyCode?: string
): Promise<number> {
  const scopedKey = companyCode && companyCode.trim().length > 0
    ? `${key}_${companyCode.toUpperCase().replace(/[^A-Z0-9]/g, "")}`
    : key;

  // Perform thread-safe Mongoose atomic findOneAndUpdate with $inc
  const counter = await CounterModel.findOneAndUpdate(
    { key: scopedKey, fiscalYear },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  ).lean();

  const reservedValue = counter.sequenceValue;

  // Persist sequence reservation log for operational tracking
  await SequenceReservationModel.create({
    key: scopedKey,
    fiscalYear,
    value: reservedValue,
    entityType,
    entityId: entityId ? new mongoose.Types.ObjectId(entityId) : undefined,
    reservedBy: new mongoose.Types.ObjectId(userId),
  });

  return reservedValue;
}
export async function updateSequenceReservationEntity(
  key: string,
  fiscalYear: string,
  value: number,
  entityId: string
): Promise<void> {
  await SequenceReservationModel.updateOne(
    { key, fiscalYear, value },
    { $set: { entityId: new mongoose.Types.ObjectId(entityId) } }
  );
}

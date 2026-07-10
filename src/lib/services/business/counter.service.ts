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
  entityId?: string
): Promise<number> {
  // Perform thread-safe Mongoose atomic findOneAndUpdate with $inc
  const counter = await CounterModel.findOneAndUpdate(
    { key, fiscalYear },
    { $inc: { sequenceValue: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  const reservedValue = counter.sequenceValue;

  // Persist sequence reservation log for operational tracking
  await SequenceReservationModel.create({
    key,
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

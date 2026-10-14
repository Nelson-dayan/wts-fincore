import type { ClientSession, Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { TransferModel, AccountModel } from "@/lib/db/models";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { STATIC_FX_RATES } from "@/lib/services/finance/forex.engine";
import { decimalToNumber } from "@/lib/services/business/money";
import * as accountEngine from "./account.engine";

export interface CreateTransferInput {
  fromAccountId: string | Types.ObjectId;
  toAccountId: string | Types.ObjectId;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  fees?: number;
  reference?: string;
  note?: string;
  rateSource?: "LIVE_API" | "FALLBACK_STATIC" | "MANUAL_OVERRIDE";
  overrideReason?: string;
  createdBy: string | Types.ObjectId;
}

/**
 * Returns currency minor units / decimals.
 * Standard currencies (USD, AED, INR, AUD, SGD, RM) use 2.
 * High-precision currencies (BHD, KWD, OMR) use 3. Zero-decimal (JPY) use 0.
 */
export function getCurrencyDecimals(currency: string): number {
  const upper = String(currency || "").toUpperCase();
  if (["JPY", "KRW", "VND", "CLP"].includes(upper)) return 0;
  if (["BHD", "KWD", "OMR", "JOD"].includes(upper)) return 3;
  return 2;
}

/**
 * Records a new bank-to-bank transfer atomically.
 * Enforces exchange-rate deviation tiers:
 * - Tier 1 (<= 10% deviation): Auto-completed immediately.
 * - Tier 2 (> 10% and <= 25% deviation): Allowed immediately, but requires documented overrideReason.
 * - Tier 3 (> 25% deviation): Queued as PENDING_APPROVAL. Server-side zero balance mutation invariant.
 * - Tier 4 (< 20% or > 500% of benchmark): Hard rejection.
 */
export async function recordTransfer(input: CreateTransferInput) {
  const fromAmount = Number(input.fromAmount);
  const toAmount = Number(input.toAmount);
  const exchangeRate = Number(input.exchangeRate);
  const fees = input.fees !== undefined && input.fees !== null ? Number(input.fees) : 0;

  // Finding #01: Validate strictly positive transfer amounts and non-negative fees
  if (!Number.isFinite(fromAmount) || fromAmount <= 0) {
    throw new Error("Source transfer amount (fromAmount) must be greater than zero");
  }
  if (!Number.isFinite(toAmount) || toAmount <= 0) {
    throw new Error("Destination transfer amount (toAmount) must be greater than zero");
  }
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error("Exchange rate must be greater than zero");
  }
  if (!Number.isFinite(fees) || fees < 0) {
    throw new Error("Transfer fees cannot be negative");
  }

  // Sanity upper-bound guard
  if (fromAmount > 1e12 || toAmount > 1e12 || fees > 1e12) {
    throw new Error("Transfer amounts exceed maximum allowable system bounds");
  }

  const db = await connectDB();
  const session = await db.startSession();
  try {
    let result: any = {};
    await session.withTransaction(async () => {
      // 1. Fetch Accounts
      const fromAccount = await AccountModel.findById(input.fromAccountId).session(session);
      const toAccount = await AccountModel.findById(input.toAccountId).session(session);
      
      if (!fromAccount) throw new Error("Source account not found");
      if (!toAccount) throw new Error("Destination account not found");
      if (!fromAccount.isActive) throw new Error(`Source account "${fromAccount.name}" is inactive`);
      if (!toAccount.isActive) throw new Error(`Destination account "${toAccount.name}" is inactive`);

      if (String(fromAccount._id) === String(toAccount._id)) {
        throw new Error("Source and destination accounts must be different");
      }

      const fromCurrency = String(fromAccount.currency || "").toUpperCase();
      const toCurrency = String(toAccount.currency || "").toUpperCase();

      let benchmarkRate: number | undefined;
      let rateDeviationPercent = 0;
      let rateSource = input.rateSource || "MANUAL_OVERRIDE";

      // Finding #02: Currency Direction & Same-Currency Rule
      // If accounts are in the same currency, rate MUST be 1.0 and amounts MUST be identical
      if (fromCurrency === toCurrency) {
        benchmarkRate = 1.0;
        rateDeviationPercent = 0;
        rateSource = "FALLBACK_STATIC";

        if (Math.abs(exchangeRate - 1.0) > 0.0001) {
          throw new Error(`Same-currency transfers (${fromCurrency} -> ${toCurrency}) must have an exchange rate of 1.0`);
        }
        if (Math.abs(toAmount - fromAmount) > 0.01) {
          throw new Error(`Same-currency transfers (${fromCurrency} -> ${toCurrency}) must have identical source and destination amounts`);
        }
      } else {
        // Cross-currency transfer: check absolute exchange rate sanity thresholds
        if (exchangeRate < 0.0001 || exchangeRate > 10000) {
          throw new Error("Exchange rate is outside allowable system thresholds (0.0001 - 10000)");
        }

        // Validate against benchmark rate corridor if available in STATIC_FX_RATES
        const fromBenchmark = STATIC_FX_RATES[fromCurrency];
        const toBenchmark = STATIC_FX_RATES[toCurrency];

        if (fromBenchmark && toBenchmark) {
          benchmarkRate = fromBenchmark / toBenchmark;
          rateDeviationPercent = Math.abs((exchangeRate - benchmarkRate) / benchmarkRate) * 100;

          if (Math.abs(exchangeRate - benchmarkRate) / benchmarkRate < 0.0001) {
            rateSource = input.rateSource || "FALLBACK_STATIC";
          } else {
            rateSource = "MANUAL_OVERRIDE";
          }

          // Tier 4: Hard limit corridor (< 20% or > 500% of benchmark)
          if (exchangeRate < benchmarkRate * 0.2 || exchangeRate > benchmarkRate * 5.0) {
            throw new Error(
              `Exchange rate ${exchangeRate} deviates excessively from market benchmark (~${benchmarkRate.toFixed(4)}). Hard limit exceeded.`
            );
          }

          // Tier 2: Material deviation (> 10% and <= 25%) requires documented overrideReason
          if (rateDeviationPercent > 10 && (!input.overrideReason || input.overrideReason.trim().length < 5)) {
            throw new Error(
              `Exchange rate deviates by ${rateDeviationPercent.toFixed(1)}% from benchmark (${benchmarkRate.toFixed(4)}). A documented override reason (minimum 5 characters) is required.`
            );
          }
        } else {
          // Unlisted currency pair benchmark: require documented justification
          if (!input.overrideReason || input.overrideReason.trim().length < 5) {
            throw new Error(
              `No market benchmark rate available for ${fromCurrency} -> ${toCurrency}. A documented override reason (minimum 5 characters) is required.`
            );
          }
        }
      }

      // Currency-specific destination precision check
      const destDecimals = getCurrencyDecimals(toCurrency);
      const factor = Math.pow(10, destDecimals);
      const expectedToAmount = Math.round((fromAmount * exchangeRate + Number.EPSILON) * factor) / factor;
      const tolerance = 1 / factor; // e.g. 0.01 for 2-decimal currencies

      if (Math.abs(toAmount - expectedToAmount) > tolerance) {
        throw new Error(
          `Destination amount (${toAmount} ${toCurrency}) does not match exchange rate calculation (expected ${expectedToAmount.toFixed(destDecimals)} ${toCurrency})`
        );
      }

      // Tier 3 Approval Rule: Deviation > 25% requires dual-control approval
      const requiresApproval = rateDeviationPercent > 25;
      const initialStatus = requiresApproval ? "PENDING_APPROVAL" : "COMPLETED";

      // 2. Create Transfer Record with complete audit trail fields
      const transfer = await TransferModel.create(
        [
          {
            fromAccountId: input.fromAccountId,
            toAccountId: input.toAccountId,
            fromAmount,
            fromCurrency: fromAccount.currency,
            toAmount,
            toCurrency: toAccount.currency,
            exchangeRate,
            rateSource,
            benchmarkRate,
            rateDeviationPercent: Math.round(rateDeviationPercent * 100) / 100,
            overrideReason: input.overrideReason || "",
            fees,
            reference: input.reference || "",
            note: input.note || "",
            status: initialStatus,
            createdBy: input.createdBy,
          },
        ],
        { session }
      );

      const transferDoc = transfer[0];
      const transferId = transferDoc._id;

      if (requiresApproval) {
        // SERVER-SIDE INVARIANT: Unapproved transfers NEVER change balances or create ledger entries
        await logActivity({
          userId: String(input.createdBy),
          action: "TRANSFER_CREATED",
          entityType: "Transfer",
          entityId: String(transferId),
          message: `Transfer queued for approval: ${fromAmount} ${fromAccount.currency} -> ${toAccount.name} (${toAmount} ${toAccount.currency}), rate deviation ${rateDeviationPercent.toFixed(1)}%`,
          metadata: {
            transferId: String(transferId),
            fromAccountId: String(input.fromAccountId),
            toAccountId: String(input.toAccountId),
            rateSource,
            benchmarkRate,
            rateDeviationPercent: Math.round(rateDeviationPercent * 100) / 100,
            overrideReason: input.overrideReason || "",
            status: "PENDING_APPROVAL",
          },
        });

        result = {
          transferId: String(transferId),
          status: "PENDING_APPROVAL",
          requiresApproval: true,
          rateDeviationPercent: Math.round(rateDeviationPercent * 100) / 100,
          message: `Transfer created with status PENDING_APPROVAL due to rate deviation (${rateDeviationPercent.toFixed(1)}% > 25%). No account balances were modified.`,
        };
      } else {
        // 3. Withdraw from Source Account
        await accountEngine.withdraw(
          input.fromAccountId,
          fromAmount,
          undefined,
          input.createdBy,
          session,
          `Transfer to ${toAccount.name}: ${input.reference || transferId}`,
          transferId
        );

        // 4. Deposit to Destination Account
        await accountEngine.deposit(
          input.toAccountId,
          toAmount,
          undefined,
          input.createdBy,
          session,
          `Transfer from ${fromAccount.name}: ${input.reference || transferId}`,
          transferId
        );

        // 5. Log Activity with full audit fields
        await logActivity({
          userId: String(input.createdBy),
          action: "TRANSFER_CREATED",
          entityType: "Transfer",
          entityId: String(transferId),
          message: `Transferred ${input.fromAmount} ${fromAccount.currency} to ${toAccount.name} (${input.toAmount} ${toAccount.currency})`,
          metadata: {
            transferId: String(transferId),
            fromAccountId: String(input.fromAccountId),
            toAccountId: String(input.toAccountId),
            rateSource,
            benchmarkRate,
            rateDeviationPercent: Math.round(rateDeviationPercent * 100) / 100,
            overrideReason: input.overrideReason || "",
            status: "COMPLETED",
          },
        });

        result = {
          transferId: String(transferId),
          status: "COMPLETED",
          success: true,
        };
      }
    });

    return result;
  } finally {
    await session.endSession();
  }
}

/**
 * Approves a pending transfer.
 * Enforces dual-control / Maker-Checker rule: the approver cannot be the transfer creator.
 * Mutates account balances and creates ledger entries atomically.
 */
export async function approveTransfer({
  transferId,
  approverId,
}: {
  transferId: string | Types.ObjectId;
  approverId: string | Types.ObjectId;
}) {
  const db = await connectDB();
  const session = await db.startSession();
  try {
    let result: any = {};
    await session.withTransaction(async () => {
      const transfer = await TransferModel.findById(transferId).session(session);
      if (!transfer) {
        throw new Error("Transfer not found");
      }
      if (transfer.status !== "PENDING_APPROVAL") {
        throw new Error(`Transfer is in status "${transfer.status}", only PENDING_APPROVAL transfers can be approved`);
      }

      // Maker-Checker constraint: creator cannot self-approve
      if (String(transfer.createdBy) === String(approverId)) {
        throw new Error("Maker-checker violation: Transfer creator cannot approve their own transfer");
      }

      const fromAccount = await AccountModel.findById(transfer.fromAccountId).session(session);
      const toAccount = await AccountModel.findById(transfer.toAccountId).session(session);
      if (!fromAccount || !toAccount) {
        throw new Error("Source or destination account no longer exists");
      }
      if (!fromAccount.isActive || !toAccount.isActive) {
        throw new Error("Source or destination account is inactive");
      }

      const fromAmount = decimalToNumber(transfer.fromAmount);
      const toAmount = decimalToNumber(transfer.toAmount);

      // Execute atomic debit and credit
      await accountEngine.withdraw(
        transfer.fromAccountId,
        fromAmount,
        undefined,
        approverId,
        session,
        `Approved Transfer to ${toAccount.name}: ${transfer.reference || transfer._id}`,
        transfer._id
      );

      await accountEngine.deposit(
        transfer.toAccountId,
        toAmount,
        undefined,
        approverId,
        session,
        `Approved Transfer from ${fromAccount.name}: ${transfer.reference || transfer._id}`,
        transfer._id
      );

      transfer.status = "COMPLETED";
      transfer.approvedBy = approverId as any;
      transfer.approvedAt = new Date();
      await transfer.save({ session });

      await logActivity({
        userId: String(approverId),
        action: "TRANSFER_APPROVED",
        entityType: "Transfer",
        entityId: String(transfer._id),
        message: `Approved transfer ${transfer._id} of ${fromAmount} ${fromAccount.currency} to ${toAccount.name} (${toAmount} ${toAccount.currency})`,
        metadata: {
          transferId: String(transfer._id),
          fromAccountId: String(transfer.fromAccountId),
          toAccountId: String(transfer.toAccountId),
          approvedBy: String(approverId),
          rateDeviationPercent: transfer.rateDeviationPercent,
        },
      });

      result = {
        transferId: String(transfer._id),
        status: "COMPLETED",
        success: true,
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

/**
 * Rejects a pending transfer.
 * Does not alter any balances or ledger entries.
 */
export async function rejectTransfer({
  transferId,
  rejecterId,
  reason,
}: {
  transferId: string | Types.ObjectId;
  rejecterId: string | Types.ObjectId;
  reason?: string;
}) {
  const db = await connectDB();
  const session = await db.startSession();
  try {
    let result: any = {};
    await session.withTransaction(async () => {
      const transfer = await TransferModel.findById(transferId).session(session);
      if (!transfer) {
        throw new Error("Transfer not found");
      }
      if (transfer.status !== "PENDING_APPROVAL") {
        throw new Error(`Transfer is in status "${transfer.status}", only PENDING_APPROVAL transfers can be rejected`);
      }

      transfer.status = "REJECTED";
      if (reason) {
        transfer.note = transfer.note ? `${transfer.note} | Rejected: ${reason}` : `Rejected: ${reason}`;
      }
      await transfer.save({ session });

      await logActivity({
        userId: String(rejecterId),
        action: "TRANSFER_REJECTED",
        entityType: "Transfer",
        entityId: String(transfer._id),
        message: `Rejected transfer ${transfer._id}: ${reason || "No reason specified"}`,
        metadata: {
          transferId: String(transfer._id),
          rejecterId: String(rejecterId),
          reason: reason || "",
        },
      });

      result = {
        transferId: String(transfer._id),
        status: "REJECTED",
        success: true,
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

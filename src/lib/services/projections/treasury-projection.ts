import { AccountModel, InvoiceModel, ClientModel, PaymentModel, PaymentAllocationModel } from "../../db/models";
import { normalizeToBase } from "../finance/forex.engine";
import { roundMoney } from "../finance/money";

export interface TreasuryDashboardProjection {
  totalAssetsBase: number;
  totalReceivablesBase: number;
  totalUnallocatedPaymentsBase: number;
  unsettledInvoicesCount: number;
  reconciliationScore: number;
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    currency: string;
    balanceNative: number;
    balanceBase: number;
    isPrimary: boolean;
  }>;
  recentPayments: Array<{
    id: string;
    clientName: string;
    projectName: string;
    amountNative: number;
    currency: string;
    amountBase: number;
    receivedAt: Date;
    referenceNumber?: string;
  }>;
  contractVersion: string;
  generatedAt: string;
}

export async function getTreasuryDashboardProjection(companyId: string): Promise<TreasuryDashboardProjection> {
  // 1. Fetch active bank/gateway/cash accounts
  const accountsData = await AccountModel.find({ companyId, isActive: true });
  
  let totalAssetsBase = 0;
  const accounts = accountsData.map(acc => {
    const balanceNative = Number(acc.currentBalance || 0);
    const balanceBase = normalizeToBase({ amount: balanceNative, currency: acc.currency }).amount;
    totalAssetsBase += balanceBase;
    
    return {
      id: String(acc._id),
      name: acc.name,
      type: acc.type,
      currency: acc.currency,
      balanceNative: roundMoney(balanceNative),
      balanceBase: roundMoney(balanceBase),
      isPrimary: !!acc.isPrimary
    };
  });

  // 2. Fetch all unsettled invoices
  const unsettledInvoices = await InvoiceModel.find({
    companyId,
    status: { $in: ["SENT", "PARTIAL", "OVERDUE"] },
    isDeleted: { $ne: true }
  });

  let totalReceivablesBase = 0;
  unsettledInvoices.forEach(inv => {
    const totalIntended = inv.totalsCache?.totalIntendedBase ? Number(inv.totalsCache.totalIntendedBase) : 0;
    const totalReceived = inv.totalsCache?.totalReceivedBase ? Number(inv.totalsCache.totalReceivedBase) : 0;
    const remaining = Math.max(0, totalIntended - totalReceived);
    totalReceivablesBase += remaining;
  });

  // 3. Fetch all payments that are not fully allocated
  const payments = await PaymentModel.find({
    companyId,
    isDeleted: { $ne: true }
  }).populate("clientId projectId");

  let totalUnallocatedPaymentsBase = 0;
  
  for (const pay of payments) {
    const allocations = await PaymentAllocationModel.find({ paymentId: pay._id });
    const allocatedSumBase = allocations.reduce((sum, alloc) => sum + Number(alloc.allocatedAmountBase || 0), 0);
    const payBase = Number(pay.amountBase || 0);
    if (payBase > allocatedSumBase + 0.015) {
      totalUnallocatedPaymentsBase += (payBase - allocatedSumBase);
    }
  }

  // 4. Resolve recent payments
  const recentPayments = payments
    .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())
    .slice(0, 5)
    .map(pay => {
      const clientName = (pay as any).clientId?.name || "Unknown Client";
      const projectName = (pay as any).projectId?.name || "Unknown Project";
      
      return {
        id: String(pay._id),
        clientName,
        projectName,
        amountNative: roundMoney(Number(pay.amount || 0)),
        currency: pay.currency,
        amountBase: roundMoney(Number(pay.amountBase || 0)),
        receivedAt: pay.receivedAt,
        referenceNumber: pay.referenceNumber
      };
    });

  // 5. Calculate Reconciliation Score
  let reconciliationScore = 100;
  if (totalAssetsBase > 0) {
    reconciliationScore = Math.max(0, roundMoney(100 - (totalUnallocatedPaymentsBase / totalAssetsBase) * 100));
  }

  return {
    totalAssetsBase: roundMoney(totalAssetsBase),
    totalReceivablesBase: roundMoney(totalReceivablesBase),
    totalUnallocatedPaymentsBase: roundMoney(totalUnallocatedPaymentsBase),
    unsettledInvoicesCount: unsettledInvoices.length,
    reconciliationScore,
    accounts,
    recentPayments,
    contractVersion: "v1",
    generatedAt: new Date().toISOString()
  };
}

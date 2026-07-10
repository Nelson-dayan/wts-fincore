import test from "node:test";
import assert from "node:assert/strict";
import { 
  getPaymentSummary, 
  getInvoiceSummary, 
  PaymentInput, 
  AllocationInput 
} from "./finance-calculations";

test("Finance Engine - getPaymentSummary (Standard Payment)", () => {
  const p: PaymentInput = {
    type: "PAYMENT",
    exchangeRate: 85,
    intendedAmount: 200, // $200
    receivedAmount: 188, // $188
    fees: [{ amount: 12 }] // $12 fees
  };

  const sum = getPaymentSummary(p);
  
  // Base values check
  assert.equal(sum.intendedBase, 200 * 85); // 17000
  assert.equal(sum.receivedBase, 188 * 85); // 15980
  assert.equal(sum.totalFeesBase, 12 * 85); // 1020
});

test("Finance Engine - getPaymentSummary (Refund Payment)", () => {
  const p: PaymentInput = {
    type: "REFUND",
    exchangeRate: 85,
    intendedAmount: 100, // Refunding $100
    receivedAmount: 100, // Client got $100 back
    fees: [{ amount: 0 }] 
  };

  const sum = getPaymentSummary(p);
  
  // Refund amounts must logically act as negative deductions
  assert.equal(sum.intendedBase, -8500);
  assert.equal(sum.receivedBase, -8500);
  assert.equal(sum.totalFeesBase, 0);
});

test("Finance Engine - getInvoiceSummary", () => {
  const allocations: AllocationInput[] = [{
    amount: 200,
    amountBase: 17000
  }];

  const summary = getInvoiceSummary(allocations, 1000);

  assert.equal(summary.totalAllocated, 200);
  assert.equal(summary.totalAllocatedBase, 17000);
  assert.equal(summary.remaining, 800);
  assert.equal(summary.isOverpaid, false);
});

test("Finance Engine - getInvoiceSummary (Overpayment Tracking)", () => {
  const allocations: AllocationInput[] = [{
    amount: 150,
    amountBase: 12000
  }];

  const summary = getInvoiceSummary(allocations, 100);

  assert.equal(summary.totalAllocated, 150);
  assert.equal(summary.remaining, -50);
  assert.equal(summary.isOverpaid, true);
  assert.equal(summary.overpaidAmount, 50);
});

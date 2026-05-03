import test from "node:test";
import assert from "node:assert/strict";
import { 
  getPaymentSummary, 
  getInvoiceSummary, 
  PaymentInput, 
  InvoiceInput 
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

  // Mismatch should be 0 because 188 = 200 - 12
  assert.equal(sum.mismatchBase, 0);
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
  assert.equal(sum.mismatchBase, 0);
});

test("Finance Engine - getInvoiceSummary (Forex Fluctuation)", () => {
  const inv: InvoiceInput = { exchangeRate: 83, totalAmount: 1000 };
  
  // Payment happens later when rate is 85
  const payments: PaymentInput[] = [{
    type: "PAYMENT",
    exchangeRate: 85,
    intendedAmount: 200,
    receivedAmount: 200,
    fees: []
  }];

  const summary = getInvoiceSummary(payments, inv);

  // We intended to get 200 * 83 = 16600, but actually got 200 * 85 = 17000
  // Fluctuation = (85 - 83) * 200 = 400
  assert.equal(summary.totalForexDifference, 400);
  
  // Base properties
  assert.equal(summary.invoiceAmountBase, 83000);
  assert.equal(summary.totalIntendedBase, 17000);
  assert.equal(summary.remainingIntendedBase, 83000 - 17000); // 66000
});

test("Finance Engine - getInvoiceSummary (Forex Fluctuation with Refund)", () => {
  const inv: InvoiceInput = { exchangeRate: 83, totalAmount: 1000 };
  
  // We receive $200 at rate 85
  // We refund $100 at rate 82
  const payments: PaymentInput[] = [
    { type: "PAYMENT", exchangeRate: 85, intendedAmount: 200, receivedAmount: 200, fees: [] },
    { type: "REFUND", exchangeRate: 82, intendedAmount: 100, receivedAmount: 100, fees: [] }
  ];

  const summary = getInvoiceSummary(payments, inv);

  // Payment 1 Diff: (85 - 83) * 200 = +400
  // Payment 2 (Refund) Diff: (82 - 83) * 100 = -100 (Wait, it's a refund multiplier = -1)
  // So: (-100) * -1 = +100
  // Total Diff: +500
  assert.equal(summary.totalForexDifference, 500);
});

test("Finance Engine - getInvoiceSummary (Overpayment Tracking)", () => {
  const inv: InvoiceInput = { exchangeRate: 80, totalAmount: 100 };
  
  const payments: PaymentInput[] = [{
    type: "PAYMENT",
    exchangeRate: 80,
    intendedAmount: 150, // client pays more than invoice total
    receivedAmount: 150,
    fees: []
  }];

  const summary = getInvoiceSummary(payments, inv);

  assert.equal(summary.invoiceAmountBase, 8000);
  assert.equal(summary.totalReceivedBase, 12000); // 150 * 80
  
  // Overpayment should be 4000
  assert.equal(summary.overpaidAmountBase, 4000);
});

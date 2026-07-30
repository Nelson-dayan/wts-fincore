import test from "node:test";
import assert from "node:assert/strict";
import { 
  convertCurrency, 
  normalizeToBase, 
  convertBaseToTreasury,
  floatEquals,
  floatLessThanOrEqual,
  STATIC_FX_RATES,
  BASE_ACCOUNTING_CURRENCY
} from "./forex.engine";

// 1. USD -> INR Conversion
test("Scenario 1: USD -> INR conversion to accounting base", () => {
  const result = convertCurrency({ amount: 100, fromCurrency: "USD", toCurrency: "INR" });
  assert.equal(result.rate, 83.0);
  assert.ok(floatEquals(result.amount, 8300));
  assert.equal(result.source, "LIVE_API");
});

// 2. AED -> INR Conversion
test("Scenario 2: AED -> INR conversion to base normalization", () => {
  const result = normalizeToBase({ amount: 100, currency: "AED" });
  assert.equal(result.rate, 22.6);
  assert.ok(floatEquals(result.amount, 2260));
});

// 3. SGD -> INR Conversion
test("Scenario 3: SGD -> INR conversion to base normalization", () => {
  const result = normalizeToBase({ amount: 100, currency: "SGD" });
  assert.equal(result.rate, 62.5);
  assert.ok(floatEquals(result.amount, 6250));
});

test("Scenario 3b: AUD -> INR conversion to base normalization", () => {
  const result = normalizeToBase({ amount: 100, currency: "AUD" });
  assert.equal(result.rate, 54.5);
  assert.ok(floatEquals(result.amount, 5450));
});

// 4. RM -> USD Cross-Rate via Base INR
test("Scenario 4: RM -> USD cross-rate via relative base rates", () => {
  const result = convertCurrency({ amount: 100, fromCurrency: "RM", toCurrency: "USD" });
  // RM to USD rate should be 18.2 / 83.0
  const expectedRate = 18.2 / 83.0;
  assert.ok(floatEquals(result.rate, expectedRate));
  assert.ok(floatEquals(result.amount, 100 * expectedRate));
});

// 5. RM -> INR Conversion
test("Scenario 5: RM -> INR conversion", () => {
  const result = normalizeToBase({ amount: 100, currency: "RM" });
  assert.equal(result.rate, 18.2);
  assert.ok(floatEquals(result.amount, 1820));
});

// 6. USD Payment + SGD Invoice Cross-Allocation Validation
test("Scenario 6: USD payment + SGD invoice cross-currency allocation and remainder math in base INR", () => {
  const paymentGrossUSD = 1000;
  const rates = STATIC_FX_RATES;
  
  // Normalize payment gross to base INR
  const paymentBase = normalizeToBase({ amount: paymentGrossUSD, currency: "USD", rates }).amount; // 83,000 INR
  assert.equal(paymentBase, 83000);
  
  // Invoice of 500 SGD
  const invoiceSGD = 500;
  const invoiceBase = normalizeToBase({ amount: invoiceSGD, currency: "SGD", rates }).amount; // 31,250 INR
  assert.equal(invoiceBase, 31250);
  
  // Perform allocation check in base
  const allocatedBase = invoiceBase;
  const remainingBase = paymentBase - allocatedBase; // 51,750 INR
  
  assert.equal(remainingBase, 51750);
  assert.ok(floatLessThanOrEqual(allocatedBase, paymentBase));
});

// 7. USD Payment + INR Invoice Allocation
test("Scenario 7: USD payment + INR invoice allocation normalized matching base ledger", () => {
  const paymentUSD = 200;
  const paymentBase = normalizeToBase({ amount: paymentUSD, currency: "USD" }).amount; // 16,600 INR
  
  const invoiceINR = 10000; // 10,000 INR
  const invoiceBase = normalizeToBase({ amount: invoiceINR, currency: "INR" }).amount; // 10,000 INR (same currency bypass)
  
  assert.equal(invoiceBase, 10000);
  assert.ok(paymentBase > invoiceBase);
  
  const remainingBase = paymentBase - invoiceBase; // 6,600 INR
  assert.equal(remainingBase, 6600);
});

// 8. INR Payment + INR Invoice Allocation
test("Scenario 8: INR payment + INR invoice allocation same currency bypass", () => {
  const paymentINR = 1000;
  const invoiceINR = 1000;
  
  // Both normalize with bypass (rate should be 1.0)
  const pResult = normalizeToBase({ amount: paymentINR, currency: "INR" });
  const iResult = normalizeToBase({ amount: invoiceINR, currency: "INR" });
  
  assert.equal(pResult.rate, 1.0);
  assert.equal(iResult.rate, 1.0);
  assert.equal(pResult.amount, 1000);
  assert.equal(iResult.amount, 1000);
});

// 9. Same-Currency Allocation Bypass verification
test("Scenario 9: Same-currency allocation 1.0 bypass check", () => {
  const result = convertCurrency({ amount: 500, fromCurrency: "USD", toCurrency: "USD" });
  assert.equal(result.rate, 1.0);
  assert.equal(result.amount, 500);
  assert.equal(result.source, "FALLBACK_STATIC");
});

// 10. Multi-Fee Currencies Normalization
test("Scenario 10: Multi-fee currencies normalized independently into base INR", () => {
  const fees = [
    { amount: 10, currency: "USD" }, // 10 * 83 = 830 INR
    { amount: 5, currency: "AED" },  // 5 * 22.6 = 113 INR
    { amount: 100, currency: "INR" } // 100 * 1 = 100 INR
  ];
  
  const totalFeesBase = fees.reduce((sum, fee) => {
    const norm = normalizeToBase({ amount: fee.amount, currency: fee.currency });
    return sum + norm.amount;
  }, 0);
  
  assert.equal(totalFeesBase, 830 + 113 + 100); // 1043 INR
});

// 11. Multi-Invoice Allocations
test("Scenario 11: Single payment allocated to multiple invoices of different currencies", () => {
  const paymentBase = normalizeToBase({ amount: 500, currency: "USD" }).amount; // 41,500 INR
  
  const invoice1Base = normalizeToBase({ amount: 400, currency: "AED" }).amount; // 9,040 INR
  const invoice2Base = normalizeToBase({ amount: 300, currency: "SGD" }).amount; // 18,750 INR
  
  const totalAllocatedBase = invoice1Base + invoice2Base; // 27,790 INR
  assert.ok(totalAllocatedBase < paymentBase);
  
  const remainingBase = paymentBase - totalAllocatedBase;
  assert.equal(remainingBase, 41500 - 27790); // 13,710 INR
});

// 12. Partial Allocations Remainder check
test("Scenario 12: Real-time partial allocation and remainder math in base INR", () => {
  const paymentBase = normalizeToBase({ amount: 100, currency: "USD" }).amount; // 8,300 INR
  const invoiceBase = normalizeToBase({ amount: 10000, currency: "INR" }).amount; // 10,000 INR
  
  // Allocate partial amount (say 5,000 INR of the invoice)
  const allocatedBase = 5000;
  
  // Verify safety limits
  assert.ok(allocatedBase < paymentBase);
  assert.ok(allocatedBase < invoiceBase);
  
  const remainingBase = paymentBase - allocatedBase; // 3,300 INR
  assert.equal(remainingBase, 3300);
});

// 13. Overallocations Validation
test("Scenario 13: Over-allocation validation check blocks overallocations in base INR", () => {
  const paymentBase = normalizeToBase({ amount: 50, currency: "USD" }).amount; // 4,150 INR
  const allocationBaseAttempt = normalizeToBase({ amount: 200, currency: "AED" }).amount; // 4,520 INR
  
  const isValid = floatLessThanOrEqual(allocationBaseAttempt, paymentBase);
  assert.equal(isValid, false); // Blocked!
});

// 14. Inverse-Rate Edge Cases
test("Scenario 14: Inverse rate relative math accuracy", () => {
  const direct = convertCurrency({ amount: 1, fromCurrency: "USD", toCurrency: "SGD" });
  const inverse = convertCurrency({ amount: 1, fromCurrency: "SGD", toCurrency: "USD" });
  
  // direct.rate should be 83.0 / 62.5 = 1.328
  // inverse.rate should be 62.5 / 83.0 = 0.753012
  assert.ok(floatEquals(direct.rate * inverse.rate, 1.0));
});

// 15. Treasury Currency != Base Currency display conversion
test("Scenario 15: Treasury account wallet currency conversion for reporting display", () => {
  const ledgerBaseAmount = 83000; // 83,000 INR
  
  // Account currency is USD
  const usdWallet = convertBaseToTreasury({ baseAmount: ledgerBaseAmount, treasuryCurrency: "USD" });
  assert.equal(usdWallet.rate, 1 / 83.0);
  assert.ok(floatEquals(usdWallet.amount, 1000));
  
  // Account currency is AED
  const aedWallet = convertBaseToTreasury({ baseAmount: ledgerBaseAmount, treasuryCurrency: "AED" });
  assert.equal(aedWallet.rate, 1 / 22.6);
  assert.ok(floatEquals(aedWallet.amount, 83000 / 22.6));
});

// 16. Invoice Currency == Base Currency
test("Scenario 16: Invoice currency equals base currency", () => {
  const result = normalizeToBase({ amount: 1500, currency: BASE_ACCOUNTING_CURRENCY });
  assert.equal(result.rate, 1.0);
  assert.equal(result.amount, 1500);
});

// 17. Payment Currency == Treasury Currency
test("Scenario 17: Payment currency equals receiving account treasury currency", () => {
  const result = convertCurrency({ amount: 500, fromCurrency: "USD", toCurrency: "USD" });
  assert.equal(result.rate, 1.0);
  assert.equal(result.amount, 500);
});

// 18. Payment Currency != Treasury Currency
test("Scenario 18: Payment currency differs from treasury account currency", () => {
  const paymentAmount = 100;
  const paymentCurrency = "USD";
  const treasuryCurrency = "AED";
  
  // Convert payment to base first
  const base = normalizeToBase({ amount: paymentAmount, currency: paymentCurrency }).amount; // 8300 INR
  
  // Then convert base to treasury wallet balance for reporting
  const treasury = convertBaseToTreasury({ baseAmount: base, treasuryCurrency });
  
  const expectedDirectCross = 100 * (83.0 / 22.6);
  assert.ok(floatEquals(treasury.amount, expectedDirectCross));
});

// 19. Double-Normalization Protection
test("Scenario 19: Double-normalization protection prevents recurring conversions", () => {
  const originalUSD = 100;
  const firstNorm = normalizeToBase({ amount: originalUSD, currency: "USD" }); // 8300 INR
  
  // If we mistakenly normalize again, it should guard against it or bypass if we check base currency equals system base
  const secondNorm = normalizeToBase({ amount: firstNorm.amount, currency: BASE_ACCOUNTING_CURRENCY });
  
  assert.equal(secondNorm.rate, 1.0);
  assert.equal(secondNorm.amount, 8300);
});

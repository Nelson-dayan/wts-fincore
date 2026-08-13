# Feature Documentation: Payment Settlement & Reconciliation

## 1. Module Overview & Purpose
Payment Settlement records incoming financial receipts and outgoing refunds against target invoices, adjusting balances and chart of account ledgers.

## 2. Core Business Rules & Boundaries
- Incoming payments auto-recalculate target invoice total received and transition payment status (`UNPAID` → `PARTIAL` → `PAID`).
- Negative amounts or amounts exceeding invoice total are flagged for overpayment reconciliation.

## 3. Data Model & Relationships
- Model: `PaymentModel` (`payments` collection).

## 4. Security & Authorization Constraints
- Requires `payments.create` and `invoices.markPaid`.

## 5. API Endpoints & State Transitions
- `POST /api/payments`: Records payment receipt.
- `GET /api/payments`: Lists payments.

## 6. UI Components & Responsive Layouts
- Record Payment Modal & Settlement History Table.

## 7. Verification & Edge Case Scenarios
- Double-recording payment -> Idempotency check prevents duplicate ledger entries.

# Feature Documentation: Invoice Engine

## 1. Module Overview & Purpose
The Invoice Engine manages tax invoices, dual-status tracking (Lifecycle Status & Payment Status), document rendering, and receivable state locks.

## 2. Core Business Rules & Boundaries
- Controlled Lifecycle: `DRAFT` → `ISSUED` → `SENT` → `PAID` (with `VOID` terminal state).
- Automatic Payment Status: `UNPAID` → `PARTIAL` → `PAID`.
- Issued/Sent invoices lock line items and total amounts.

## 3. Data Model & Relationships
- Model: `InvoiceModel` (`invoices` collection).

## 4. Security & Authorization Constraints
- `invoices.view`, `invoices.create`, `invoices.issue`, `invoices.send`, `invoices.markPaid`, `invoices.void`.

## 5. API Endpoints & State Transitions
- `GET /api/invoices`: Lists invoices.
- `POST /api/invoices`: Creates draft invoice.
- `POST /api/invoices/[id]/issue`: Issues invoice.
- `POST /api/invoices/[id]/mark-paid`: Marks invoice paid.

## 6. UI Components & Responsive Layouts
- Invoice Builder & Detail View.

## 7. Verification & Edge Case Scenarios
- Editing line items of an ISSUED invoice -> Blocked by state lock.

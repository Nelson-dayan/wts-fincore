# Feature Documentation: Purchase Order Engine

## 1. Module Overview & Purpose
The Purchase Order (PO) Engine records formal commercial commitments derived from approved proposals or direct procurement agreements.

## 2. Core Business Rules & Boundaries
- Auto-inherits project, client, and line item details from approved Quotation.
- Statuses: `active`, `completed`, `cancelled`.
- Serves as required parent reference for receivable invoices.

## 3. Data Model & Relationships
- Model: `PurchaseOrderModel` (`purchaseorders` collection).

## 4. Security & Authorization Constraints
- `pos.view` to list; `pos.create` to generate.

## 5. API Endpoints & State Transitions
- `GET /api/purchase-orders`: Lists POs.
- `POST /api/purchase-orders`: Creates PO from quotation.

## 6. UI Components & Responsive Layouts
- PO Directory & Detail View.

## 7. Verification & Edge Case Scenarios
- Creating PO from unapproved quotation -> Rejected.

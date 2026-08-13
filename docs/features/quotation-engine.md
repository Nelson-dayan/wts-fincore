# Feature Documentation: Quotation Engine

## 1. Module Overview & Purpose
The Quotation Engine generates multi-page commercial proposals with line items, tax breakdowns, custom document prefixes, and client approval tracking.

## 2. Core Business Rules & Boundaries
- Quotation numbers auto-generate with company prefix (e.g. `QT-DXB-001`).
- Status Lifecycle: `DRAFT` → `SENT` → `APPROVED` / `DECLINED`.
- Approved proposals lock items against further modification and enable single-click Purchase Order generation.

## 3. Data Model & Relationships
- Model: `QuotationModel` (`quotations` collection).

## 4. Security & Authorization Constraints
- `quotations.create` for proposal generation; `quotations.approve` for acceptance.

## 5. API Endpoints & State Transitions
- `GET /api/quotations`: Fetches quotations.
- `POST /api/quotations`: Drafts quotation.
- `POST /api/quotations/[id]/send`: Sends to client.
- `POST /api/quotations/[id]/approve`: Approves quotation.

## 6. UI Components & Responsive Layouts
- Quotation Builder & Public Acceptance View.

## 7. Verification & Edge Case Scenarios
- Attempting to edit an APPROVED quotation -> Rejected by state lock.

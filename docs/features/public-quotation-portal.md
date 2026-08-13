# Feature Documentation: Public Quotation Portal

## 1. Module Overview & Purpose
The Public Quotation Portal allows external client contacts to view, review, digitally sign, and accept commercial proposals without logging into the internal ERP.

## 2. Core Business Rules & Boundaries
- Accessible via secure tokenized link `/portal/quotations/[id]?token=...`.
- Client digital signature & acceptance timestamp are recorded in quotation document audit log upon approval.

## 3. Data Model & Relationships
- Interacts with `QuotationModel`.

## 4. Security & Authorization Constraints
- Public route bypasses ERP user auth session check, but validates secret access token.

## 5. API Endpoints & State Transitions
- `GET /api/public/quotations/[id]`: Returns public proposal payload.
- `POST /api/public/quotations/[id]/accept`: Submits client acceptance & digital signature.

## 6. UI Components & Responsive Layouts
- Public Proposal View with Responsive PDF preview and digital signature pad.

## 7. Verification & Edge Case Scenarios
- Expired or invalid token -> Displays "Proposal Link Expired" error page.

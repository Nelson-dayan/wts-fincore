# Feature Documentation: Project Profitability Engine

## 1. Module Overview & Purpose
The Profitability Engine calculates real-time net margins for active and completed projects by comparing paid invoice revenue against total logged expenses.

## 2. Core Business Rules & Boundaries
- Profit Margin Formula: `Net Profit = Total Paid Invoices (Base) - Total Logged Expenses (Base)`.
- Budget Utilization: `(Expenses / Total Budget) * 100`.

## 3. Data Model & Relationships
- Aggregates `InvoiceModel` (`paymentStatus === "PAID"`) and `ExpenseModel`.

## 4. Security & Authorization Constraints
- Requires `reports.view` or project owner permissions.

## 5. API Endpoints & State Transitions
- `GET /api/projects/[id]/profitability`: Returns financial breakdown.

## 6. UI Components & Responsive Layouts
- Profitability Card & Margin Progress Indicator inside Project Hub.

## 7. Verification & Edge Case Scenarios
- Zero expenses recorded -> Margin equals 100% of revenue.

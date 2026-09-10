# Feature Documentation: Financial Reporting Engine

## 1. Module Overview & Purpose
The Financial Reporting Engine generates executive summaries, receivables aging charts, revenue trend graphs, and currency translation metrics.

## 2. Core Business Rules & Boundaries
- Reports adjust dynamically based on Single Entity vs Group View scope.
- Summaries translate sub-currency amounts to base currency.

## 3. Data Model & Relationships
- Aggregates `InvoiceModel`, `PaymentModel`, `ExpenseModel`.

## 4. Security & Authorization Constraints
- Requires `reports.view` capability.

## 5. API Endpoints & State Transitions
- `GET /api/reports/financials`: Returns aggregated summary.

## 6. UI Components & Responsive Layouts
- Executive Dashboard & Financial Reports Page.

## 7. Verification & Edge Case Scenarios
- Currency translation fallback -> Default rate 1.0 used if rate lookup missing.

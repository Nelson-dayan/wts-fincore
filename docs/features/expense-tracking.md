# Feature Documentation: Expense Tracking

## 1. Module Overview & Purpose
Expense Tracking logs operational project costs across categories (Tools, Infrastructure, Travel, Services) for budget tracking and margin calculations.

## 2. Core Business Rules & Boundaries
- Expenses must be linked to a `companyId` and `projectId`.
- Amounts in non-base currency require an explicit `exchangeRate`.

## 3. Data Model & Relationships
- Model: `ExpenseModel` (`expenses` collection).

## 4. Security & Authorization Constraints
- Requires `expenses.view` and `expenses.create`.

## 5. API Endpoints & State Transitions
- `GET /api/expenses`: Lists expenses.
- `POST /api/expenses`: Records new expense.

## 6. UI Components & Responsive Layouts
- Expense Logger Modal & Expense Table.

## 7. Verification & Edge Case Scenarios
- Expense amount < 0 -> Rejected by payload validation.

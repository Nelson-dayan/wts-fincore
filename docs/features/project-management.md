# Feature Documentation: Project Management

## 1. Module Overview & Purpose
Project Management acts as the operational hub for Sec-DocuTrade ERP, anchoring quotations, purchase orders, invoices, expenses, and profitability calculations under client and company scope.

## 2. Core Business Rules & Boundaries
- Projects belong to a parent `companyId` and `clientId`.
- Statuses: `active`, `completed`, `archived`.
- Budget is specified in project currency.

## 3. Data Model & Relationships
- Model: `ProjectModel` (`projects` collection).

## 4. Security & Authorization Constraints
- Admins view all company projects; Employees only view assigned projects.

## 5. API Endpoints & State Transitions
- `GET /api/projects`: Lists projects under active context.
- `POST /api/projects`: Creates project workspace.
- `PATCH /api/projects/[id]`: Updates project timeline/budget.

## 6. UI Components & Responsive Layouts
- Projects Directory: `src/app/(portals)/admin/projects/page.tsx`
- Project Hub: `src/app/(portals)/admin/projects/[id]/page.tsx`

## 7. Verification & Edge Case Scenarios
- Creating project with end date before start date -> Fails validation.

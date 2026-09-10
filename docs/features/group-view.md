# Feature Documentation: Group View (Consolidated Reporting)

## 1. Module Overview & Purpose
Group View enables corporate executives and group managers to aggregate financial metrics, project statuses, and revenue statistics across all entities in the corporate tree.

## 2. Core Business Rules & Boundaries
- Aggregates metrics without mutating individual subsidiary records.
- Mode toggled via `scopeMode: "group" | "single"`.

## 3. Data Model & Relationships
- Traverses child `companyId`s derived from parent `CompanyModel` tree.

## 4. Security & Authorization Constraints
- Requires `groupView.access` capability.

## 5. API Endpoints & State Transitions
- `GET /api/reports/financials?scope=group`: Fetches consolidated financial metrics.

## 6. UI Components & Responsive Layouts
- Executive Banner: Renders consolidated revenue cards & currency conversion badges.

## 7. Verification & Edge Case Scenarios
- Non-admin user attempting group view -> Returns `PERMISSION_DENIED`.

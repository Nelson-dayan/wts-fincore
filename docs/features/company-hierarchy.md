# Feature Documentation: Company Hierarchy

## 1. Module Overview & Purpose
The Company Hierarchy module renders recursive organizational trees representing corporate holding structures, operating subsidiaries, regional branches, and business divisions.

## 2. Core Business Rules & Boundaries
- Parent entities (`holding`) can have multiple child entities (`operating`, `branch`, `division`).
- A child entity cannot be set as its own parent (prevention of cyclic graph loops).
- Hierarchy depth supports arbitrary nesting up to system limits.

## 3. Data Model & Relationships
- Model: `CompanyModel` via `parentCompanyId` self-referential foreign key.

## 4. Security & Authorization Constraints
- Tree traversal requires `company.view` capability.
- Hierarchy mutations require `company.manage`.

## 5. API Endpoints & State Transitions
- `GET /api/admin/companies`: Returns full list of companies for tree construction.
- `POST /api/admin/companies`: Creates new entity node in hierarchy.

## 6. UI Components & Responsive Layouts
- Companies Tree Page: `src/app/(portals)/admin/settings/companies/page.tsx`
- Fully responsive tree cards with mobile flex wrapping.

## 7. Verification & Edge Case Scenarios
- Cyclic parent assignment attempt -> Rejected by validation.

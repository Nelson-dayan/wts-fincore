# Feature Documentation: Company Context Engine

## 1. Module Overview & Purpose
The Company Context Engine provides active entity context management across frontend client components and backend API endpoints, ensuring fail-fast data isolation.

## 2. Core Business Rules & Boundaries
- Active context is stored in `localStorage` under `activeCompanyId`.
- Context switches emit custom window event `companyContextChanged`.
- Backend API endpoints validate header `x-company-id` against session privileges.

## 3. Data Model & Relationships
- Intercepts requests for all tenant-scoped collections (`clients`, `projects`, `invoices`, `expenses`).

## 4. Security & Authorization Constraints
- Users cannot access data for a `companyId` outside their authorized company list.

## 5. API Endpoints & State Transitions
- Integrated across all API routes via `authorizeAction({ activeCompanyId, actionCompanyId })`.

## 6. UI Components & Responsive Layouts
- Switcher: `CompanySwitcher` (`src/components/layout/company-switcher.tsx`).

## 7. Verification & Edge Case Scenarios
- Invalid company ID in header -> API rejects with `COMPANY_ACCESS_DENIED`.

# Feature Documentation: Roles & RBAC Engine

## 1. Module Overview & Purpose
The Role-Based Access Control (RBAC) Engine maps user roles to specific permission capabilities, guaranteeing consistent authorization checks across UI and API layers.

## 2. Core Business Rules & Boundaries
- Roles: `ADMIN` (Full company & management access) and `EMPLOYEE` (Scoped project execution).
- Capabilities map strings like `invoices.view`, `invoices.create`, `invoices.issue`, `invoices.markPaid`, `invoices.void`.

## 3. Data Model & Relationships
- Evaluated via `hasCapability(role, capability)` in `src/lib/auth/rbac.ts`.

## 4. Security & Authorization Constraints
- Centralized check guarantees no hardcoded inline role strings bypass policy.

## 5. API Endpoints & State Transitions
- Evaluated on every request via `authorizeAction()`.

## 6. UI Components & Responsive Layouts
- Integrated with `Can` guard component in UI.

## 7. Verification & Edge Case Scenarios
- Employee attempting admin action -> Rejected by capability check.

# Feature Documentation: Security & Permissions Test System

## 1. Module Overview & Purpose
The Permissions Test System verifies that all API routes enforce capability checks and multi-tenant isolation via a 59-test regression suite.

## 2. Core Business Rules & Boundaries
- Executes 59 security matrix tests (`npm run test:security`).
- Validates cross-company access rejection, employee boundary checks, and public route safety.

## 3. Data Model & Relationships
- Tests against `src/lib/auth/authorize.ts` and `src/lib/auth/rbac.ts`.

## 4. Security & Authorization Constraints
- Built into CI/CD build gate; build fails if any test fails.

## 5. API Endpoints & State Transitions
- Verified via `npm run test:security`.

## 6. UI Components & Responsive Layouts
- Automated CLI script execution.

## 7. Verification & Edge Case Scenarios
- 59/59 security tests pass reliably.

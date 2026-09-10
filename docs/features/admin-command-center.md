# Feature Documentation: Admin Command Center

## 1. Module Overview & Purpose
The Admin Command Center serves as the central executive hub for full organizational oversight, financial control, multi-company switching, and user administration.

## 2. Core Business Rules & Boundaries
- Accessible exclusively to users with `UserRole.ADMIN`.
- Houses executive metrics, Group View toggle, company hierarchy management, and financial summaries.

## 3. Data Model & Relationships
- Aggregates system-wide entities under active company / group context.

## 4. Security & Authorization Constraints
- Protected by `UserRole.ADMIN` role guard.

## 5. API Endpoints & State Transitions
- Interacts with `/api/admin/*` endpoints.

## 6. UI Components & Responsive Layouts
- Admin Portal Dashboard (`src/app/(portals)/admin/page.tsx`).

## 7. Verification & Edge Case Scenarios
- Non-admin attempting to access -> Blocked with HTTP 403 Forbidden.

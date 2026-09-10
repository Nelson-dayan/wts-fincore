# Feature Documentation: User Administration

## 1. Module Overview & Purpose
User Administration allows enterprise administrators to create user accounts, assign roles, reset passwords, and manage active statuses.

## 2. Core Business Rules & Boundaries
- User email must be unique across system.
- Roles include `admin` and `employee`.
- Users must be assigned a `defaultCompanyId`.

## 3. Data Model & Relationships
- Model: `UserModel`.

## 4. Security & Authorization Constraints
- Requires `users.manage` capability.

## 5. API Endpoints & State Transitions
- `GET /api/admin/users`: Lists users.
- `POST /api/admin/users`: Creates user.
- `PATCH /api/admin/users/[id]`: Updates user.

## 6. UI Components & Responsive Layouts
- Admin Users Page: `src/app/(portals)/admin/settings/users/page.tsx`.

## 7. Verification & Edge Case Scenarios
- Creating user with existing email -> Fails with HTTP 409 Conflict.

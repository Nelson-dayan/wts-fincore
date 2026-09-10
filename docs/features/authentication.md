# Feature Documentation: Authentication & Session Management

## 1. Module Overview & Purpose
The Authentication & Session Management module handles secure user identification, session maintenance, password hashing, and cookie-based JWT session tokens across Sec-DocuTrade ERP.

## 2. Core Business Rules & Boundaries
- Passwords are hashed using `bcryptjs` with salt rounds of 10.
- Session tokens are stored in HTTP-only, secure cookies.
- Inactive users (`isActive: false`) are blocked from logging in.
- Failed login attempts return standardized auth error responses without exposing account existence.

## 3. Data Model & Relationships
- Primary Model: `UserModel` (`users` collection).
- Key Fields: `email`, `password`, `name`, `role` (`admin` | `employee`), `defaultCompanyId`, `isActive`.

## 4. Security & Authorization Constraints
- All protected API routes check session token via `getSession()`.
- Unauthorized requests return HTTP 401 `UNAUTHORIZED`.

## 5. API Endpoints & State Transitions
- `POST /api/auth/login`: Authenticates user credentials and sets cookie.
- `POST /api/auth/logout`: Clears session cookie and invalidates session.
- `GET /api/auth/me`: Returns current authenticated user metadata.

## 6. UI Components & Responsive Layouts
- Login View: `src/app/(auth)/login/page.tsx`
- Auth Provider: `src/components/providers/auth-provider.tsx`

## 7. Verification & Edge Case Scenarios
- Attempting login with wrong password -> HTTP 401.
- Attempting login with disabled user -> HTTP 403 Account Disabled.

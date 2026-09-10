# Feature Documentation: System Settings & Workspace Preferences

## 1. Module Overview & Purpose
System Settings configures enterprise application parameters, theme preferences, default company context, and system defaults.

## 2. Core Business Rules & Boundaries
- Theme preferences persist in local storage.
- Settings changes require appropriate administrative capabilities.

## 3. Data Model & Relationships
- Stores global defaults in `CompanyModel` and user preferences in `UserModel`.

## 4. Security & Authorization Constraints
- Requires `settings.view` and `settings.manage`.

## 5. API Endpoints & State Transitions
- `GET /api/admin/settings`: Reads system settings.
- `PATCH /api/admin/settings`: Saves system configuration.

## 6. UI Components & Responsive Layouts
- Admin Settings Portal.

## 7. Verification & Edge Case Scenarios
- Invalid default language or theme -> Fallback to system default (`dark`).

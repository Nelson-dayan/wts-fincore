# Feature Documentation: Activity & Audit Trail

## 1. Module Overview & Purpose
The Audit Trail logs immutable system activity records for compliance, governance, and security auditing across all workspace actions.

## 2. Core Business Rules & Boundaries
- Records are append-only and cannot be modified or deleted via UI or standard API.
- Captures `companyId`, `userId`, `userName`, `action`, `entityType`, `entityId`, and timestamp.

## 3. Data Model & Relationships
- Model: `ActivityLogModel` (`activitylogs` collection).

## 4. Security & Authorization Constraints
- Requires `activityLog.view` capability.

## 5. API Endpoints & State Transitions
- `GET /api/admin/activity`: Fetches activity log stream.

## 6. UI Components & Responsive Layouts
- Audit Trail Table in Admin Settings.

## 7. Verification & Edge Case Scenarios
- Attempting PATCH/DELETE on activity logs -> Endpoint returns HTTP 405 Method Not Allowed.

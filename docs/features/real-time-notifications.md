# Feature Documentation: Real-Time Notifications System

## 1. Module Overview & Purpose
The Notifications System alerts users to quotation approvals, overdue invoices, assignment updates, and payment receipts.

## 2. Core Business Rules & Boundaries
- Notifications belong to a specific `userId` and `companyId`.
- Unread notifications trigger red badge counter in top navbar header.

## 3. Data Model & Relationships
- Model: `NotificationModel` (`notifications` collection).

## 4. Security & Authorization Constraints
- Users can only fetch/mark read their own notifications.

## 5. API Endpoints & State Transitions
- `GET /api/notifications`: Fetches user notifications.
- `PATCH /api/notifications/[id]/read`: Marks notification read.

## 6. UI Components & Responsive Layouts
- Notification Bell & Popover Drawer in top navbar.

## 7. Verification & Edge Case Scenarios
- Clicking notification -> Auto-marks item read and navigates to target entity.

# Feature Documentation: Project Members & Contact Assignments

## 1. Module Overview & Purpose
This module manages team member assignments and client contact roles (Technical Lead, Commercial Approver, Billing Contact) for each project workspace.

## 2. Core Business Rules & Boundaries
- Projects must have at least one assigned Project Manager / Owner.
- Assigned team members gain employee workspace access to the project.

## 3. Data Model & Relationships
- Model: `ProjectContactAssignmentModel` (`projectcontactassignments` collection).

## 4. Security & Authorization Constraints
- Requires `projects.edit` capability to assign members.

## 5. API Endpoints & State Transitions
- `GET /api/projects/[id]/members`: Gets assigned members.
- `POST /api/projects/[id]/members`: Assigns team member.

## 6. UI Components & Responsive Layouts
- Project Members Tab: Rendered inside Project Hub view.

## 7. Verification & Edge Case Scenarios
- Unassigning last manager -> Warning triggered.

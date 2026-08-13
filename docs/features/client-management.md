# Feature Documentation: Client Management

## 1. Module Overview & Purpose
Client Management tracks external client profiles, contact points, default currencies, billing addresses, and linked commercial projects.

## 2. Core Business Rules & Boundaries
- Clients are owned by a specific `companyId`.
- Client status can be `ACTIVE` or `INACTIVE`.
- Client currency dictates default proposal and invoice billing currency.

## 3. Data Model & Relationships
- Model: `ClientModel` (`clients` collection).

## 4. Security & Authorization Constraints
- Requires `clients.view` for listing and `clients.create`/`clients.edit` for mutations.

## 5. API Endpoints & State Transitions
- `GET /api/clients`: Fetches client directory.
- `POST /api/clients`: Registers new client.
- `PATCH /api/clients/[id]`: Updates client metadata.

## 6. UI Components & Responsive Layouts
- Client Directory: `src/app/(portals)/admin/clients/page.tsx`.

## 7. Verification & Edge Case Scenarios
- Attempting to link project to client of another company -> Fails validation.

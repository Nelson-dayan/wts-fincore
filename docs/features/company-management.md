# Feature Documentation: Company Management

## 1. Module Overview & Purpose
The Company Management module allows enterprise administrators to create, update, and manage legal entity records, legal tax identifiers (TRN/VAT), base currencies, and official branding assets.

## 2. Core Business Rules & Boundaries
- Company code must be a unique uppercase string (3-8 characters).
- Primary entity (`isPrimary: true`) serves as default for consolidated reporting.
- Base currency determines monetary conversion for financial documents.

## 3. Data Model & Relationships
- Primary Model: `CompanyModel` (`companies` collection).
- Key Fields: `name`, `code`, `kind`, `taxId`, `baseCurrency`, `supportedCurrencies`, `branding`.

## 4. Security & Authorization Constraints
- Only users with `company.manage` capability can edit company settings.
- Read operations require `company.view`.

## 5. API Endpoints & State Transitions
- `GET /api/admin/company`: Loads current active company details.
- `PATCH /api/admin/company`: Updates company metadata & branding assets.

## 6. UI Components & Responsive Layouts
- Client View: `AdminCompanyClient` (`src/components/portals/company/admin-company-client.tsx`).
- Responsive layouts adjust logo preview, input grids, and buttons dynamically across viewports.

## 7. Verification & Edge Case Scenarios
- Duplicate code attempt -> Fails with HTTP 409 Conflict.
- Invalid currency code -> Rejected by schema validation.

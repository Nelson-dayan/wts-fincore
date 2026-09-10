# Feature Documentation: Document Branding & Legal Prefixes

## 1. Module Overview & Purpose
Document Branding allows companies to customize official document headers, logo images, digital signatures, company seals/stamps, payment footers, and numbering prefixes (INV, QT, PO).

## 2. Core Business Rules & Boundaries
- Logo and signature support direct base64 data URIs or external image URLs (`https://`).
- Document prefixes auto-append sequence numbers (e.g., `INV-DXB-2026-001`).

## 3. Data Model & Relationships
- Stored under `branding` sub-document in `CompanyModel`.

## 4. Security & Authorization Constraints
- Requires `company.manage` capability.

## 5. API Endpoints & State Transitions
- `PATCH /api/admin/company`: Updates branding assets & text footers.

## 6. UI Components & Responsive Layouts
- Brand Assets Section in `AdminCompanyClient` with Upload Cards & URL inputs.

## 7. Verification & Edge Case Scenarios
- Invalid image URL format -> Fallback icon rendered safely without breaking document layout.

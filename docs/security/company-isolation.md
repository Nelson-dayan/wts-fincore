# Company Data Isolation

## Overview
Sec-DocuTrade implements strict multi-tenant data isolation to prevent cross-company data leakage, IDOR vulnerabilities, and search index pollution.

## Isolation Principles

### 1. IDOR Prevention
- **Status**: [VERIFIED]
- **Behavior**: Direct URL access (`/api/admin/quotations/[id]`, `/api/admin/invoices/[id]`, etc.) to a resource owned by Company B by a user operating in Company A returns `COMPANY_ACCESS_DENIED` or `COMPANY_CONTEXT_SWITCH_REQUIRED`.

### 2. Search Scoping Isolation
- **Status**: [VERIFIED]
- **Behavior**: Global search (`/api/admin/search`) injects company context filter (`companyId: { $in: authorizedCompanyIds }`) into database queries. Search results, autocomplete suggestions, total counts, and pagination metadata strictly omit unauthorized records.

### 3. Employee Scoping Isolation
- **Status**: [VERIFIED]
- **Behavior**: Users with role `employee` are further restricted to documents associated with their assigned projects (`assignedProjectIds`).

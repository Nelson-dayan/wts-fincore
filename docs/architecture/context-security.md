# Context Security Architecture

## Overview
Context Security guarantees that client-side state manipulation (headers, cookies, localStorage, URL query params) cannot bypass server-side multi-tenant authorization gates.

## Security Controls

### 1. Server-Side Context Verification
- **Status**: [VERIFIED]
- **Behavior**: The server never trusts client headers (`x-company-id`, `x-scope-mode`) blindly. The server validates that the requested company ID matches an authorized membership in the database for the session user.

### 2. Client Header Tampering Protection
- **Status**: [VERIFIED]
- **Test Case**: User assigned to Company A sends `x-company-id: Company-B-ID`.
- **Response**: Server rejects request with HTTP 403 / `COMPANY_ACCESS_DENIED`.

### 3. Scope Mode Downgrade / Stripping
- **Status**: [VERIFIED]
- **Behavior**: If an unauthorized user sends `x-scope-mode: group`, the server automatically strips scope to `single` mode and validates access strictly against assigned operating companies.

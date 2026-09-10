# Company Membership Model

## Overview
The Company Membership model defines how users are linked to operating entities within Sec-DocuTrade.

## Membership Specifications

### 1. Direct Assignment
- **Status**: [VERIFIED]
- **Behavior**: Users are linked to specific operating companies via the `companyIds` array in `UserModel`.
- **Enforcement**: Any request attempting to operate under `companyId` not present in `companyIds` (unless Super Admin or Group View authorized) is rejected with `COMPANY_ACCESS_DENIED`.

### 2. Company Context Switching
- **Status**: [VERIFIED]
- **Location**: `src/app/api/admin/auth/verify-company-switch/route.ts`
- **Behavior**: Switching active company context requires password verification modal. Password verification confirms user identity and validates that target company is present in user `companyIds`.
- **Security Rule**: Password verification MUST NEVER grant membership to an unassigned company. Attempts return `COMPANY_ACCESS_DENIED`.

### 3. Inactive Company Guard
- **Status**: [VERIFIED]
- **Behavior**: If a company status is set to `INACTIVE`, access attempts by non-super-admin users are rejected.

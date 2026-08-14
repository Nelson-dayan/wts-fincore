# Super Admin Model

## Overview
Super Admin is the highest privilege level in Sec-DocuTrade, intended for system administration and tenant management.

## Capabilities & Guardrails

### 1. Global System Access
- **Status**: [VERIFIED]
- **Behavior**: Super Admins bypass tenant company restrictions, allowing global visibility, search, context switching, and resource management across all active operating companies and groups.

### 2. Mandatory Audit Logging
- **Status**: [VERIFIED]
- **Location**: `src/lib/services/audit.service.ts` / `ActivityLogModel`
- **Behavior**: All administrative actions performed by Super Admin are logged with full detail (user ID, target company, action, timestamp, IP/session details).

### 3. Role Escalation Prevention
- **Status**: [VERIFIED]
- **Behavior**: Standard admins cannot assign themselves or others the `super_admin` role. User updates enforce role validation against current caller privileges.

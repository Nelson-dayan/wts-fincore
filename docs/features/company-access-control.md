# Feature Overview: Multi-Company Access Control

## Summary
The Multi-Company Access Control feature introduces enterprise-grade multi-tenant data isolation, hierarchical group visibility, password-gated company context switching, and centralized authorization (`authorizeResource`).

## Verification Matrix

| Area | Feature Description | Status |
| :--- | :--- | :--- |
| **Membership Scoping** | Users restricted to assigned company IDs | [VERIFIED] |
| **Group View** | Group Admins view descendant company records | [VERIFIED] |
| **IDOR Protection** | Direct resource access validated via `authorizeResource` | [VERIFIED] |
| **Search Isolation** | Search & global query results scoped to active tenant | [VERIFIED] |
| **Context Switch** | Password verification required for switching company context | [VERIFIED] |
| **Client Tampering** | Server rejects tampered headers and client state | [VERIFIED] |
| **Employee Scope** | Employee access limited to assigned project IDs | [VERIFIED] |
| **Super Admin** | System-wide visibility with activity logging | [VERIFIED] |

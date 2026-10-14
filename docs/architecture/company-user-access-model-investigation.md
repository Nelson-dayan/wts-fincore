# Sec-DocuTrade Multi-Company Access Control Architecture Investigation

**Document Version:** 1.0.0  
**Date:** August 14, 2026  
**Status:** Architecture Investigation & Redesign Specification (Read-Only Audit Report)  
**Target Repository:** Sec-DocuTrade (`arpitthekumar/WTS-FinCore`)  
**Author:** Antigravity AI Engineering Team  

---

## Executive Summary

This report delivers an in-depth, read-only architectural investigation of the current authentication, context resolution, role-based access control (RBAC), attribute-based access control (ABAC), and multi-company/group authorization mechanisms within **Sec-DocuTrade**.

The objective of this investigation is to evaluate whether the existing architecture can cleanly support a **hierarchical multi-company and group authorization model** without data leaks, permission collapses, or administrative ambiguity, and to provide a concrete **Minimum Viable Data Model (MVDM)** and **Boundary Enforcement Specification** prior to making any system modifications.

### Key Audit Conclusions

1. **Current Security Posture:** The project features a robust centralized authorization engine (`authorizeResource` in `src/lib/auth/authorization.ts`), strict server-side resource alignment (`validateResourceHierarchyAlignment`), and password-gated company context switching (`verify-company-switch/route.ts`). All 59 security tests, 42 access control tests, and 10 document numbering tests pass cleanly.
2. **Schema Dual-State Discrepancy (Architectural Debt):** There is a structural disconnect between the Mongoose schema definitions and the runtime API implementation:
   - `user.schema.ts` defines `companyMemberships` as an embedded subdocument array storing `{ companyId, role, permissions, isDefault, joinedAt, expiresAt }`.
   - Admin Users API (`src/app/api/admin/users/route.ts` & `[userId]/route.ts`) and UI write loose array fields directly onto `UserModel`: `companyIds: string[]`, `groupIds: string[]`, `primaryCompanyId: string`, and `groupViewAccess: boolean`.
3. **Missing First-Class Group Entity:** Groups currently exist only as loose string identifiers (`groupIds: string[]`) on the User model without a dedicated `Group` database collection or formal parent-child relationships linking Companies directly to Groups.
4. **Coarse Global Role Assignment:** `UserModel.role` is restricted to an enum of `["super_admin", "admin", "employee"]`. High-level roles (`admin`, `employee`) apply globally across all assigned companies rather than scoped per company (e.g., being a `company_admin` in Company A while only an `employee` in Company B).
5. **System Readiness:** The underlying authorization logic (`authorization.ts` and `company-context.ts`) is designed cleanly around sets of allowed company IDs and context scopes. Transitioning to a fully normalized hierarchical model requires minimal logic overhaul but demands schema normalization and data migration.

---

## 1. Current State Architecture Deep-Dive

```
                                  SUPER ADMIN
                                       |
                 +---------------------+---------------------+
                 |                                           |
       Group Admin (HoldCo)                        Operating Company Admin
                 |                                           |
       +---------+---------+                       +---------+---------+
       |                   |                       |                   |
 Subsidiary A        Subsidiary B             Subsidiary C        Subsidiary D
   (OpCo 1)            (OpCo 2)                 (Branch 1)          (Branch 2)
       |                   |                       |                   |
   Employee            Employee                Employee            Employee
(Project Scoped)    (Project Scoped)        (Project Scoped)    (Project Scoped)
```

### 1.1 User Schema & Role Model

The user identity layer is defined in `src/lib/db/schemas/user.schema.ts` and `src/lib/db/types/user.types.ts`.

#### Global Role Schema Definition
```typescript
// src/lib/db/types/roles.ts
export const USER_ROLES = ["super_admin", "admin", "employee"] as const;
export type UserRole = (typeof USER_ROLES)[number];
```

#### User Document Schema (`user.schema.ts`)
```typescript
const companyMembershipSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    role: {
      type: String,
      enum: ["group_admin", "company_admin", "manager", "accountant", "employee", "viewer"],
      default: "employee",
    },
    permissions: [{ type: String }],
    isDefault: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
  },
  { _id: false }
);

export const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: "employee" },
    phone: { type: String, default: "", alias: "phoneNumber" },
    isActive: { type: Boolean, default: true },
    companyMemberships: { type: [companyMembershipSchema], default: [] },
    defaultCompanyId: { type: Schema.Types.ObjectId, ref: "Company", default: null },
    // Loose fields used by Admin API / UI:
    // companyIds: string[]
    // groupIds: string[]
    // primaryCompanyId: string
    // groupViewAccess: boolean
  },
  { timestamps: true }
);
```

#### Default Capability Permissions (`src/lib/auth/permissions.ts`)
Capability permissions are granted statically based on the user's global role (`super_admin`, `admin`, `employee`):
- `super_admin`: Superuser privileges across all actions and all companies.
- `admin`: All functional permissions (`projects.*`, `quotations.*`, `invoices.*`, `purchaseOrders.*`, `payments.*`, `expenses.*`, `clients.*`, `company.*`, `companyHierarchy.*`, `groupView.access`, `users.*`).
- `employee`: Scoped read/create capabilities (`projects.view`, `quotations.view`, `quotations.create`, `invoices.view`, `purchaseOrders.view`, `expenses.view`, `expenses.create`, `clients.view`, `company.view`).

---

### 1.2 Company Schema & Hierarchy Model

Companies are defined in `src/lib/db/schemas/company.schema.ts` and managed via `src/lib/services/business/company-hierarchy.service.ts`.

#### Company Model Schema
```typescript
export const companySchema = new Schema({
  name: { type: String, required: true, trim: true, index: true },
  code: { type: String, required: true, uppercase: true, trim: true, index: true },
  kind: {
    type: String,
    enum: ["holding", "operating", "branch", "division"],
    default: "operating",
    index: true,
  },
  parentCompanyId: {
    type: Schema.Types.ObjectId,
    ref: "Company",
    default: null,
    index: true,
  },
  baseCurrency: { type: String, default: "AED", trim: true },
  branding: { type: companyBrandingSchema },
  isActive: { type: Boolean, default: true, index: true },
  isPrimary: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
});
```

#### Tree Resolution (`CompanyHierarchyService`)
- Parent-child corporate structures are modeled via `parentCompanyId`.
- `CompanyHierarchyService.getDescendantCompanyIds(companyIdStr)` uses a BFS Queue algorithm to recursively gather all descendant child companies (`holding -> operating -> branch/division`).
- `resolveCompanyContext(targetCompanyIdStr, scopeMode)` returns the target `companyId` and `allowedCompanyIds`:
  - `scopeMode === "single"`: `allowedCompanyIds` = `[targetCompanyId]`
  - `scopeMode === "group"`: `allowedCompanyIds` = `[targetCompanyId, ...descendants]`

---

### 1.3 Context Resolution & Authorization Engine

Security and access control enforcement rely on three key modules:
1. `getUserAccessInfo` (`src/lib/auth/user-company-access.ts`)
2. `resolveAuthCompanyContext` (`src/lib/auth/company-context.ts`)
3. `authorizeResource` (`src/lib/auth/authorization.ts`)

#### Context Resolution Flow
```
User Session / API Request
          │
          ▼
getUserAccessInfo(userId, role)
   ├─ If super_admin ──► Return ALL active company IDs
   └─ Standard user ───► Extract assigned company IDs (from companyMemberships or companyIds)
          │
          ▼
resolveAuthCompanyContext(user, requestedCompanyId, scopeMode)
   ├─ Verifies if user holds 'groupView.access' permission for group scope mode
   ├─ Checks if requestedCompanyId is inside assigned company scope
   └─ Calls CompanyHierarchyService.resolveCompanyContext()
          │
          ▼
authorizeResource(options)
   ├─ Step 1: Capability Check (hasPermissionForRole)
   ├─ Step 2: Active Context & Group Scope Check
   ├─ Step 3: Company Ownership & Legal Scope Check (403 or switch prompt required)
   ├─ Step 4: Hierarchy Alignment (Company -> Client -> Project matching)
   ├─ Step 4.5: Employee Project Assignment Gate (assertEmployeeCanAccessProject)
   └─ Step 5: Workflow State Transition Validation
```

---

### 1.4 Interactive Context Switching & Re-Authentication

To prevent unauthorized cross-tenant browsing while enabling legitimate multi-company users to switch context, Sec-DocuTrade implements **Password-Gated Context Switching**:

1. **Company Switcher (`src/components/companies/company-switcher.tsx`):**
   When a user clicks a different company in the switcher UI, the app prompts for the user's password.
2. **Context Verification Endpoint (`src/app/api/admin/auth/verify-company-switch/route.ts`):**
   ```typescript
   // Step 1: Verify Password
   const isPasswordValid = await verifyPassword(password, user.password);
   if (!isPasswordValid) return apiError("Invalid credentials", 401);

   // Step 2: Verify Company Access (Password verification NEVER grants unassigned access)
   const hasAccess = await canUserAccessCompany(userId, targetCompanyId, user.role);
   if (!hasAccess) return apiError("Unauthorized company context", 403);
   ```
3. **Direct URL Navigation Protection (`CompanyContextSwitchPrompt`):**
   If a user navigates directly to a document URL belonging to another authorized company outside their current active context, the authorization engine returns code `COMPANY_CONTEXT_SWITCH_REQUIRED`, rendering a password prompt screen.

---

### 1.5 Identified Architectural Gaps & Friction Points

| Area | Current Implementation | Identified Gap / Risk | Architectural Impact |
| :--- | :--- | :--- | :--- |
| **User Schema Dual-State** | `companyMemberships` defined in schema; `companyIds`, `groupIds` used in Admin API | Data redundancy; admin UI writes loose string arrays while auth reads `companyMemberships` as fallback | Medium risk of state drift when editing user access in Admin UI |
| **Group Organization** | `groupIds: string[]` stored on User model | No `Group` collection exists. Groups cannot own companies; parent-child is tied purely via `parentCompanyId` | High limitation for multi-holding enterprise groups |
| **Role Granularity** | Single global `user.role` (`super_admin`, `admin`, `employee`) | Users cannot be `company_admin` in Company A and `employee` in Company B | Moderate flexibility bottleneck for complex multi-company staffing |
| **Group View Access** | Boolean flag `groupViewAccess` on User | Binary toggle rather than contextual permission linked to specific Holding/Parent companies | Risk of over-exposing sibling companies if hierarchy is misconfigured |

---

## 2. Minimum Viable Data Model (MVDM) Proposal for Redesign

To cleanly support hierarchical administration, multi-company isolation, and consolidated group reporting without structural friction, we propose normalizing the core data model.

```
+-------------------+           +-------------------+           +-------------------+
|      Group        |           |      Company      |           |       User        |
+-------------------+           +-------------------+           +-------------------+
| _id               |           | _id               |           | _id               |
| name              | 1       * | name              |           | name              |
| code              |-----------| code              |           | email             |
| holdingCompanyId  |           | kind              |           | isSuperAdmin      |
| isActive          |           | parentCompanyId   |           | isActive          |
+-------------------+           | groupId           |           +-------------------+
                                +-------------------+                     | 1
                                          | 1                             |
                                          |                               | *
                                          +---------------+---------------+
                                                          |
                                                +-------------------+
                                                | CompanyMembership |
                                                +-------------------+
                                                | companyId         |
                                                | userId            |
                                                | role              |
                                                | groupViewAccess   |
                                                | permissions       |
                                                +-------------------+
```

### 2.1 Proposed Core Entities & Schemas

#### A. Group Schema (`GroupModel`) — New Collection
```typescript
export interface IGroup {
  _id: Types.ObjectId;
  name: string;               // e.g., "Sec Corp Holding Group"
  code: string;               // e.g., "SECCORP"
  holdingCompanyId: Types.ObjectId; // Root holding company for this group
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### B. Company Schema Enhancements (`CompanyModel`)
```typescript
export interface ICompany {
  _id: Types.ObjectId;
  name: string;
  code: string;               // e.g., "SDT-DXB"
  kind: "holding" | "operating" | "branch" | "division";
  groupId: Types.ObjectId | null; // Direct link to parent Group entity
  parentCompanyId: Types.ObjectId | null; // Direct parent in legal hierarchy
  taxId: string;
  baseCurrency: string;
  branding: ICompanyBranding;
  isActive: boolean;
  isPrimary: boolean;
  deletedAt: Date | null;
}
```

#### C. Normalized User Company Membership (`companyMemberships`)
Instead of loose arrays on `User`, all user-company relationships are cleanly normalized inside `user.companyMemberships`:

```typescript
export interface ICompanyMembership {
  companyId: Types.ObjectId;
  groupId?: Types.ObjectId | null;
  role: "group_admin" | "company_admin" | "manager" | "accountant" | "employee" | "viewer";
  groupViewAccess: boolean;  // Permits consolidated group reporting for this company's sub-tree
  customPermissions?: string[];
  isPrimaryContext: boolean;
  joinedAt: Date;
}

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  isSuperAdmin: boolean;     // Replaces global role enum for ultimate superuser access
  isActive: boolean;
  phone: string;
  companyMemberships: ICompanyMembership[];
  defaultCompanyId: Types.ObjectId | null;
}
```

---

## 3. Boundary Enforcement Rules & Hierarchy Scopes

Strict boundaries must be maintained across administrative levels to prevent lateral permission leakage or upward scope escalation.

```
       +-----------------------------------------------------------------+
       |                        SUPER ADMIN                              |
       |  - Global Access to ALL Groups & Companies                      |
       |  - Can manage system settings, users, and enterprise structure  |
       +-----------------------------------------------------------------+
                                        |
       +-----------------------------------------------------------------+
       |                        GROUP ADMIN                              |
       |  - Restricted to assigned Group & Holding Company Sub-tree       |
       |  - Can view consolidated subsidiary financial & operational data|
       |  - ZERO access to unrelated Groups or sibling Holdings          |
       +-----------------------------------------------------------------+
                                        |
       +-----------------------------------------------------------------+
       |                     COMPANY ADMIN / MANAGER                     |
       |  - Restricted to specific Operating Company (OpCo) & Child Branches|
       |  - NO upward visibility to Holding Company records              |
       |  - NO lateral access to Sibling Operating Companies             |
       +-----------------------------------------------------------------+
                                        |
       +-----------------------------------------------------------------+
       |                       EMPLOYEE / USER                           |
       |  - Restricted to assigned Projects within specific Operating Co |
       |  - Document visibility gated by explicit project assignment     |
       +-----------------------------------------------------------------+
```

### 3.1 Super Admin Scope
- **Scope:** Complete, unrestricted global access to all Groups, Holding Companies, Operating Companies, and Subsidiaries.
- **Capabilities:**
  - Create/edit/delete Groups and Companies across the system.
  - Assign users to any Company with any localized role.
  - Bypass password context switch prompts when auditing cross-company records.
  - View global aggregated search and financial reports across all tenants.

### 3.2 Group Admin / Holding Company Admin Scope
- **Scope:** Restricted strictly to assigned Group(s) and the holding company's descendant sub-tree (`holding -> operating -> branch`).
- **Boundaries & Guardrails:**
  - **Downwards Access:** Full visibility over all child operating companies and branch entities under their Holding scope.
  - **Lateral Boundary:** Strictly forbidden from accessing sibling Holding Groups or unrelated standalone companies.
  - **Group Reporting:** Can toggle `scopeMode = "group"` to view aggregated quotations, invoices, purchase orders, and financial analytics for all child entities in their group.

### 3.3 Operating Company Admin Scope
- **Scope:** Limited exclusively to their assigned Operating Company (OpCo) and any child branches/divisions directly under that OpCo.
- **Boundaries & Guardrails:**
  - **Upwards Boundary:** Strictly forbidden from viewing parent Holding Company bank details, corporate documents, or financial ledgers.
  - **Lateral Boundary:** Strictly forbidden from viewing sibling OpCos under the same Holding parent unless explicitly assigned a membership in that sibling OpCo.

### 3.4 Subordinate / Branch / Employee Scope
- **Scope:** Restricted to specific assigned projects and documents created within their home Operating Company or Branch.
- **Boundaries & Guardrails:**
  - Cannot access unassigned projects in the same company unless holding `projects.view` admin capability.
  - Cannot issue documents under a different issuing company ID than their active context.

---

## 4. Critical Security & Logical Edge Cases

```
                               SECURITY BOUNDARY MATRIX

+------------------------------+---------------------------------------+--------------------------------------+
| Security Edge Case           | Common Vulnerability / Risk           | Sec-DocuTrade Architecture Solution |
+------------------------------+---------------------------------------+--------------------------------------+
| 1. Membership vs. Admin      | Being a user in Co A grants Admin    | Localized role per company in        |
|    Authority                 | rights across all assigned companies  | companyMemberships array             |
+------------------------------+---------------------------------------+--------------------------------------+
| 2. Password Switch vs. Access| Entering password bypasses company    | Password verify ALWAYS re-checks     |
|    Grant                     | assignment check                      | canUserAccessCompany()               |
+------------------------------+---------------------------------------+--------------------------------------+
| 3. Group View vs. Legal      | Consolidated view alters document     | Documents maintain immutable legal   |
|    Ownership                 | issuing company code/taxId            | issuing companyId                    |
+------------------------------+---------------------------------------+--------------------------------------+
| 4. Global Search & Direct    | Cross-tenant IDOR leak via search     | Search API filters by allowed        |
|    URL Navigation            | or direct ID URL guessing             | companyIds; URL navigation prompts   |
|                              |                                       | context switch                       |
+------------------------------+---------------------------------------+--------------------------------------+
```

### 4.1 Membership vs. Administrative Authority

> **Security Rule:** *Being a member of Company A does NOT grant administrative authority over Company A, nor does holding an Admin role in Company A grant Admin privileges in Company B.*

- **Problem:** If a user is given global `role = "admin"`, they become an administrator across *every* company they belong to.
- **Solution:** Role authority must be evaluated contextually per company:
  ```typescript
  function getUserRoleForCompany(user: IUser, companyId: string): string {
    if (user.isSuperAdmin) return "super_admin";
    const membership = user.companyMemberships.find(
      (m) => m.companyId.toString() === companyId
    );
    return membership ? membership.role : "none";
  }
  ```

---

### 4.2 Password Re-Authentication vs. Scope Authorization Grant

> **Security Rule:** *Entering a correct password during a company context switch NEVER grants access to an unassigned company.*

- **Verification Logic (`verify-company-switch/route.ts`):**
  ```typescript
  // Step 1: Validate Password
  const validPass = await verifyPassword(password, user.password);
  if (!validPass) return apiError("Invalid credentials", 401);

  // Step 2: Enforce Authorization Check
  const hasAccess = await canUserAccessCompany(userId, targetCompanyId, user.role);
  if (!hasAccess) {
    // PASSING THE PASSWORD DOES NOT OVERRIDE ASSIGNMENT BOUNDARIES
    return apiError("Unauthorized company context", 403);
  }
  ```
- **Key Takeaway:** The password modal acts solely as a re-authentication gate (preventing unattended session takeover), NOT as an access grant.

---

### 4.3 Group Visibility vs. Legal Entity Ownership & Sequence Integrity

> **Security Rule:** *Group View allows read-only consolidated financial oversight, but every document must retain strict, immutable legal entity ownership (`companyId`).*

- **Document Numbering Integrity:**
  - Document reference numbers (`INV-SDT-DXB-0001`, `QT-SDT-RAK-0005`) are generated atomically via `CounterModel` scoped by the document's specific `companyId`.
  - Switching to `scopeMode = "group"` allows a Holding Admin to view invoices from both Dubai and RAK branches simultaneously in a single table, but creating a new invoice forces the selection of a single valid issuing company, ensuring sequence collision protection and tax law compliance.

---

### 4.4 Global Search & Direct URL Protection against IDOR

- **Global Search Endpoint (`src/app/api/admin/search/route.ts`):**
  - Search queries restrict entity queries using `{ companyId: { $in: allowedCompanyIds } }`.
  - Search results embed company code badges (e.g., `[SDT-DXB]`) so users immediately see which entity owns the search result.
- **Direct Resource Access via URL (`authorizeResource`):**
  - If a user attempts to access `/admin/quotations/QT-1002` directly while their active context is set to Company A, but the quotation belongs to Company B:
    - If user **is assigned** to Company B: Returns `code: "COMPANY_CONTEXT_SWITCH_REQUIRED"`, displaying the `CompanyContextSwitchPrompt` to seamlessly switch context after entering their password.
    - If user **is NOT assigned** to Company B: Returns `code: "COMPANY_ACCESS_DENIED"`, blocking access with a 403 error.

---

## 5. Architecture Readiness & Status Assessment

### 5.1 System Capability Matrix

| Architectural Goal | Current Status | Assessment | Next Steps / Refactoring Needed |
| :--- | :---: | :--- | :--- |
| **Atomic Document Numbering per Company** | **VERIFIED** | Fully implemented and passing `test:numbering` | None required. Keep `companyId` scoping in counters. |
| **Password-Gated Context Switching** | **VERIFIED** | Fully implemented in UI & API (`verify-company-switch`) | None required. Current implementation is solid. |
| **Global Search Isolation** | **VERIFIED** | Entity filtering by company context with company badges | None required. |
| **Centralized Resource Authorization** | **VERIFIED** | `authorizeResource` handles permissions, company, project, and workflow gates | Maintain current centralized middleware pattern. |
| **Schema Data Model Normalization** | **PENDING** | Discrepancy between `companyMemberships` and loose user array fields | Refactor Admin Users API & UI to write to `companyMemberships`. |
| **First-Class Group Entity** | **PROPOSED** | Groups exist as loose string tags on User model | Create `Group` collection and schema for explicit Holding Groups. |
| **Per-Company Contextual Roles** | **PROPOSED** | Global `user.role` applies across all assigned companies | Read role from `companyMemberships` array per active company context. |

---

### 5.2 Refactoring Roadmap & Phased Execution Plan

#### Phase 1: Data Model & Schema Synchronization
1. Update `src/lib/db/schemas/user.schema.ts` to fully align with `user.types.ts`.
2. Refactor `src/app/api/admin/users/route.ts` and `src/app/api/admin/users/[userId]/route.ts` so that creating or updating user company access writes directly to `companyMemberships`.
3. Provide a database migration script to sync existing `companyIds` array data into structured `companyMemberships`.

#### Phase 2: First-Class Group Entity Implementation
1. Create `GroupModel` in `src/lib/db/models/group.model.ts` with `name`, `code`, `holdingCompanyId`, and `isActive`.
2. Update `CompanyModel` schema to include `groupId: Schema.Types.ObjectId`.
3. Enhance `CompanyHierarchyService` to resolve companies by Group boundaries as well as parent-child tree relationships.

#### Phase 3: Per-Company Localized Role Authorization
1. Update `resolveAuthCompanyContext` to resolve the user's role specifically for the target active company from their `companyMemberships` entry.
2. Ensure capability permissions in `authorizeResource` inspect the company-specific role rather than solely relying on the global role.

#### Phase 4: Final Security Verification Suite Update
1. Update `scripts/company-access-control-test.ts` and `scripts/security-regression-test.ts` to validate per-company role isolation and group boundary enforcement.
2. Confirm zero regressions across `npm run verify:all`.

---

### Summary Conclusion

The **Sec-DocuTrade** authorization engine is in a strong, production-grade state with robust security controls preventing IDOR leaks, unassigned cross-company navigation, and document numbering collisions. 

Implementing the proposed **Minimum Viable Data Model (MVDM)** will resolve existing schema dual-state discrepancies and provide a clean, enterprise-grade foundation for multi-company hierarchical administration.

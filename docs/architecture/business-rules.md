# Sec-DocuTrade — The 10 Inviolable Business Rules & Architecture Contracts

> **CRITICAL ARCHITECTURAL GUARANTEE**  
> These 10 business rules represent the non-negotiable core invariants of the Sec-DocuTrade ERP platform. No feature, refactoring, API endpoint, or UI component may bypass or violate these rules under any circumstances.

---

### Rule 1: Group View is Visibility Only
`Group View` (`requestedScopeMode = "group"`) provides consolidated read-only visibility across a corporate holding hierarchy. **Group View NEVER grants entity ownership.** You cannot create financial documents, allocate payments, or execute legal actions in Group View without specifying an explicit single operating `companyId`.

### Rule 2: Single Legal Owning Company
Every financial document (`Quotation`, `PurchaseOrder`, `Invoice`, `Expense`, `Payment`) must have **exactly one legal owning company** (`companyId`). Cross-company hybrid ownership or unowned entities are strictly rejected at both schema and authorization boundaries.

### Rule 3: Server-Side Context Derivation
The active `companyId` context is strictly derived from the authenticated session and validated JWT tokens on the server. **Clients cannot inject or override `companyId` parameters** in request bodies or URL paths to bypass legal boundary isolation.

### Rule 4: Project Determines Client + Owning Company
When a financial document is linked to a `projectId`, the project's owning `companyId` and `clientId` determine the valid legal context for that document. Linking a Quotation or Invoice belonging to Company B to a Project belonging to Company A is hard-blocked.

### Rule 5: Employee Access Through Explicit Project Assignment
Non-admin employees (`role = "employee"`) can only access data belonging to projects where they are explicitly assigned in `project.assignedMembers`. Unassigned employees receive empty datasets for project-scoped operations.

### Rule 6: Permissions Determine Capability (RBAC)
Role capabilities (e.g., `quotations.approve`, `invoices.issue`, `expenses.reject`) gate whether an action is allowed. Having visibility into an entity does NOT grant permission to mutate or transition its state.

### Rule 7: Scope Context Determines Visibility
User scope mode (`single` vs `group` vs `employee`) determines which entities are returned in list and aggregation queries. Single mode filters strictly to `activeCompanyId`; Group mode filters recursively to authorized descendant companies; Employee mode filters to assigned project IDs.

### Rule 8: Workflow State Locks (Terminal & Sequential Enforcement)
Financial entities follow strict sequential lifecycle state transitions. Once an entity enters a terminal or locked state (e.g., `APPROVED` Quotation, `PAID` Invoice, `APPROVED` Expense), non-terminal mutations, edits, and re-approvals are hard-blocked to prevent duplicate records or financial discrepancies.

### Rule 9: Immutable Historical Document Snapshots
All financial documents store immutable `clientSnapshot` and `companySnapshot` objects at creation time. Subsequent updates to client addresses, tax IDs, or company branding do NOT mutate historical invoice or quotation snapshots.

### Rule 10: Approved and Paid Documents Cannot Be Casually Modified
Approved Purchase Orders, Issued/Sent Invoices, and Paid Transactions are financial records. Reverting or deleting them requires explicit exception workflows (e.g., formal Credit Note, Voiding with Audit Log entry, or Cancellation with permission check).

---

## Rule Enforcement Matrix

| Rule | Enforcement Layer | Primary Guard File |
| :--- | :--- | :--- |
| **1. Group Visibility** | Auth & Controller | `src/lib/auth/company-context.ts` |
| **2. Single Legal Owner** | Mongoose Schema & API | `src/lib/db/schemas/*.schema.ts` |
| **3. Server Context** | Session Middleware | `src/lib/auth/authorization.ts` |
| **4. Project Alignment** | Resource Validation | `src/lib/auth/resource-access.ts` |
| **5. Employee Assignment** | Scope Resolver | `src/lib/auth/company-context.ts` |
| **6. Capability RBAC** | Permission Matrix | `src/lib/auth/permissions.ts` |
| **7. Context Visibility** | Authorization Engine | `src/lib/auth/authorization.ts` |
| **8. State Locks** | Workflow Guard | `src/lib/auth/authorization.ts` |
| **9. Document Snapshots** | Document Schemas | `src/lib/db/schemas/quotation.schema.ts` |
| **10. Immutable Audit** | Database & Audit | `src/lib/db/models/activity-log.model.ts` |

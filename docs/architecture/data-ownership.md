# Sec-DocuTrade — Enterprise Data Ownership & Scope Isolation Specification

> **Document Version:** 1.0.0  
> **Classification:** Architecture Standard & Security Protocol  
> **Core Rule:** `companyId` MUST NEVER be trusted from a child-document payload; it MUST be resolved from parent document / legal ownership context.

---

## 1. Domain Ownership Hierarchy

```text
GROUP
 = Visibility & Aggregation Scope (Cross-Entity Reporting)
   │
   ▼
COMPANY
 = Legal Ownership & Billing Entity (Holds TRN/Tax ID, Bank Details, Currency)
   │
   ▼
CLIENT
 = Commercial Relationship (Belongs to Company)
   │
   ▼
PROJECT
 = Operational Workspace (Belongs to Client & Company)
   │
   ├── QUOTATION (Commercial Proposal)
   │      │
   │      └── PURCHASE ORDER (Financial Commitment)
   │             │
   │             └── INVOICE (Receivable & Revenue Document)
   │                    │
   │                    └── PAYMENT (Settlement Record)
   │
   └── EXPENSE (Project Operational Cost)
```

---

## 2. Fundamental Ownership Principles

### Rule 1: Legal Entity Binding (`companyId`)
Every document (Quotation, PO, Invoice, Expense, Payment) is legally owned by exactly ONE `companyId`.
- An Invoice created under a Purchase Order MUST inherit the `companyId` of the parent PO and parent Project.
- Attempting to pass a mismatched `companyId` in the body payload MUST result in a `RESOURCE_COMPANY_MISMATCH` validation error.

### Rule 2: Client Scope Binding (`clientId`)
A Project belongs to a specific Client. All quotations and invoices for that project inherit the `clientId` of the project. Passing an unrelated `clientId` MUST be rejected with `RESOURCE_CLIENT_MISMATCH`.

### Rule 3: Single vs. Group View Isolation
- **Single Entity Context:** Users viewing the system in Single Entity mode only receive data where `companyId === activeCompanyId`.
- **Group View Mode:** Group administrators with the `groupView.access` capability receive consolidated metrics across all descendant entities under their holding tree.

### Rule 4: Employee Workspace Restrictions
Employees only have access to Projects explicitly assigned to them via project contact/member assignments. Attempting to fetch or manipulate unassigned projects returns `PROJECT_ACCESS_DENIED`.

---

## 3. Data Integrity & State Lock Rules

1. **Quotation Lock:** Once a Quotation is `APPROVED`, its items, pricing, and companyId are locked against edits.
2. **Invoice Lock:** Once an Invoice is `ISSUED`, `SENT`, or `PAID`, key financial totals and legal issuer details are permanently immutable.
3. **Payment Integrity:** Incoming payments automatically adjust the target invoice's `paymentStatus` (`UNPAID` → `PARTIAL` → `PAID`) via transactional totals recalculation.

---

## 4. Audit & Compliance Triggers

Every state change across all entities fires an immutable record in `ActivityLogModel` recording:
- `companyId`
- `userId` & `userName`
- `action` (e.g. `INVOICE_ISSUED`, `PAYMENT_RECORDED`, `QUOTATION_APPROVED`)
- `entityType` & `entityId`
- `details` snippet

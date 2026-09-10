# Group Access Model

## Overview
The Group Access Model governs hierarchical visibility and legal ownership across parent/subsidiary corporate structures.

## Core Rules

### 1. Hierarchy & Parent-Child Traversal
- **Status**: [VERIFIED]
- **Behavior**: Corporate entities form a directed acyclic tree (`parentCompanyId`). Group Admins assigned to a parent holding company with `groupView.access: true` can view aggregated data across subsidiary companies.

### 2. Visibility vs Legal Ownership Distinction
- **Status**: [VERIFIED]
- **Rule**:
  - **Group View = VISIBILITY ONLY**. Enables reading records across descendant companies.
  - **Operating Company = LEGAL OWNERSHIP**. Every created transactional document (Quotation, Invoice, Purchase Order, Expense) MUST resolve to a single concrete legal company.
  - **Prohibition**: Creating documents owned by `companyId = GROUP` is strictly forbidden and rejected with `RESOURCE_COMPANY_MISMATCH`.

### 3. Single Mode vs Group Mode Context
- **Status**: [VERIFIED]
- **Behavior**: When operating in `single` context mode, sibling/child resources require explicit context switch. In `group` mode, authorized Group Admins can read descendant records while write actions enforce exact operating company target matching.

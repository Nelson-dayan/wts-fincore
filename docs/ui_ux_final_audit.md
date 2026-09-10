# Sec-DocuTrade Enterprise UI/UX Final Audit & Design System Specification

## Overview & Architecture Goals
This document serves as the final audit report and technical design specification for the **Sec-DocuTrade** Enterprise ERP Platform UI/UX overhaul. The platform has been standardized into a unified, high-density SaaS design language (modeled after Linear and Stripe) to ensure consistent operational clarity, visual dignity, and financial accuracy.

---

## Unified Design Tokens & Systems

### 1. Typography & Hierarchy
* **Font Family**: Inter (System sans-fallback) with Monospace (`font-mono`) reserved for document references, currency figures, timestamps, and status labels.
* **Scale**:
  * **Page Titles**: `text-2xl` / `text-3xl` (`font-bold tracking-tight`)
  * **Section Headers**: `text-base` (`font-bold`)
  * **Card Titles**: `text-sm` / `text-base` (`font-bold`)
  * **Body Text**: `text-xs` / `text-sm` (`text-foreground` or `text-muted-foreground`)
  * **Table Headers & Eyebrows**: `text-[11px]` / `text-xs` (`font-mono font-semibold uppercase tracking-wider text-muted-foreground`)

### 2. Spacing & Density System
* **Grid Baseline**: 4px / 8px scale.
* **Component Padding**:
  * **Compact Buttons / Inputs**: `h-8 px-3 text-xs` or `h-9 px-3.5 text-xs`
  * **Table Rows**: `px-5 py-3.5` with tabular figures
  * **Cards**: `p-5` or `p-6` with standard header separators (`border-b border-border/60`)
  * **Page Container**: `space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`

### 3. Financial & Numeric Standards
* **Formatter Utility**: Standardized via `@/lib/utils/formatters.ts` (`formatCurrency`, `formatDate`, `formatNumber`).
* **Currency Code**: Default `AED` (United Arab Emirates Dirham) across all commercial proposals, invoices, profitability reports, and budget ledgers.
* **Styling**: `font-mono font-bold tabular-nums` used strictly for all monetary figures to guarantee column alignment across table rows.

### 4. Semantic Status Badge System
Standardized via `@/components/ui/status-badge.tsx`:
* **Success** (`PAID`, `APPROVED`, `ACTIVE`, `COMPLETED`, `PRIMARY`): `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20`
* **Warning** (`PARTIAL`, `PENDING`, `DRAFT`, `IN_PROGRESS`, `TECHNICAL`, `BILLING`): `bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20`
* **Danger** (`OVERDUE`, `DECLINED`, `REJECTED`, `CANCELLED`, `INACTIVE`): `bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20`
* **Info** (`SENT`, `PROCESSING`, `NEW`, `FINANCE`, `PROJECT_MANAGER`, `APPROVER`): `bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20`
* **Neutral**: `bg-muted text-muted-foreground border-border/80`

### 5. Table & List Grids
Standardized via `@/components/portals/shared/resource-table-client.tsx`:
* High-density border alignment (`border-border/60`).
* Dynamic search & instant client/server pagination.
* Accessible empty states & skeleton loading skeletons.

---

## Screen Audit & Verification Results

| Screen Route | Layout Density | Status Badge Alignment | Currency Formatting | Verification Status |
| :--- | :---: | :---: | :---: | :---: |
| `/admin` (Dashboard) | Standardized | Unified | AED (`formatCurrency`) | Passed |
| `/admin/projects` | High Density | Unified (`StatusBadge`) | AED (`formatCurrency`) | Passed |
| `/admin/quotations` | High Density | Unified (`ResourceTable`) | AED (`formatCurrency`) | Passed |
| `/admin/invoices` | High Density | Unified (`ResourceTable`) | AED (`formatCurrency`) | Passed |
| `/admin/clients` | High Density | Unified | Standardized | Passed |
| `/admin/profitability` | Executive | Unified (`StatusBadge`) | AED (`formatCurrency`) | Passed |
| `/quotation/[id]` (Public) | Customer Portal | Unified (`StatusBadge`) | AED (`formatCurrency`) | Passed |

---

## Governance & Developer Instructions
1. **Never hardcode currency strings**: Always import `formatCurrency` from `@/lib/utils/formatters`.
2. **Never inline custom badge styling**: Always use `<StatusBadge status={item.status} />`.
3. **Keep Table Views Dense**: Use standard heights (`h-8` inputs, `h-8` buttons) for data-heavy administrative surfaces.

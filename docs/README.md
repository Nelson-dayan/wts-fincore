# Sec-DocuTrade — Enterprise ERP Developer Guide

Welcome to the **Sec-DocuTrade Platform**. This master onboarding guide provides an architectural overview, directory layout, security contracts, data flow models, testing procedures, and deployment guidelines for developers working on the codebase.

---

## 📚 Master Documentation Map

```text
Sec-DocuTrade Documentation
│
├── Architecture & Security
│   ├── Access Control Architecture ──────────────── docs/architecture/access-control.md
│   ├── Company Membership Model ─────────────────── docs/architecture/company-membership-model.md
│   ├── Group Access Model ───────────────────────── docs/architecture/group-access-model.md
│   ├── Super Admin Model ───────── docs/architecture/super-admin-model.md
│   ├── Context Security Architecture ────────────── docs/architecture/context-security.md
│   ├── Company Data Isolation ───────────────────── docs/security/company-isolation.md
│   ├── Business Rules (Inviolable Contracts) ───── docs/architecture/business-rules.md
│   └── Data Ownership & Legal Hierarchy ─────────── docs/architecture/data-ownership.md
│
├── Database & Schemas
│   └── Schema Overview & Relationships ───────────── docs/database/schema-overview.md
│
├── Modules & Feature Completeness (26 Specs)
│   ├── Multi-Company Access Control Feature ─────── docs/features/company-access-control.md
│   ├── Feature Matrix Summary ────────────────────── docs/feature-completeness-matrix.md
│   └── Individual Feature Specifications ────────── docs/features/*.md
│
├── Operations & Recovery
│   ├── System Recovery & Backup SOP ──────────────── docs/sop/recovery-sop.md
│   ├── Production Deployment & Rollback SOP ──────── docs/sop/production-deployment.md
│   └── RC Manual Acceptance Checklist ────────────── docs/rc-manual-acceptance-checklist.md
│
└── QA & Production Verification
    ├── Verification Summary Report ───────────────── docs/production-readiness-verification-summary.md
    └── Release Candidate Formal Sign-Off ─────────── docs/rc-signoff.md
```

---

## 🚀 Quick Start for Developers

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **Database**: Local or Cloud MongoDB (`MONGODB_URI` in `.env`)
- **Package Manager**: `npm`

### 2. Environment Setup
Copy `.env.example` to `.env` and ensure the database URI is configured:
```bash
MONGODB_URI=mongodb://localhost:27017/sec-docutrade
JWT_SECRET=your-secure-jwt-secret-key
```

### 3. Development Server
Start the Next.js development server:
```bash
npm run dev
```
Navigate to `http://localhost:3000`.

---

## 🛡️ Testing & QA Verification Suite

The repository contains automated test suites that enforce multi-company security, database integrity, API contracts, real user workflows, and performance benchmarks.

| Command | Purpose | Focus Area |
| :--- | :--- | :--- |
| `npm run test:security` | Authorization Matrix | 59 RBAC & Context Scope Isolation Tests |
| `npm run test:integrity` | Database Contracts | Cross-Company & Orphan Reference Tests |
| `npm run test:api` | Backend API Health | Boundary & Payload Validation Tests |
| `npm run test:e2e` | Phase 9 Real Workflows | Admin, Employee, Group, Public E2E Scenarios |
| `npm run test:performance` | Performance Audit | Query execution benchmarks on isolated synthetic data |
| `npm run verify:all` | **Complete Release Gate** | Executes ALL 5 test suites + TypeScript + Production Build |

> ⚠️ **Test Isolation Protection**: Synthetic performance data uses the `PERF-` prefix and QA tests use `TEST-`. These scripts are non-destructive and will never mutate or erase your primary development sample data.

---

## 🏗️ Core Architecture Concepts

### 1. Central Authorization Engine (`src/lib/auth/`)
- `permissions.ts`: Capability-based RBAC matrix (`hasPermissionForRole`).
- `company-context.ts`: Multi-company scope resolution (`single`, `group`, `employee`).
- `authorization.ts`: Workflow state transition guards (`canTransitionWorkflowState`).

### 2. Financial Document Lifecycle
```text
DRAFT ──> ISSUED ──> SENT ──> PAID
                     │
                     └──> VOID (Terminal Exception)
```
Once a financial document is `PAID` or `APPROVED`, state transition guards prevent non-terminal mutations or duplicate PO creation.

---

## 📦 Deployment Protocol

Refer to `.cursor/rules` / project policy:
- **Git is the Source of Truth.**
- Always run `npm run verify:all` before submitting pull requests or preparing release packages.

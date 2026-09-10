# Sec-DocuTrade — End-to-End Business Workflow Verification

> **Scope:** Core financial workflows across Admin, Employee, and Client personas.

---

## Verified End-to-End Workflows

### 1. Proposal to Cash Workflow

```text
Admin / Employee Creates Quotation (DRAFT)
  │
  ▼
Send Quotation to Client (SENT)
  │
  ▼
Client Views & Accepts in Public Portal (APPROVED)
  │
  ▼
Convert Quotation to Purchase Order (ACTIVE)
  │
  ▼
Generate Invoice from Purchase Order (DRAFT)
  │
  ▼
Issue Invoice (ISSUED)
  │
  ▼
Send Invoice to Client (SENT)
  │
  ▼
Record Client Payment Settlement (PARTIAL / PAID)
  │
  ▼
Invoice State Auto-Locks as PAID & Profitability Updated
```

- **Quotation State Transitions:** `DRAFT` → `SENT` → `APPROVED` / `DECLINED`.
- **Purchase Order Creation:** Inherits line items, project context, and company branding from approved quotation.
- **Invoice State Transitions:** `DRAFT` → `ISSUED` → `SENT` → `PAID`. (Voiding is controlled terminal state).
- **Payment Application:** Incoming payments update invoice `paymentStatus` and recalculate project profitability in real time.

---

## 2. Multi-Company & Group Rollup Workflow

1. **Company Switcher:** Changing active entity in navbar immediately updates context to selected company (`companyContextChanged` event).
2. **Group View Aggregation:** Switching to Group View displays consolidated financial rollups across holding and operating entities without exposing unauthorized cross-company mutation capabilities.

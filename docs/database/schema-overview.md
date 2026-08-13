# Sec-DocuTrade — Database Schema & Entity Relationships

> **Database:** MongoDB (via Mongoose ODM)  
> **Index Strategy:** Explicit compounding on `companyId`, `projectId`, `clientId`, and `status`.

---

## Entity Relationship Overview

```text
                        ┌──────────────────┐
                        │   CompanyModel   │
                        └────────┬─────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
  ┌──────────────┐       ┌──────────────┐        ┌──────────────┐
  │  UserModel   │       │ ClientModel  │        │ AccountModel │
  └──────────────┘       └───────┬──────┘        └──────────────┘
                                 │
                                 ▼
                         ┌──────────────┐
                         │ ProjectModel │
                         └───────┬──────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐    ┌──────────────────┐
│  QuotationModel  │   │   ExpenseModel   │    │  ActivityLog     │
└────────┬─────────┘   └──────────────────┘    └──────────────────┘
         │
         ▼
┌──────────────────┐
│PurchaseOrderModel│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   InvoiceModel   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   PaymentModel   │
└──────────────────┘
```

---

## Core Models Specification

### 1. `CompanyModel` (`companies`)
- **Key Fields:** `name`, `code`, `kind` (`holding` | `operating` | `branch` | `division`), `parentCompanyId`, `taxId`, `baseCurrency`, `supportedCurrencies`, `isActive`, `isPrimary`, `branding` (logoUrl, signatureUrl, invoicePrefix, quotationPrefix, poPrefix, invoiceFooter, bankDetailsText).
- **Indexes:** `code` (unique), `parentCompanyId`, `isPrimary`.

### 2. `ClientModel` (`clients`)
- **Key Fields:** `name`, `companyId`, `email`, `phone`, `address`, `country`, `currency`, `status` (`ACTIVE` | `INACTIVE`).
- **Indexes:** `companyId`, `status`.

### 3. `ProjectModel` (`projects`)
- **Key Fields:** `name`, `companyId`, `clientId`, `status` (`active` | `completed` | `archived`), `currency`, `budget`, `startDate`, `targetEndDate`.
- **Indexes:** `companyId`, `clientId`, `status`.

### 4. `QuotationModel` (`quotations`)
- **Key Fields:** `quotationNumber`, `companyId`, `projectId`, `status` (`draft` | `sent` | `approved` | `declined`), `currency`, `pages` (array of items with name, qty, price), `totals` (subtotal, tax, total).
- **Indexes:** `companyId`, `projectId`, `quotationNumber`, `status`.

### 5. `PurchaseOrderModel` (`purchaseorders`)
- **Key Fields:** `poNumber`, `companyId`, `projectId`, `quotationId`, `totalAmount`, `status` (`active` | `completed` | `cancelled`).
- **Indexes:** `companyId`, `projectId`, `poNumber`, `status`.

### 6. `InvoiceModel` (`invoices`)
- **Key Fields:** `invoiceNumber`, `companyId`, `projectId`, `poId`, `currency`, `status` (`DRAFT` | `ISSUED` | `SENT` | `PAID` | `VOID`), `paymentStatus` (`UNPAID` | `PARTIAL` | `PAID`), `dueDate`, `pages`, `totals`, `totalsCache` (totalReceivedBase, totalFeesBase, totalIntendedBase).
- **Indexes:** `companyId`, `projectId`, `poId`, `status`, `paymentStatus`.

### 7. `PaymentModel` (`payments`)
- **Key Fields:** `companyId`, `projectId`, `clientId`, `invoiceId`, `accountId`, `direction` (`INCOMING` | `OUTGOING`), `type` (`PAYMENT` | `REFUND`), `status` (`COMPLETED` | `PENDING` | `CANCELLED`), `amount`, `amountBase`.
- **Indexes:** `companyId`, `invoiceId`, `projectId`, `status`.

### 8. `ExpenseModel` (`expenses`)
- **Key Fields:** `title`, `companyId`, `projectId`, `category` (`TOOLS` | `INFRA` | `TRAVEL` | `SERVICES`), `currency`, `amount`, `baseAmount`.
- **Indexes:** `companyId`, `projectId`, `category`.

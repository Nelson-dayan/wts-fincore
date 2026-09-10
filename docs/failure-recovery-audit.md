# Sec-DocuTrade — System Failure, Resiliency & Recovery Audit

> **Scope:** Error handling, network failure recovery, double-submit protection, and database connection resiliency.

---

## 1. Failure Scenarios & Mitigations

### 1. Database Disconnection & Auto-Reconnect
- **Scenario:** MongoDB network glitch or momentary drops.
- **Handling:** Mongoose client connection pool (`maxPoolSize: 20`, `socketTimeoutMS: 45000`) automatically retries operations. API handlers catch database errors and return standardized JSON error responses `{ error: "DATABASE_UNAVAILABLE", message: "..." }` with HTTP 503 status code.

### 2. Idempotency & Double-Submit Protection
- **Scenario:** User clicks "Save Invoice" or "Issue Payment" twice in rapid succession.
- **Handling:**
  - Frontend form buttons enter disabled state (`pending={true}`) with loading indicator.
  - Invoices enforce unique `invoiceNumber` per company.
  - Payment model executes state check on target invoice prior to transaction application.

### 3. Session Expiration & Auth Recovery
- **Scenario:** Auth token expires while user is filling out a multi-page quotation.
- **Handling:** API returns HTTP 401 `UNAUTHORIZED`. Client routing interceptor redirects to `/auth/login` while preserving form state in `sessionStorage`.

### 4. Malformed Input & Validation Bounds
- **Scenario:** Invalid ObjectId string or negative payment amounts passed in payload.
- **Handling:** Server-side request parser validates ObjectIds and positive numeric values prior to DB execution, returning HTTP 400 `BAD_REQUEST`.

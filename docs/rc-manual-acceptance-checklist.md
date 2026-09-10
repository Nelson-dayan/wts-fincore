# Sec-DocuTrade — Release Candidate (RC) Manual Acceptance Checklist

> **Purpose**: This checklist guides final human browser & mobile device validation prior to production deployment. While 100% of automated gates (Security 59/59, Integrity 3/3, API 7/7, E2E 15/15, TypeCheck 0 errors, Production Build 82/82) are green, manual acceptance ensures visual excellence, responsive layout parity, and real device usability.

---

## 1. Authentication & Session Scoping
- [ ] **Admin Login**: Log in with Admin credentials (`test.admin@fincore-test.com` / `TestPass123!`). Verify Admin Command Center loads cleanly.
- [ ] **Employee Login**: Log in with Employee credentials. Verify navigation menu strictly hides Admin-only items (Company Settings, Users, Group Management).
- [ ] **Company Switcher**: Switch active company context in navbar. Verify current dashboard stats refresh instantly to match selected company.

---

## 2. Multi-Company & Group View Verification
- [ ] **Single Operating Company**: Verify financial documents display operating company branding and logo.
- [ ] **Group Management Lens**: Switch to Group View (Holding company). Verify consolidated group financial metrics display cleanly.
- [ ] **Group Ownership Guard**: Attempt to create a new Invoice in Group Mode. Verify UI requires selecting a single operating company owner before proceeding.

---

## 3. Financial Workflow Lifecycles
- [ ] **Quotation Creation & Approval**: Create a Quotation in project workspace. Click Approve (`DRAFT -> APPROVED`). Verify quotation locks and display converts to approved state.
- [ ] **Purchase Order Generation**: Click "Convert to PO" on approved quotation. Verify PO inherits project and client snapshot details.
- [ ] **Invoice Issuance & Payment**: Generate Invoice from PO (`DRAFT -> ISSUED -> SENT`). Record full payment (`PAID`). Verify status badge transitions to `PAID` with green indicator.
- [ ] **Public Quotation Client Portal**: Open `/quotation/[id]` public link. Review proposal rendering. Click "Accept". Verify proposal transitions to approved and duplicate click attempt shows "Already Approved" notice.

---

## 4. Mobile & Responsive Layout Parity (320px – 768px Viewports)
- [ ] **Mobile Sidebar Drawer**: Toggle mobile menu button in top bar. Verify sidebar drawer slides smoothly and closes on navigation item click.
- [ ] **Data Table Scrolling**: View Invoice / PO tables on mobile view (360px viewport). Verify tables scroll horizontally without breaking layout structure.
- [ ] **Action Buttons & Touch Targets**: Verify touch targets for all primary buttons and dropdowns are at least 44px high for easy tapping.

---

## 5. Production Environment & Security Pre-Flight
- [ ] **Environment Guard**: Verify `NODE_ENV=production` blocks `npm run seed` and test scripts unless `ALLOW_PROD_TEST=true` is explicitly set.
- [ ] **Production Secrets**: Confirm `JWT_SECRET`, `MONGODB_URI`, and authentication credentials are set via secure environment variables.
- [ ] **Zero Dev Warnings**: Verify browser console produces zero unhandled errors or missing key warnings during manual navigation.

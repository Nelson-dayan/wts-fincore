# Sec-DocuTrade — Production Deployment & Rollback Standard Operating Procedure (SOP)

> **Document Status**: Approved Production Operational Standard  
> **Target Release**: Sec-DocuTrade ERP v1.0.0  
> **Source of Truth**: Git Repository Main Branch  

---

## 1. Environment & Prerequisites Matrix

### Server Requirements
- **Node.js**: `v20.x` LTS or `v22.x` LTS
- **Package Manager**: `npm v10.x`
- **Database**: MongoDB v6.0+ Cluster (Primary with Replica Set)
- **Runtime Environment**: Next.js 16 (Turbopack / Node runtime)

### Required Environment Variables (`.env.production`)
| Variable | Description | Security Requirement |
| :--- | :--- | :--- |
| `NODE_ENV` | Must be set strictly to `production` | Hard-blocks test seed execution |
| `MONGODB_URI` | Production MongoDB connection string | Encrypted in secret manager |
| `JWT_SECRET` | 256-bit cryptographically secure secret | Never committed to version control |
| `NEXTAUTH_URL` | Fully qualified domain URL (e.g. `https://erp.sec-docutrade.com`) | Matches SSL origin |
| `NEXTAUTH_SECRET` | Session encryption secret | Unique production secret |
| `CORS_ORIGIN` | Allowed API origin domains | Scoped strictly to production domains |

> ⚠️ **OPERATIONAL SECURITY RULE**: `ALLOW_PROD_TEST=true` MUST NOT exist in production environment variables. It is an emergency developer override only.

---

## 2. Pre-Deployment Verification

Before triggering any deployment to Staging or Production, execute the release gate command:

```bash
npm run verify:all
```

**Expected Gate Results**:
- Security Tests: **59/59 Passed**
- Database Integrity Tests: **3/3 Passed**
- API Health Tests: **7/7 Passed**
- Real E2E Workflow Suite: **15/15 Passed**
- TypeScript Compilation: **0 Errors**
- Production Build: **82/82 Routes Static/Dynamic Prerendered**

---

## 3. Database Backup & Pre-Flight Snapshot

Prior to deploying code updates or applying schema changes:

1. **Trigger MongoDB Point-in-Time Snapshot**:
   ```bash
   mongodump --uri="$MONGODB_URI" --out="/backups/sec-docutrade-pre-deploy-$(date +%Y%m%d_%H%M%S)"
   ```
2. **Verify Backup Integrity**: Confirm the dump archive exists and size matches expected database volume.

---

## 4. Staging Deployment Sequence

1. **Deploy Build to Staging Environment**:
   ```bash
   git checkout main
   git pull origin main
   npm ci --only=production
   npm run build
   ```
2. **Execute Staging Smoke Test**:
   - Verify Admin Command Center loads at `https://staging.sec-docutrade.com/admin`.
   - Test Company Context Switcher (`Operating Company` vs `Holding Group`).
   - Create a test Quotation → PO → Invoice workflow.
   - Verify mobile responsive drawer on 375px screen.
3. **Approve Staging Release**: Proceed to Production once smoke tests pass.

---

## 5. Production Deployment Sequence

1. **Apply Tagged Git Release**:
   ```bash
   git tag -a v1.0.0 -m "Sec-DocuTrade ERP v1.0.0 Release Candidate Signed Off"
   git push origin v1.0.0
   ```
2. **Execute Production Deployment**:
   ```bash
   npm ci
   npm run build
   pm2 restart sec-docutrade-erp --update-env # or container orchestration deployment
   ```
3. **Run Post-Deployment Smoke Tests**:
   - Verify `/api/auth/session` returns valid JWT response.
   - Verify `/admin` overview renders metrics cleanly.
   - Verify `/quotation/[id]` public portal returns 200 OK.
   - Inspect server logs (`pm2 logs` or CloudWatch) to verify zero uncaught exceptions.

---

## 6. Rollback SOP (Emergency Reversion Procedure)

If post-deployment smoke tests fail or critical runtime defects occur:

### Step 1: Revert Code to Previous Tag
```bash
git checkout v1.0.0-rc.1 # Revert to previous stable tag
npm ci
npm run build
pm2 restart sec-docutrade-erp --update-env
```

### Step 2: Database Reversion (If Schema Applied)
```bash
mongorestore --uri="$MONGODB_URI" --drop "/backups/sec-docutrade-pre-deploy-<TIMESTAMP>"
```

### Step 3: Verify System Recovery
Execute automated health check against reverted environment:
```bash
npm run test:api
```

---

## 7. Operational Incident & Emergency Contacts
- **Engineering Lead**: Lead Architect
- **DevOps Escalation**: DevOps On-Call Team
- **Incident Escalation SOP**: `docs/sop/recovery-sop.md`

# Full Stack Cutover Runbook (Neon + Sanity + Clerk)

Use this checklist when moving the site to a new server/account set and migrating data from the current stack.

Canonical identity/linking reference for Resident 360 and reports:
- [`docs/resident-360-identity-linking-spec.md`](docs/resident-360-identity-linking-spec.md)

## Scope

- App: Next.js portal/public site
- Data/content/auth: Neon, Sanity, Clerk
- Optional legacy bridge: WordPress/Gravity Forms endpoints during transition

## 0) Preconditions

- [ ] Cutover window scheduled
- [ ] Rollback owner assigned
- [ ] Legacy system write-freeze window agreed
- [ ] Validation owner assigned (counts + spot checks)

---

## 1) Neon Setup (First)

- [ ] Create new Neon project and database
- [ ] Set local `DATABASE_URL` to new Neon connection string
- [ ] Run schema setup locally:

```bash
npm run prisma:generate
npx prisma db push
```

- [ ] Verify DB connectivity and schema:

```bash
node -e 'const {PrismaClient}=require("@prisma/client"); const p=new PrismaClient(); (async()=>{await p.$queryRaw`SELECT 1`; console.log("db ok"); await p.$disconnect();})();'
```

- [ ] Confirm target tables exist and are empty/expected before import

---

## 2) Import Neon Data

Import order requirement (for reliable cross-domain linkage):
1. Households/address canonicalization foundation
2. Users
3. Residencies (current/past)
4. ACC requests
5. Access-control records
6. Linking + unresolved review

### Access management (resident access)

- [ ] Dry run import first:

```bash
npm run import:access:xlsx -- --file "/ABS/PATH/TO/gfexcel-66-access-control-residents-20260224.xlsx" --dry-run
```

- [ ] Real import:

```bash
npm run import:access:xlsx -- --file "/ABS/PATH/TO/gfexcel-66-access-control-residents-20260224.xlsx"
```

### ACC requests (GF form 44)

- [ ] Confirm env vars are present in `.env` / `.env.local`:
  - `GRAVITY_FORMS_API_URL`
  - `GRAVITY_FORMS_API_KEY`
  - `GRAVITY_FORMS_API_SECRET`
  - `ACC_FORM_ID=44`

- [ ] Dry run:

```bash
npm run import:acc:gf -- --form 44 --mode full --dry-run
```

- [ ] Real import:

```bash
npm run import:acc:gf -- --form 44 --mode full
```

### Matching

- [ ] Run matching job:

```bash
npm run match:acc:residents
```

- [ ] Generate quality report:

```bash
npm run report:acc:match-quality
```

- [ ] Resolve manual candidates in UI:
  - `/resident-portal/management/acc-match-review`
  - `/resident-portal/management/acc-unmatched`

---

## 3) Sanity Setup (Second)

- [ ] Create new Sanity project/dataset
- [ ] Update env vars:
  - `NEXT_PUBLIC_SANITY_PROJECT_ID`
  - `NEXT_PUBLIC_SANITY_DATASET`
  - `SANITY_API_TOKEN`
- [ ] Import content/documents/assets
- [ ] Validate key pages:
  - Public home/events/announcements/newsletters
  - Portal documents + links/downloads
  - Management pages that render Sanity-driven content

---

## 4) Clerk Setup (Third)

- [ ] Create new Clerk app
- [ ] Configure sign-in/sign-up URLs/domains
- [ ] Configure verification + password settings
- [ ] Update env vars:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
  - `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- [ ] Migrate/invite users after data/content checks pass

---

## 5) App Secrets + Deploy

- [ ] Set env vars in target host (Vercel/new server):
  - Neon: `DATABASE_URL`
  - Sanity vars
  - Clerk vars
  - Email SMTP vars
  - WordPress/GF vars (if legacy bridge still needed)
- [ ] Redeploy

---

## 6) Staging Validation (Required)

- [ ] Authentication flow works (sign-up, verify, sign-in)
- [ ] Role-based access checks pass for management pages
- [ ] Resident Access page loads/edit persists
- [ ] ACC queue loads/filter/edit/attachments work
- [ ] Match review + unmatched queue are functional
- [ ] Resident 360 search and exports work
- [ ] ACC queue and Access views show resident state (`Current`, `Past`, `Unknown`)
- [ ] Historical records are visible and correctly attributed in Resident 360
- [ ] Documents/newsletters load correctly
- [ ] Email test page can send and show diagnostics

---

## 7) Final Delta Sync Before Production

Because legacy WordPress remains active until cutover:

- [ ] Re-run ACC import (`--mode full`)
- [ ] Re-run matching
- [ ] Re-resolve new unmatched rows
- [ ] Re-check record counts against source

Suggested verify commands:

```bash
node -e 'const {PrismaClient}=require("@prisma/client"); const p=new PrismaClient(); (async()=>{const [acc,att,rp]=await Promise.all([p.accRequest.count(),p.accRequestAttachment.count(),p.residentProfile.count()]); console.log({accRequests:acc,attachments:att,residentProfiles:rp}); await p.$disconnect();})();'
```

---

## 8) Production Cutover

- [ ] Enable write freeze on legacy updates (or communicate cutover hold)
- [ ] Switch production env vars to new Neon/Sanity/Clerk
- [ ] Redeploy production
- [ ] Run smoke tests immediately:
  - Login
  - Resident portal
  - Access/ACC management core pages
  - Documents
  - Email sending

---

## 9) Post-Cutover Monitoring (24-48h)

- [ ] Monitor runtime logs (API/auth/email)
- [ ] Verify no `DATABASE_URL`/auth/env errors
- [ ] Spot-check admin workflows and resident workflows
- [ ] Keep legacy system read-only available until stable

---

## 10) Rollback Plan

Trigger rollback if any critical path fails (auth, data integrity, core management pages).

- [ ] Revert env vars to prior production values
- [ ] Redeploy last known-good commit
- [ ] Communicate rollback + hold on writes
- [ ] Capture failure details and rerun cutover checklist after fix

---

## 11) Decommission (After Stability Window)

- [ ] Remove temporary WordPress bridge pages/routes
- [ ] Remove legacy credentials from env
- [ ] Archive migration logs/validation output
- [ ] Update runbooks to “Neon/Sanity/Clerk-only” operations

---

## Operator Notes

- Keep this runbook in source control and check boxes in PR notes or deployment ticket.
- Do not rotate credentials mid-cutover unless required; rotate after stable cutover.
- Prefer rerunnable import commands and deterministic validation reports.

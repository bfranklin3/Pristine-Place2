# ACC to Neon Migration Rollout Checklist

Use this checklist to migrate ACC Permit Requests from WordPress/Gravity Forms (Form 44) into Neon, validate data quality, and cut over safely.

## Current Status Snapshot (February 26, 2026)

### Completed
- Neon database and Prisma schema for ACC import + matching are in place and migrated.
- Full ACC import from GF Form `44` completed successfully:
  - `rowsRead: 415`
  - `rowsUpserted: 415`
  - `attachmentsUpserted: 437`
  - `errors: 0`
- Match review workflow is live:
  - manual confirm/reject
  - bulk confirm/reject
  - rerun matching action
  - run history panel
- Unmatched queue is live:
  - priority + age bucket filters (7/30/90+)
  - CSV export
  - one-click **Open in Match Review** row action
- Resident 360 is live with export support:
  - CSV export working
  - PDF export working
- ACC matching fix was applied so exact-address candidates are generated even when name score is low.

### In Progress / Pending
- Final data QA for edge cases (address variants, prior-owner vs current-owner attribution).
- Governance for owner/renter/authorized submitter rules in Neon data model + workflow.
- Clerk linkage in Resident 360 (future phase once user migration/identity mapping is ready).
- Final cutover sequencing from WordPress-backed ACC workflow page to Neon-backed ACC workflow page.

### Immediate Next Steps
1. Continue reviewing any remaining ambiguous/unmatched ACC records.
2. Confirm property-history handling rules (current owner view vs prior-owner history toggle).
3. Add ownership-timebound model (or equivalent) before production cutover.
4. Run final delta import immediately before cutover window.
5. Switch ACC read path to Neon and monitor for 3–7 days with rollback path preserved.

## Scope
- Source: WordPress Gravity Forms form `44`
- Transition state: WordPress remains source of truth until cutover
- Target: Neon-backed ACC data and matching system

## Phase 0: Safety and Prep
- [ ] Freeze assumptions:
  - [ ] Source form is GF `44`
  - [ ] Initial run is full import
  - [ ] Final run is delta/final import before cutover
- [ ] Export a timestamped backup snapshot of GF 44 entries (JSON/CSV)
- [ ] Confirm env vars locally and in Vercel:
  - [ ] `DATABASE_URL`
  - [ ] `GRAVITY_FORMS_API_URL`
  - [ ] `GRAVITY_FORMS_API_KEY`
  - [ ] `GRAVITY_FORMS_API_SECRET`
  - [ ] `WORDPRESS_API_URL`
  - [ ] `WORDPRESS_USERNAME`
  - [ ] `WORDPRESS_APP_PASSWORD`
- [ ] Create migration branch
- [ ] Confirm rollback plan is documented before schema/data changes

## Phase 1: Schema Rollout (Neon)
- [ ] Add Prisma schema for:
  - [ ] `AccRequest`
  - [ ] `AccRequestAttachment`
  - [ ] `AccImportRun`
  - [ ] `ResidentAccMatch`
  - [ ] ACC enums (`AccDisposition`, `AccMatchStatus`, etc.)
- [ ] Generate Prisma client:
  - [ ] `npm run prisma:generate`
- [ ] Create migration locally:
  - [ ] `npm run prisma:migrate:dev -- --name add_acc_requests_matching`
- [ ] Deploy migration to Neon:
  - [ ] `npx prisma migrate deploy`
- [ ] Verify tables/constraints/indexes exist

## Phase 2: Importer Build and Dry Runs
- [ ] Implement importer command
  - [ ] Example: `npm run import:acc:gf -- --form=44 --mode=full --dry-run`
- [ ] Ensure dry-run outputs:
  - [ ] rows read
  - [ ] rows upserted
  - [ ] rows unchanged
  - [ ] attachments upserted
  - [ ] errors
- [ ] Validate mapping with sample records:
  - [ ] `23` owner name
  - [ ] `6` owner phone
  - [ ] `20` owner email
  - [ ] `44` authorized rep name
  - [ ] `58` address
  - [ ] `27` work type
  - [ ] `14` description
  - [ ] `39` permit number
  - [ ] `55` disposition
  - [ ] `61` process date
  - [ ] `19`/`60` attachments
- [ ] Validate address normalization on sample set (20+ rows)
- [ ] Run full import:
  - [ ] `npm run import:acc:gf -- --form=44 --mode=full`
- [ ] Record `AccImportRun.id`

## Phase 3: Import Verification (Hard Checks)
- [ ] Count parity:
  - [ ] WP active entry count ~= Neon `AccRequest` count
- [ ] Uniqueness:
  - [ ] no duplicate (`sourceSystem`,`sourceFormId`,`sourceEntryId`)
- [ ] Data completeness:
  - [ ] `sourceEntryId` populated
  - [ ] `lastSeenAt` populated
  - [ ] `rawEntryJson` populated
- [ ] Distribution parity:
  - [ ] disposition counts align with WP
- [ ] Attachment parity:
  - [ ] sample verify field `19` and `60`
  - [ ] URLs valid and opening

## Phase 4: Matching Rollout
- [ ] Implement scorer and candidate generation
- [ ] Apply thresholds:
  - [ ] `>=85` => `auto`
  - [ ] `70–84` => `needs_review`
  - [ ] `<70` => no link
- [ ] Review sample quality:
  - [ ] 30 auto links
  - [ ] 30 needs_review links
- [ ] Enable manual review workflow:
  - [ ] confirm
  - [ ] reject
  - [ ] manual link

## Phase 5: Resident 360 Read Model
- [ ] Build resident-centric API/report (read-only first):
  - [ ] resident profile
  - [ ] gate credentials
  - [ ] matched ACC requests
  - [ ] match metadata
  - [ ] auth summary linkage
- [ ] Validate redaction behavior for redacted mode
- [ ] Validate query performance and indexing

## Phase 6: Final Delta Migration (Pre-Cutover)
- [ ] Define and announce cutover window
- [ ] Run final import:
  - [ ] `npm run import:acc:gf -- --form=44 --mode=final`
- [ ] Re-run hard checks:
  - [ ] counts
  - [ ] attachments
  - [ ] recent rows (last 7 days)
- [ ] Re-run matching for changed/new rows
- [ ] Clear critical `needs_review` items

## Phase 7: Cutover
- [ ] Switch ACC reads to Neon
- [ ] Keep WP fallback path temporarily
- [ ] Decide write mode:
  - [ ] temporary dual-write or
  - [ ] Neon-only
- [ ] Monitor for 3–7 days:
  - [ ] errors
  - [ ] missing records
  - [ ] attachment issues
  - [ ] audit trail integrity
- [ ] Decommission WP dependency after acceptance

## Rollback Plan
- [ ] Keep WP ACC routes available during stabilization
- [ ] If issues occur:
  - [ ] switch reads back to WP
  - [ ] fix importer/schema
  - [ ] run delta import
  - [ ] retry cutover

## Go/No-Go Gate
- [ ] Full import validated
- [ ] Final delta import validated
- [ ] Match quality accepted
- [ ] Resident 360 verified
- [ ] Redaction verified
- [ ] API auth verified
- [ ] Rollback tested

## Sign-off
- Technical owner: __________________
- Data owner: ______________________
- Operations owner: ________________
- Cutover date/time: _______________
- Final approval: __________________

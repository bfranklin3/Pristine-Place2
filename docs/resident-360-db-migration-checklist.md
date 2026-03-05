# Resident 360 DB Migration Checklist (Tables, Indexes, Constraints)

Version: 1.0  
Last updated: March 4, 2026

Canonical spec reference:
- [`docs/resident-360-identity-linking-spec.md`](docs/resident-360-identity-linking-spec.md)

## Recommendation: When To Build `households`

Build the canonical household/address foundation **before the next real ACC or Access Control production import**.

Reason:
- It is the primary anchor for cross-domain linkage.
- Building it later creates avoidable remap/backfill work and report drift.
- Resident 360, ACC queue, and Access views can share one linking model from day one.

Practical timing:
1. DDL + backfill in staging first.
2. Validate joins and current/past logic.
3. Then run next production migration batch against the new structure.

## Scope

This checklist defines concrete DB work to evolve from the current schema toward:
- canonical `households`
- time-bound `residencies`
- ACC/access linkage fields
- current/past resident state support
- auditable linking decisions

## Phase 0: Safety and Baseline

- [ ] Snapshot database backup before schema changes.
- [ ] Export baseline counts:
  - [ ] `ResidentProfile`
  - [ ] `HouseholdMember`
  - [ ] `GateCredential`
  - [ ] `AccRequest`
  - [ ] `ResidentAccMatch`
- [ ] Freeze data-model assumptions (field names/types/enums) in ticket/PR.
- [ ] Confirm rollback path for migration.

## Phase 1: Create Core Canonical Tables

## 1.1 `Household`
- [ ] Create table `Household`:
  - [ ] `id` `String @id`
  - [ ] `addressRaw` `String?`
  - [ ] `addressCanonical` `String`
  - [ ] `addressKey` `String`
  - [ ] `lotNumber` `String?`
  - [ ] `phase` `String?`
  - [ ] `createdAt` / `updatedAt`
- [ ] Constraints:
  - [ ] `UNIQUE(addressKey)`
- [ ] Indexes:
  - [ ] `INDEX(addressCanonical)`
  - [ ] `INDEX(lotNumber)`

## 1.2 `Residency`
- [ ] Create table `Residency`:
  - [ ] `id` `String @id`
  - [ ] `householdId` FK -> `Household(id)` (`ON DELETE RESTRICT`)
  - [ ] `clerkUserId` `String?` (nullable for historical/unresolved)
  - [ ] `residentType` enum (`owner|tenant|authorized_occupant|unknown`)
  - [ ] `startDate` `DateTime?`
  - [ ] `endDate` `DateTime?`
  - [ ] `isCurrent` `Boolean @default(true)`
  - [ ] `sourceSystem` `String?`
  - [ ] `sourceRecordId` `String?`
  - [ ] `createdAt` / `updatedAt`
- [ ] Constraints:
  - [ ] check constraint: `endDate IS NULL OR startDate IS NULL OR endDate >= startDate`
- [ ] Indexes:
  - [ ] `INDEX(householdId, isCurrent)`
  - [ ] `INDEX(clerkUserId, isCurrent)`
  - [ ] `INDEX(startDate, endDate)`

## 1.3 `LinkAudit`
- [ ] Create table `LinkAudit` (immutable event log):
  - [ ] `id` `String @id`
  - [ ] `entityType` (`acc_request|access_record|residency`)
  - [ ] `entityId` `String`
  - [ ] `previousHouseholdId` `String?`
  - [ ] `newHouseholdId` `String?`
  - [ ] `previousResidencyId` `String?`
  - [ ] `newResidencyId` `String?`
  - [ ] `reason` `String?`
  - [ ] `actorUserId` `String?`
  - [ ] `createdAt` `DateTime @default(now())`
- [ ] Indexes:
  - [ ] `INDEX(entityType, entityId, createdAt)`
  - [ ] `INDEX(actorUserId, createdAt)`

## Phase 2: Extend Existing Domain Tables

## 2.1 `AccRequest` additions
- [ ] Add nullable columns:
  - [ ] `addressKey` `String?`
  - [ ] `householdId` FK -> `Household(id)` (`ON DELETE SET NULL`)
  - [ ] `residencyId` FK -> `Residency(id)` (`ON DELETE SET NULL`)
  - [ ] `clerkUserId` `String?`
  - [ ] `residentState` enum (`current|past|unknown`) default `unknown`
  - [ ] `matchConfidence` enum (`high|medium|low|unresolved`) default `unresolved`
  - [ ] `matchMethod` `String?`
  - [ ] `matchedAt` `DateTime?`
  - [ ] `matchedBy` `String?`
- [ ] Indexes:
  - [ ] `INDEX(addressKey)`
  - [ ] `INDEX(householdId, submittedAt)`
  - [ ] `INDEX(residentState, submittedAt)`
  - [ ] `INDEX(matchConfidence, submittedAt)`

## 2.2 Access-control domain additions

Use your existing access table(s) used by management access pages (currently tied to `ResidentProfile` + `GateCredential`).

- [ ] Add nullable linking columns on the record that represents household assignment:
  - [ ] `addressKey` `String?`
  - [ ] `householdId` FK -> `Household(id)` (`ON DELETE SET NULL`)
  - [ ] `residencyId` FK -> `Residency(id)` (`ON DELETE SET NULL`)
  - [ ] `clerkUserId` `String?`
  - [ ] `residentState` enum (`current|past|unknown`) default `unknown`
  - [ ] `matchConfidence` enum (`high|medium|low|unresolved`) default `unresolved`
  - [ ] `matchMethod` `String?`
  - [ ] `matchedAt` `DateTime?`
  - [ ] `matchedBy` `String?`
- [ ] Indexes:
  - [ ] `INDEX(addressKey)`
  - [ ] `INDEX(householdId)`
  - [ ] `INDEX(residentState)`
  - [ ] `INDEX(matchConfidence)`

## Phase 3: Backfill and Canonicalization

- [ ] Build deterministic address normalizer used by all imports.
- [ ] Backfill `Household` from existing source addresses:
  - [ ] `ResidentProfile.addressFull`
  - [ ] `AccRequest.addressRaw/addressCanonical`
  - [ ] access-control address fields
- [ ] Backfill `addressKey` on `AccRequest` and access-control records.
- [ ] Link records to `Household` by `addressKey`.
- [ ] Seed initial `Residency` rows:
  - [ ] current rows for known active residents
  - [ ] historical rows where prior-owner/occupant data exists
- [ ] Derive/set `residentState`:
  - [ ] `current` when linked residency is current
  - [ ] `past` when linked residency ended
  - [ ] `unknown` when no residency link

## Phase 4: Integrity Constraints (After Backfill)

Only enforce after unresolved rows are within agreed tolerance.

- [ ] Add NOT NULL constraints where safe:
  - [ ] `Household.addressCanonical`
  - [ ] `Household.addressKey`
- [ ] Optional deferred hardening:
  - [ ] make `AccRequest.householdId` non-null for new writes
  - [ ] make access-control `householdId` non-null for new writes
- [ ] Add write-path safeguards:
  - [ ] trigger/app guard to keep `isCurrent` consistent with `endDate`
  - [ ] ensure one current residency per user-household pair unless explicit exception

## Phase 5: Query and Reporting Readiness

- [ ] Validate indexes with `EXPLAIN ANALYZE` for:
  - [ ] Resident 360 by household
  - [ ] Resident 360 by user/clerk id
  - [ ] ACC queue filtered by `residentState`
  - [ ] Access queue filtered by `residentState`
- [ ] Add materialized view or cached read model only if needed after profiling.

## Phase 6: Validation Checklist

- [ ] Count checks:
  - [ ] Pre/post ACC row counts unchanged
  - [ ] Pre/post access row counts unchanged
- [ ] Link quality:
  - [ ] `% linked household` meets target
  - [ ] `% unresolved` within target and queued for review
- [ ] Resident-state quality:
  - [ ] sample current residents appear as `current`
  - [ ] sample former residents appear as `past`
  - [ ] unresolved rows appear as `unknown`
- [ ] Audit checks:
  - [ ] manual link/unlink writes `LinkAudit` rows

## Phase 7: Cutover Rules

- [ ] Enable report filters defaulting to `Current + Unknown`.
- [ ] Expose `Past` as opt-in filter.
- [ ] Keep unresolved review queue active until backlog cleared.
- [ ] Delay strict non-null household FKs until unresolved backlog is acceptable.

## SQL/Prisma Delivery Artifacts

- [ ] Prisma schema updates committed.
- [ ] Named migration files committed with comments:
  - [ ] `add_households_and_residencies`
  - [ ] `add_cross_domain_link_fields`
  - [ ] `add_link_audit`
  - [ ] `harden_constraints_post_backfill` (optional later)
- [ ] Backfill script committed:
  - [ ] idempotent
  - [ ] dry-run mode
  - [ ] progress + summary output

### Backfill Script Command

Script path:
- `scripts/backfill-households-residencies.ts`

Dry-run (default):
```bash
node -r dotenv/config ./node_modules/tsx/dist/cli.mjs scripts/backfill-households-residencies.ts dotenv_config_path=.env.local
```

Execute:
```bash
node -r dotenv/config ./node_modules/tsx/dist/cli.mjs scripts/backfill-households-residencies.ts dotenv_config_path=.env.local --execute
```

Optional scope limits:
```bash
node -r dotenv/config ./node_modules/tsx/dist/cli.mjs scripts/backfill-households-residencies.ts dotenv_config_path=.env.local --limit-profiles 200 --limit-acc 500
```

## Go/No-Go Gate

- [ ] Canonical `Household` and `Residency` in place.
- [ ] ACC/access links populated or explicitly unresolved.
- [ ] Resident 360 shows current and historical context correctly.
- [ ] ACC/Access reports can filter by `Current/Past/Unknown`.
- [ ] Rollback path tested.

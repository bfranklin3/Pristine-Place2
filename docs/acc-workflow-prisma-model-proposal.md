# ACC Workflow Prisma Model Proposal

Version: 1.0  
Last updated: March 9, 2026  
Related documents:
- [`docs/acc-workflow-spec.md`](./acc-workflow-spec.md)
- [`docs/acc-workflow-implementation-plan.md`](./acc-workflow-implementation-plan.md)
- [`docs/acc-workflow-implementation-checklist.md`](./acc-workflow-implementation-checklist.md)

## Purpose

Turn checklist sections 0 and 1 into a concrete Prisma model proposal for the native ACC workflow before any code or migration work begins.

## Architecture Decisions

### 1. Keep imported ACC data separate from workflow-native data

Decision:
- Do not overload the existing imported `AccRequest` / `AccRequestAttachment` models.
- Add a separate workflow-native model family:
  - `AccWorkflowRequest`
  - `AccWorkflowVote`
  - `AccWorkflowAttachment`
  - `AccWorkflowEvent`

Reason:
- Current `AccRequest` is explicitly source-import oriented and already underpins import QA, matching, Resident 360, and legacy queue tooling.
- Native workflow needs different lifecycle fields: status machine, review cycle, lock/finalization state, vote records, and immutable workflow events.
- Keeping the models separate reduces cutover risk and preserves a clean historical boundary between imported Gravity data and native portal workflow data.

### 2. Link workflow requests to Clerk user directly, and to household/residency when available

Decision:
- `residentClerkUserId` is required on every native workflow request.
- `householdId` and `residencyId` are nullable foreign keys.
- Workflow requests still store resident snapshot fields at submit time.

Reason:
- Native submit is authenticated, so the Clerk user id is always known and should be the primary ownership key.
- Household/residency linkage is highly valuable for Resident 360, reporting, and governance, but should not block workflow creation if linkage is temporarily incomplete.
- Snapshot fields preserve the exact submitted identity and address context even if the linked profile changes later.

### 3. Allow optional lineage back to imported `AccRequest`

Decision:
- Add an optional one-to-one link from `AccWorkflowRequest` to the imported `AccRequest` via `importedAccRequestId`.
- Use this only for cutover/imported-in-flight workflow cases.

Reason:
- This keeps native workflow records distinct while still preserving provenance when an imported Gravity request is promoted into the native workflow.
- The optional unique relation prevents duplicate native workflow requests for the same imported source row.

### 4. Model completion verification as a simple internal flag on approved requests

Decision:
- Do not add `verified` as a primary workflow state.
- Do not add a secondary verification state machine.
- Store verification as a simple internal flag plus metadata on `AccWorkflowRequest`.

Reason:
- Verification is optional and only relevant after approval.
- Residents do not see it and no notifications depend on it.
- The actual operational need is that `admin` or `ACC chair` can optionally mark an approved request as verified in the UI.

### 5. Use a storage abstraction for native attachments

Decision:
- Native workflow attachments store `storageProvider`, `storageKey`, and optional `storageBucket`.
- Do not store only a raw public URL as the primary storage reference.

Reason:
- The codebase currently has WordPress attachment upload paths for legacy GF, but no native workflow storage contract yet.
- A provider/key abstraction keeps the schema independent of the eventual storage backend and makes controlled download/auth rules easier later.

### 6. Keep legacy imported ACC queue as read-only history during transition

Decision:
- Current imported ACC queue routes remain legacy/read-only operational history during native workflow rollout.
- Native workflow gets its own routes and UI surface.

Reason:
- This avoids mixing imported disposition management with native state-machine processing.
- It makes cutover and rollback easier to reason about.

### 7. Use `cuid()` ids to stay consistent with the existing schema

Decision:
- New workflow models use `String @id @default(cuid())`.

Reason:
- Existing Prisma models in this repo use `cuid()`.
- Sticking to one id style avoids avoidable migration and tooling inconsistency.

## Proposed Enums

```prisma
enum AccWorkflowRequestOrigin {
  portal_native
  gravity_cutover_import
}

enum AccWorkflowRequestStatus {
  initial_review
  needs_more_info
  committee_vote
  approved
  rejected
}

enum AccWorkflowDecision {
  approve
  reject
}

enum AccWorkflowVoteValue {
  approve
  reject
}

enum AccWorkflowActorRole {
  resident
  member
  chair
  admin
  system
}

enum AccWorkflowAttachmentScope {
  resident
  internal
}

enum AccWorkflowEventType {
  request_submitted
  request_updated
  more_info_requested
  resident_resubmitted
  initial_review_approved
  initial_review_rejected
  sent_to_committee_vote
  vote_cast
  chair_override_approved
  chair_override_rejected
  request_verified
  request_finalized
  attachment_added
  attachment_deleted
}
```

## Proposed Model Additions

### Existing model relation additions

```prisma
model Household {
  // existing fields...
  accWorkflowRequests AccWorkflowRequest[]
}

model Residency {
  // existing fields...
  accWorkflowRequests AccWorkflowRequest[]
}

model AccRequest {
  // existing fields...
  workflowRequest AccWorkflowRequest? @relation("ImportedAccRequestToWorkflow")
}
```

### New workflow-native models

```prisma
model AccWorkflowRequest {
  id                     String                    @id @default(cuid())
  origin                 AccWorkflowRequestOrigin @default(portal_native)
  importedAccRequestId   String?                  @unique
  importedAccRequest     AccRequest?              @relation("ImportedAccRequestToWorkflow", fields: [importedAccRequestId], references: [id], onDelete: SetNull)

  residentClerkUserId    String
  householdId            String?
  household              Household?               @relation(fields: [householdId], references: [id], onDelete: SetNull)
  residencyId            String?
  residency              Residency?               @relation(fields: [residencyId], references: [id], onDelete: SetNull)

  residentNameSnapshot   String
  residentEmailSnapshot  String
  residentPhoneSnapshot  String?
  residentAddressSnapshot String?
  addressCanonical       String?
  addressKey             String?

  phase                  String?
  lot                    String?
  workType               String?
  title                  String?
  description            String?
  locationDetails        String?
  formDataJson           Json?
  authorizedRepName      String?
  estimatedStartDate     DateTime?
  estimatedCompletionDate DateTime?

  status                 AccWorkflowRequestStatus @default(initial_review)
  reviewCycle            Int                      @default(1)
  residentActionNote     String?
  voteDeadlineAt         DateTime?

  finalDecision          AccWorkflowDecision?
  finalDecisionAt        DateTime?
  finalDecisionByUserId  String?
  finalDecisionByRole    AccWorkflowActorRole?
  decisionNote           String?
  isVerified             Boolean                  @default(false)
  verifiedAt             DateTime?
  verifiedByUserId       String?
  verificationNote       String?
  lockedAt               DateTime?

  submittedAt            DateTime                 @default(now())
  createdAt              DateTime                 @default(now())
  updatedAt              DateTime                 @updatedAt

  votes                  AccWorkflowVote[]
  attachments            AccWorkflowAttachment[]
  events                 AccWorkflowEvent[]

  @@index([residentClerkUserId, createdAt])
  @@index([householdId, createdAt])
  @@index([residencyId, createdAt])
  @@index([status, createdAt])
  @@index([status, voteDeadlineAt])
  @@index([addressKey])
}

model AccWorkflowVote {
  id            String               @id @default(cuid())
  requestId     String
  request       AccWorkflowRequest   @relation(fields: [requestId], references: [id], onDelete: Cascade)
  reviewCycle   Int
  voterUserId   String
  vote          AccWorkflowVoteValue
  createdAt     DateTime             @default(now())

  @@unique([requestId, reviewCycle, voterUserId])
  @@index([requestId, reviewCycle, createdAt])
  @@index([voterUserId, createdAt])
}

model AccWorkflowAttachment {
  id              String                     @id @default(cuid())
  requestId       String
  request         AccWorkflowRequest         @relation(fields: [requestId], references: [id], onDelete: Cascade)
  uploadedByUserId String?
  uploadedByRole  AccWorkflowActorRole
  scope           AccWorkflowAttachmentScope
  originalFilename String
  storageProvider String
  storageKey      String
  storageBucket   String?
  mimeType        String
  fileSizeBytes   Int
  note            String?
  deletedAt       DateTime?
  deletedByUserId String?
  createdAt       DateTime                   @default(now())
  updatedAt       DateTime                   @updatedAt

  @@index([requestId, scope, createdAt])
  @@index([requestId, deletedAt])
}

model AccWorkflowEvent {
  id           String               @id @default(cuid())
  requestId    String
  request      AccWorkflowRequest   @relation(fields: [requestId], references: [id], onDelete: Cascade)
  reviewCycle  Int
  eventType    AccWorkflowEventType
  actorUserId  String?
  actorRole    AccWorkflowActorRole
  note         String?
  metadataJson Json?
  createdAt    DateTime             @default(now())

  @@index([requestId, createdAt])
  @@index([requestId, reviewCycle, createdAt])
  @@index([eventType, createdAt])
}
```

## Field-Level Notes

### `residentClerkUserId`

- Required for ownership checks on resident endpoints.
- This is the authoritative resident identity for native-submitted requests.

### `householdId` and `residencyId`

- Nullable in schema for rollout safety.
- Expected to be populated on create whenever current residency resolution succeeds.
- Downstream reporting can still use these links when present.

### Snapshot fields

- `residentNameSnapshot`
- `residentEmailSnapshot`
- `residentPhoneSnapshot`
- `residentAddressSnapshot`

These preserve the resident-visible submission record as it existed at the time of submit/resubmit, even if the portal profile changes later.

### `formDataJson`

- Stores the full resident form payload as submitted or last edited.
- This is required so the same request can be rendered back into the resident form during `needs_more_info`.
- Summary fields such as `title`, `description`, `workType`, and `locationDetails` remain query-friendly projections of that payload.

### `reviewCycle`

- Starts at `1`.
- Increments only on resident resubmission after `needs_more_info`.
- Votes and events are cycle-aware.

### `residentActionNote`

- Set only when a chair requests more information.
- Cleared when the resident resubmits.
- Exposed to the resident only when the request is in `needs_more_info`.

### `decisionNote`

- Stores the final reject note or chair-override note.
- `residentActionNote` and `decisionNote` remain separate because they serve different UI and audit purposes.

### Verification fields

- `isVerified` is internal-only and defaults to `false`.
- It can be set only after approval.
- `verifiedAt`, `verifiedByUserId`, and `verificationNote` capture the optional completion confirmation metadata.
- There is no resident-facing verification status in v1.

### Attachment soft delete

- Proposal uses `deletedAt` and `deletedByUserId` instead of hard delete.
- This keeps attachment history auditable while still allowing the UI to treat removed files as deleted.

## Migration Proposal

### Migration 1: additive only

Selected migration name:

```text
add_acc_workflow_native_models
```

This migration should:
- add the new workflow enums
- add the four new workflow tables
- add relation fields on `Household`, `Residency`, and `AccRequest`
- add indexes only

It should not:
- rename existing ACC import tables
- remove fields from imported `AccRequest`
- change current queue/matching behavior
- backfill any workflow records

Recommended execution plan:

1. Update `prisma/schema.prisma` with the workflow enums/models.
2. Run `npx prisma format`.
3. Run `DATABASE_URL=... npx prisma validate`.
4. Generate the migration:
   - `npx prisma migrate dev --name add_acc_workflow_native_models`
5. Review generated SQL for:
   - enum creation
   - four new workflow tables
   - one-to-one relation from `AccWorkflowRequest.importedAccRequestId` to `AccRequest.id`
   - additive relation columns only
   - expected indexes and unique constraints
6. Do not apply any data backfill in the same migration.

### Migration 2+: data/backfill only if needed

Only after native workflow routes exist:
- optionally create native workflow rows for active in-flight imported requests
- populate `importedAccRequestId` for migrated workflow records
- leave historical imported-only records untouched

## Query/Index Intent

The proposed indexes are aimed at the first expected queries:

- resident list/detail:
  - `residentClerkUserId, createdAt`
- management initial-review queue:
  - `status, createdAt`
- vote queue:
  - `status, voteDeadlineAt`
- Resident 360 / household lookups:
  - `householdId, createdAt`
  - `residencyId, createdAt`
  - `addressKey`
- vote integrity:
  - unique `(requestId, reviewCycle, voterUserId)`

## Deliberate Non-Goals In This Proposal

- No attempt to merge imported and native ACC request records into one table.
- No user table foreign key to Clerk, since current schema stores Clerk identity as string ids.
- No monthly partitioning, archival table, or background job schema in v1.
- No committee-vote-to-resident loopback path.

## Recommended Next Step

If this proposal is accepted, the next implementation step is:

1. add these enums/models to `prisma/schema.prisma`
2. generate the migration
3. review the generated SQL before applying it

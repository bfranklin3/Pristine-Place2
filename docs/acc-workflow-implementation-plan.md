# ACC Workflow Implementation Plan

Version: 1.0  
Last updated: February 28, 2026  
Related spec: [`docs/acc-workflow-spec.md`](./acc-workflow-spec.md)

## Objective

Implement a simple, production-ready ACC change-request workflow in the Next.js portal that:

- Supports resident submission and committee processing.
- Matches finalized workflow rules in the ACC spec.
- Preserves auditability and migration safety.
- Allows phased delivery with low operational risk.

## Current Execution Mode (Important)

This project is running in a phased transition:

1. During transition, resident/admin operations continue to run through WordPress/Gravity (including Gravity Flow where needed).
2. Neon-backed ACC workflow is implemented and tested in parallel.
3. Just before cutover, run a final Gravity Forms re-migration into Neon.
4. After validation, switch production ACC workflow reads/writes to Neon-native flow.

This document describes the target Neon workflow and phased implementation toward that cutover.

## Assumptions

- Existing auth: Clerk with admin and committee role metadata.
- Existing hybrid period: some WordPress/Gravity integrations still active during migration.
- New workflow data will live in the new stack (not Gravity) for ACC v1 implementation.

## Out of Scope (v1)

- “Provide More Information” loopback state.
- Re-opening finalized requests.
- Vote edits after vote cast.
- Full resident-facing history detail (resident sees status + final decision only).

---

## Phase Plan

## Phase 0: Foundations (Schema + Permissions)

### Goals

- Define normalized workflow data model.
- Implement role checks for chair/member/admin.
- Prepare shared status/action constants.

### Deliverables

- Database schema/migrations for:
  - `acc_requests`
  - `acc_votes`
  - `acc_attachments`
  - `acc_events` (audit log)
- Shared TypeScript domain types and enums.
- Authorization helpers:
  - `isAccMember`
  - `isAccChair`
  - `isAdmin`
  - `canPerformAccAction`

### Exit Criteria

- Schema migrated in dev.
- Seed/sample data validates constraints.
- Role helpers pass unit tests.

---

## Phase 1: Resident Submission + Notifications + Initial Review Queue

### Goals

- Allow residents to submit ACC requests.
- Send confirmation and chair notifications.
- Start workflow in `initial_review`.

### Deliverables

- Resident ACC request form (entry points can reuse a shared form component).
- Server endpoint for create submission.
- Email notifications:
  - Resident confirmation
  - Chair(s) notification
- Initial Review queue page for chair/admin.

### Exit Criteria

- Resident can submit from portal.
- Request lands in queue with `initial_review`.
- Emails are delivered to configured recipients.

---

## Phase 2: Initial Review Decisions

### Goals

- Implement chair actions:
  - Approve (final)
  - Reject (final)
  - Send to Committee Vote
- Enforce required notes where applicable.

### Deliverables

- Initial Review action API.
- UI controls in review queue.
- Finalization notifications to resident.
- Transition into `committee_vote` with deadline + member notifications.

### Exit Criteria

- All three initial-review transitions are functional.
- Approve/Reject finalizes and locks request.
- Send-to-vote creates deadline and notifies committee.

---

## Phase 3: Committee Vote Engine

### Goals

- Implement 3-vote, majority-win logic.
- Support chair override with required note.
- Enforce first-writer-wins concurrency lock.

### Deliverables

- Vote submission endpoint.
- One-vote-per-member-per-cycle enforcement.
- Chair override endpoint.
- Auto-finalization when threshold reached:
  - 2 approvals => approved
  - 2 rejections => rejected
  - stop at exactly 3 votes
- Resident decision notifications.

### Exit Criteria

- Voting completes deterministically and locks request.
- Override finalizes immediately and cannot be reversed.
- Concurrent submissions are handled safely.

---

## Phase 4: Dashboards + Reporting UX

### Goals

- Provide clean operational dashboards for committee/admin users.
- Show in-progress vote details and deadline status.

### Deliverables

- Committee dashboard views:
  - My voting queue
  - In-progress requests
  - Finalized requests
- Display fields:
  - Current tally
  - Who has voted and vote type
  - Deadline + days remaining/overdue
- Resident view:
  - Request status + final decision summary only.

### Exit Criteria

- Committee can process end-to-end without WordPress tools.
- Resident can track status without seeing internal vote details.

---

## Phase 5: Hardening + Migration Readiness

### Goals

- Prepare for WordPress workflow retirement.
- Improve resilience and traceability.

### Deliverables

- Retry-safe notification jobs.
- Decision-letter generation (PDF or HTML export).
- Data export tool for audit/legal requests.
- Soft-delete/archive policy for workflow records.
- Ops runbook (failure handling + manual override protocol).

### Exit Criteria

- Workflow operates independently for ACC.
- Legacy dependency can be reduced safely.

---

## Data Model (v1)

## `acc_requests`

- `id` (uuid)
- `resident_user_id`
- `resident_name`
- `resident_email`
- `resident_address`
- `title`
- `description`
- `location_details`
- `status` (`initial_review | committee_vote | approved | rejected`)
- `review_cycle` (int, default 1)
- `vote_deadline_at` (nullable)
- `final_decision` (nullable enum)
- `final_decision_at` (nullable)
- `final_decision_by_user_id` (nullable)
- `final_decision_by_role` (`chair | vote`, nullable)
- `decision_note` (nullable, required by rule in reject/override paths)
- `locked_at` (nullable)
- `created_at`, `updated_at`

## `acc_votes`

- `id` (uuid)
- `request_id` (fk)
- `review_cycle`
- `voter_user_id`
- `vote` (`approve | reject`)
- `created_at`

Constraints:

- Unique (`request_id`, `review_cycle`, `voter_user_id`)

## `acc_attachments`

- `id` (uuid)
- `request_id` (fk)
- `uploaded_by_user_id`
- `uploaded_by_role` (`resident | member | chair | admin`)
- `filename`
- `mime_type`
- `file_size_bytes`
- `storage_key`
- `note` (nullable)
- `created_at`

## `acc_events` (immutable audit log)

- `id` (uuid)
- `request_id` (fk)
- `review_cycle`
- `event_type`
- `actor_user_id`
- `actor_role`
- `note` (nullable)
- `metadata_json` (nullable)
- `created_at`

Event types include:

- `request_submitted`
- `initial_review_approved`
- `initial_review_rejected`
- `sent_to_committee_vote`
- `committee_vote_cast`
- `chair_override_approved`
- `chair_override_rejected`
- `request_finalized`

---

## API Surface (v1)

All endpoints assume authenticated portal user. Role checks enforced server-side.

## Resident Endpoints

- `POST /api/acc/requests`
  - Create request in `initial_review`
  - Trigger resident/chair notifications
- `GET /api/acc/requests/:id`
  - Resident-safe response (status/final decision only)
- `GET /api/acc/requests`
  - Resident list view (own requests)

## Chair/Admin Review Endpoints

- `GET /api/acc/review/initial`
  - Initial Review queue
- `POST /api/acc/review/initial/:id/approve`
- `POST /api/acc/review/initial/:id/reject`
- `POST /api/acc/review/initial/:id/send-to-vote`

## Committee Vote Endpoints

- `GET /api/acc/review/vote`
  - Committee vote queue and in-progress requests
- `POST /api/acc/review/vote/:id/cast`
  - body: `{ vote: "approve" | "reject" }`
- `POST /api/acc/review/vote/:id/override`
  - body: `{ decision: "approve" | "reject", note: string }`
  - chair only

## Attachments Endpoints

- `POST /api/acc/requests/:id/attachments`
- `DELETE /api/acc/requests/:id/attachments/:attachmentId`
  - permission checks by role and ownership policy

## Reporting Endpoints

- `GET /api/acc/reports/in-progress`
- `GET /api/acc/reports/finalized`

---

## UI Pages (v1)

## Resident

- `Resident Portal -> Submit ACC Request` (existing/new shared form entry points)
- `My ACC Requests` list
- `ACC Request Detail` (status + final decision summary)

## Committee/Admin

- `Initial Review Queue`
- `Committee Vote Queue`
- `ACC In-Progress Dashboard`
- `ACC Finalized Dashboard`
- `ACC Request Detail (internal)` with:
  - editable fields (chair in initial review)
  - attachments panel
  - vote panel
  - immutable event timeline

---

## Notification Plan (v1)

1. On submit:
   - Resident confirmation
   - Chair notification
2. On initial approve/reject:
   - Resident decision notification
3. On send-to-vote:
   - Committee notification with deadline
4. On final vote result:
   - Resident decision notification
5. On chair override:
   - Resident decision notification
   - Committee informational notification (optional but recommended)

---

## Validation Rules

- Reject and override require note.
- Vote allowed only in `committee_vote` and unlocked requests.
- One vote per member per request cycle.
- Exactly 3 votes max per cycle.
- First writer that finalizes wins; subsequent writes rejected.
- Finalized requests cannot receive further decisions/votes.

---

## Security + Audit Requirements

- Server-enforced role checks on every action endpoint.
- Immutable `acc_events` logging for all state transitions.
- No hard-delete of ACC request records in v1.
- Export capability for audits/disputes (Phase 5).

---

## Testing Strategy

## Unit Tests

- State transition guards
- Voting threshold logic
- Role authorization helpers

## Integration Tests

- Submit -> initial review -> final decision paths
- Submit -> send to vote -> finalize paths
- Chair override behavior
- Concurrent vote finalization path

## Manual/UAT Scenarios

- Minor request approved at initial review
- Rejected request with required note
- 3-vote cycle with majority decision
- Deadline display behavior (remaining/overdue)

---

## Open Configuration Items (to finalize before build)

- Committee metadata structure (including chair flags) on Resident Directory
- Email templates and sender identity for ACC notifications

## Finalized Attachment Policy (Locked for v1)

- Per-request count limits:
  - Resident uploads: max 10 attachments
  - ACC/internal uploads: max 10 attachments
  - Absolute total per request: max 20 attachments
- Size limits:
  - Max per file: 10 MB
  - Max total resident upload volume per request: 40 MB
  - Max total ACC upload volume per request: 40 MB
- Allowed MIME types:
  - `application/pdf`
  - `image/jpeg`
  - `image/png`
  - `image/webp`
- Validation/security requirements:
  - Validate both MIME type and file extension.
  - Reject executable/script/archive file types.
  - Normalize storage filenames (do not trust original filename).
  - Store uploader role and timestamp on each attachment record.

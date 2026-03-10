# ACC Workflow Implementation Checklist

Version: 1.0  
Last updated: March 9, 2026  
Related documents:
- [`docs/acc-workflow-spec.md`](./acc-workflow-spec.md)
- [`docs/acc-workflow-implementation-plan.md`](./acc-workflow-implementation-plan.md)
- [`docs/acc-workflow-prisma-model-proposal.md`](./acc-workflow-prisma-model-proposal.md)

## Purpose

Convert the ACC workflow plan into a build checklist tied to the current codebase, schema, and API surface.

## Current Baseline

- Current Prisma ACC models are import/matching oriented:
  - `AccRequest`
  - `AccRequestAttachment`
  - `AccImportRun`
  - `ResidentAccMatch`
- Existing ACC management APIs are queue/edit endpoints for imported records:
  - `GET /api/acc/queue`
  - `GET /api/acc/queue/:id`
  - `PATCH /api/acc/queue/:id`
- No workflow-native resident endpoints exist yet:
  - no `POST /api/acc/requests`
  - no resident resubmission endpoint
  - no initial-review or voting action routes
- The resident submit UI exists, but backend submission is still placeholder-only.
- Capability-based access control already exists and can be reused:
  - `acc.view`
  - `acc.edit`
  - `acc.workflow`

## Recommended Implementation Strategy

- Keep the current imported ACC queue/matching models and routes intact during transition.
- Add new workflow-native ACC tables and routes rather than overloading the existing imported `AccRequest` model.
- Treat `needs_more_info` resubmission as the same workflow request with a new `review_cycle`, not a new request record.

## Already Reusable

- [x] Capability keys already exist for view/edit/workflow access.
- [x] Management API guard exists in `lib/auth/portal-management-api.ts`.
- [x] Management page guard exists in `lib/auth/portal-admin.ts`.
- [x] Resident ACC submit page exists and can be wired to a real backend.
- [x] Management ACC queue page exists and can inform the workflow UI structure.

## Checklist

### 0. Architecture Lock

- [ ] Confirm workflow-native table names and avoid colliding with current import models.
- [ ] Confirm whether workflow requests link to `Residency`, `Household`, and/or `clerkUserId` directly.
- [ ] Confirm whether workflow attachments use existing storage plumbing or need a new provider abstraction.
- [ ] Confirm whether the current imported ACC queue stays read-only after native workflow cutover or remains as legacy history.
- [ ] Confirm purge scope:
  - native workflow requests only
  - delete request + votes + attachments + events
  - no purge for imported legacy `AccRequest` rows
- [ ] Confirm notification test mode:
  - reroute all workflow emails to admin test inbox (preferred)
  - or suppress workflow emails entirely

### 1. Prisma Schema + Migration

- [ ] Add workflow enums for request status, final decision, actor role, and event type.
- [ ] Add workflow request model with:
  - resident snapshot fields
  - normalized status
  - `reviewCycle`
  - `residentActionNote`
  - final decision fields
  - lock/finalization timestamps
- [ ] Add workflow vote model with unique constraint on `(requestId, reviewCycle, voterUserId)`.
- [ ] Add workflow attachment model with uploader role metadata and storage key.
- [ ] Add immutable workflow event model with `reviewCycle`, actor, note, and metadata.
- [ ] Add indexes for resident lookup, review status queues, and deadline queries.
- [ ] Write Prisma migration and validate it against existing ACC import tables.

### 2. Shared Domain Logic

- [ ] Add central workflow constants/types for statuses, decisions, roles, and event names.
- [ ] Add state-transition guards for:
  - submit -> `initial_review`
  - `initial_review` -> `needs_more_info`
  - `needs_more_info` -> `initial_review`
  - `initial_review` -> `approved`
  - `initial_review` -> `rejected`
  - `initial_review` -> `committee_vote`
  - `committee_vote` -> final decision
- [ ] Add helper enforcing same-request resubmission and `reviewCycle` increment.
- [ ] Add helper enforcing first-writer-wins finalization/locking.
- [ ] Add resident ownership guard for resident-facing request endpoints.

### 3. Resident API Surface

- [ ] Implement `POST /api/acc/requests`.
  - Creates workflow request in `initial_review`
  - Writes initial event
  - Stores resident snapshot
- [ ] Implement `GET /api/acc/requests`.
  - Resident sees only own requests
  - Returns resident-safe status summary
- [ ] Implement `GET /api/acc/requests/:id`.
  - Includes `residentActionNote` only when status is `needs_more_info`
- [ ] Implement `PATCH /api/acc/requests/:id`.
  - Allowed only for owner while status is `needs_more_info`
- [ ] Implement `POST /api/acc/requests/:id/resubmit`.
  - Reuses same request
  - Increments `reviewCycle`
  - Clears active `residentActionNote`
  - Writes `resident_resubmitted` event
- [ ] Implement resident attachment upload endpoint(s) for workflow requests.

### 4. Chair/Admin Review API Surface

- [ ] Implement `GET /api/acc/review/initial`.
  - Filter by `initial_review` and `needs_more_info`
  - Include resident summary and action-needed state
- [ ] Implement `POST /api/acc/review/initial/:id/approve`.
- [ ] Implement `POST /api/acc/review/initial/:id/reject`.
- [ ] Implement `POST /api/acc/review/initial/:id/request-more-info`.
  - Requires note
  - Sets `residentActionNote`
  - Writes `more_info_requested` event
- [ ] Implement `POST /api/acc/review/initial/:id/send-to-vote`.
- [ ] Implement `GET /api/acc/review/vote`.
- [ ] Implement `POST /api/acc/review/vote/:id/cast`.
- [ ] Implement `POST /api/acc/review/vote/:id/override`.

### 5. Resident UI

- [ ] Replace placeholder submit success state in `components/portal/acc-submit-page-client.tsx` with real request creation.
- [ ] Add resident attachment upload flow tied to workflow request records.
- [ ] Add `My ACC Requests` page.
- [ ] Add resident request detail page.
- [ ] Add `needs_more_info` presentation:
  - chair note
  - editable fields
  - attachment updates
  - resubmit action
- [ ] Ensure resident never sees internal vote details.

### 6. Management UI

- [ ] Decide whether to adapt `components/portal/acc-queue-neon-table.tsx` or build a dedicated workflow queue component.
- [ ] Add `Initial Review Queue` UI for chair/admin actions.
- [ ] Add workflow request detail view with:
  - request summary
  - editable fields in `initial_review`
  - resident action note
  - attachments
  - audit timeline
- [ ] Add `Committee Vote Queue` UI.
- [ ] Add in-progress/finalized workflow dashboards.
- [ ] Add combined all-submissions dashboard across legacy + native ACC sources.
- [ ] Add source indicator and normalized status display to combined dashboard rows.
- [ ] Add full-data mode for admins, Board, and ACC committee members.
- [ ] Add redacted mode for public-display use, aligned with `wp-acc-queue-redacted`.
- [ ] Keep legacy rows read-only in the combined dashboard.
- [ ] Update page copy so imported ACC queue and native workflow queue are clearly differentiated during transition.

### 7. Notifications

- [ ] Send resident confirmation on submit.
- [ ] Send chair notification on submit.
- [ ] Send resident notification when more information is requested.
- [ ] Send chair notification on resident resubmission.
- [ ] Send committee notification on send-to-vote.
- [ ] Send resident notification on final decision.
- [ ] Add notification test mode so live recipients are not emailed during testing.
- [ ] Decide whether notifications run inline first or via retry-safe job mechanism.

### 8. Audit + Reporting

- [ ] Ensure every state transition writes a workflow event.
- [ ] Ensure workflow requests are never hard-deleted.
- [ ] Add query support for in-progress and finalized workflow reporting.
- [ ] Confirm exports can distinguish imported legacy ACC requests from native workflow requests.

### 9. Testing

- [ ] Unit tests for state transition guards.
- [ ] Unit tests for vote threshold and lock behavior.
- [ ] Unit tests for `reviewCycle` increment and resubmission rules.
- [ ] Integration test: submit -> approve.
- [ ] Integration test: submit -> reject.
- [ ] Integration test: submit -> request more info -> resident edit -> resubmit -> approve.
- [ ] Integration test: submit -> send to vote -> 3-vote finalization.
- [ ] Integration test: chair override during vote.
- [ ] Authorization tests for resident/member/chair/admin boundaries.

### 10. Cutover / Transition

- [ ] Keep current `/api/acc/queue` import-management routes stable until workflow-native routes are validated.
- [ ] Keep WordPress/Gravity submit path active until native workflow submit is ready for cutover.
- [ ] Validate final GF re-migration and resident-linking state before switching resident submit to native workflow.
- [ ] Update portal navigation and management labels once workflow-native pages are authoritative.
- [ ] Prepare rollback plan for reverting resident submit back to WordPress if cutover fails.

### 11. Admin Cleanup / Testing

- [ ] Add admin-only purge endpoint/action for native workflow requests.
- [ ] Require strong confirmation before purge.
- [ ] Ensure purge deletes request + votes + attachments + events.
- [ ] Ensure purge is hidden from residents and non-admin/non-chair users.

## Suggested Build Order

1. Architecture lock
2. Prisma schema + shared domain logic
3. Resident submit API + resident detail/list endpoints
4. Phase 2 loopback endpoints (`request-more-info`, resident edit/resubmit)
5. Resident UI wiring
6. Initial review management UI
7. Committee vote engine
8. Notifications, tests, and cutover prep

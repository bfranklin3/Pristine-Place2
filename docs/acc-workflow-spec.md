# ACC Workflow Spec

Version: 1.1  
Last updated: March 9, 2026

## Purpose

Define the finalized, simple workflow for ACC change requests in the new Next.js portal.

## Scope

- Resident ACC request submission
- Resident resubmission after a request for more information
- Initial Review by ACC Chair(s)
- Optional Committee Vote
- Final decisions and notifications
- Role-based visibility
- Auditability and retention expectations

Related cross-domain identity/linking spec:
- [`docs/resident-360-identity-linking-spec.md`](docs/resident-360-identity-linking-spec.md)

## Roles

- Resident submitter
- ACC committee member
- ACC committee chair
- Admin (platform/site administrator)

## Workflow States

- `initial_review`
- `needs_more_info`
- `committee_vote`
- `approved`
- `rejected`

## Post-Approval Verification

- `verified` is not a primary workflow state.
- It is an optional internal post-approval flag used when approved work has later been confirmed as completed.
- It applies only to already-approved requests.
- Residents do not see verification status.
- No notification emails are sent when a request is marked verified.

## Submission Flow

1. Resident submits ACC request form.
2. System sends email confirmations:
   - To resident: request received.
   - To chair(s): request requires processing.
3. Request enters `initial_review`.

## Step 1: Initial Review (Chair Only)

Chair actions:

1. Approve  
   - Used for minor/routine requests.
   - Request transitions to `approved` and workflow ends.
   - Resident is notified.

2. Reject  
   - Used for disallowed requests or submissions that should not continue in-system.
   - Request transitions to `rejected` and workflow ends.
   - Resident is notified.

3. Request More Information  
   - Used when the request is missing details, clarification, or attachments needed for review.
   - Request transitions to `needs_more_info`.
   - Chair note is required and is shown to the resident.
   - Resident is notified that action is required.

4. Send to Committee Vote  
   - Used for larger/complex requests.
   - Request transitions to `committee_vote`.
   - Committee members are notified with vote deadline.

## Step 1A: Resident Resubmission After More Information Request

- Resident may update request fields and add attachments while the request is in `needs_more_info`.
- Resident resubmits the same request record; this is not treated as a new ACC request.
- On resubmission:
  - status returns to `initial_review`
  - `review_cycle` increments
  - prior votes remain tied to prior cycles
  - full audit history remains attached to the same request
- Chair(s) are notified that the request has been resubmitted.

## Step 2: Committee Vote (Optional)

Voting rules:

- Exactly 3 votes required, then stop.
- Majority wins (2 out of 3).
- Eligible voters: ACC committee members (chair(s) may vote).
- One vote per member per request per cycle.
- No vote edits.

Vote options:

- Approve
- Reject

Chair override:

- Any chair can override during committee vote.
- Override immediately finalizes as `approved` or `rejected`.
- Override requires explanatory note.
- Override cannot be reversed in-system.

Deadline behavior:

- Informational only.
- Dashboards show deadline and days remaining/overdue.

## Visibility Rules

- Residents:
  - status + final decision only for normal in-progress/finalized requests
  - if `needs_more_info`, show the outstanding chair note and allow resubmission
- Committee members/admins: full internal vote activity and progress details.

## Editing Rules

- During `initial_review`, chair(s) may edit request fields and add attachments.
- During `needs_more_info`, the resident submitter may edit request fields and add attachments.
- Attachments allowed from:
  - Resident submitter
  - ACC committee users

## Resubmission Cycle Rule

- `review_cycle` starts at `1` on initial submission.
- `review_cycle` increments only when the resident resubmits after `needs_more_info`.
- The request keeps the same `id` across all cycles.
- A loopback/resubmission must preserve one continuous audit trail.

## Concurrency Rule

If simultaneous actions cross a decision threshold:

- First write that finalizes the request wins.
- Request is then locked from additional vote/decision actions.

## Data Model (Minimum)

1. ACC Request
   - resident snapshot, request fields, status, cycle number
   - outstanding resident-action note when in `needs_more_info`
   - vote deadline
   - final decision summary (who/when/how + notes)
   - optional internal verification metadata for approved requests

2. ACC Votes
   - one vote per member per request cycle

3. ACC Attachments
   - file metadata + uploader + timestamp

4. ACC Events (Audit Log)
   - immutable action history with actor, timestamp, action, notes

## Decision Notes Requirement

- Required for:
  - Reject actions
  - Request More Information actions
  - Chair overrides

## Retention and Audit

- ACC requests/events should not be hard-deleted.
- Maintain exportable audit history for HOA/legal disputes and records requests.

## Admin Purge Exception

- Native workflow requests must support an admin-only hard-delete/purge operation for limited cases:
  - testing cleanup
  - incorrect resident submission replaced by assisted volunteer submission
  - incorrect resident submission replaced by scanned paper submission entered on the resident's behalf
- Purge must remove the workflow request and all workflow-child rows tied to it:
  - votes
  - attachments
  - events
- Purge is not available to residents or committee members.
- Purge does not apply to legacy imported `AccRequest` records used for source-system history.

## Notification Test Mode

- Workflow notifications must support a test mode.
- Preferred behavior:
  - all ACC workflow emails are rerouted to a configured admin testing inbox
- Acceptable fallback:
  - suppress all workflow emails
- In test mode, no workflow emails should be sent to live resident or committee recipients.

## Combined Dashboard Requirement

- The portal should eventually provide one combined ACC submissions dashboard across both sources:
  - legacy WordPress/imported ACC submissions
  - native Neon workflow submissions
- This combined dashboard is operational/reporting-oriented and does not replace the native workflow queue.
- The combined dashboard should support two display modes:
  - full data view for admins, Board members, and ACC committee members
  - redacted view for public display, consistent with the current redacted WordPress ACC queue behavior
- Each row should clearly identify its source system and normalized status.
- Legacy rows remain read-only; native rows may link into native workflow detail/actions.

## Future Enhancements (Out of Scope for v1)

- Downloadable decision letters
- Committee-vote return-to-resident loopback path
- Expanded committee/role controls for workflow routing

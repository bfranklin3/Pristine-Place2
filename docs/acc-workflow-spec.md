# ACC Workflow Spec

Version: 1.0  
Last updated: February 28, 2026

## Purpose

Define the finalized, simple workflow for ACC change requests in the new Next.js portal.

## Scope

- Resident ACC request submission
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
- `committee_vote`
- `approved`
- `rejected`
- Future state (not yet implemented): `needs_more_info` and `verified` 

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
   - Used for disallowed requests or incomplete/invalid submissions.
   - Request transitions to `rejected` and workflow ends.
   - Resident is notified.

3. Send to Committee Vote  
   - Used for larger/complex requests.
   - Request transitions to `committee_vote`.
   - Committee members are notified with vote deadline.

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
- Future (not yet implemented): Provide More Information

Chair override:

- Any chair can override during committee vote.
- Override immediately finalizes as `approved` or `rejected`.
- Override requires explanatory note.
- Override cannot be reversed in-system.

Deadline behavior:

- Informational only.
- Dashboards show deadline and days remaining/overdue.

## Visibility Rules

- Residents: status + final decision only.
- Committee members/admins: full internal vote activity and progress details.

## Editing Rules

- During `initial_review`, chair(s) may edit request fields and add attachments.
- Attachments allowed from:
  - Resident submitter
  - ACC committee users

## Concurrency Rule

If simultaneous actions cross a decision threshold:

- First write that finalizes the request wins.
- Request is then locked from additional vote/decsion actions.

## Data Model (Minimum)

1. ACC Request
   - resident snapshot, request fields, status, cycle number
   - vote deadline
   - final decision summary (who/when/how + notes)

2. ACC Votes
   - one vote per member per request cycle

3. ACC Attachments
   - file metadata + uploader + timestamp

4. ACC Events (Audit Log)
   - immutable action history with actor, timestamp, action, notes

## Decision Notes Requirement

- Required for:
  - Reject actions
  - Chair overrides

## Retention and Audit

- ACC requests/events should not be hard-deleted.
- Maintain exportable audit history for HOA/legal disputes and records requests.

## Future Enhancements (Out of Scope for v1)

- Provide More Information loopback to resident and resubmission cycle handling
- Downloadable decision letters
- Expanded committee/role controls for workflow routing
- Add  `verified`  state; used only for `approved` submissions. Used when completion of work has been verified.

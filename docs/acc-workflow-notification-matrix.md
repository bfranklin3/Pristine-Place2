# ACC Workflow Notification Matrix

Version: 1.0  
Last updated: March 9, 2026  
Related documents:
- [`docs/acc-workflow-spec.md`](./acc-workflow-spec.md)
- [`docs/acc-workflow-implementation-plan.md`](./acc-workflow-implementation-plan.md)

## Purpose

Define the v1 email notification events, recipients, and timing for the native ACC workflow.

## v1 Principles

- Send notifications on workflow events that require a person to act or that close the loop for the resident.
- Keep resident emails simple and status-oriented.
- Keep committee emails action-oriented and link directly to the request.
- Use the same ACC request record throughout the `needs_more_info` loopback; notifications should refer to the same request.

## Notification Matrix

| Event | Trigger | Recipient(s) | Purpose | Required in v1 |
|---|---|---|---|---|
| Request submitted | Resident creates a new ACC request | Resident submitter | Confirm the request was received | Yes |
| Request submitted | Resident creates a new ACC request | ACC chair(s) | Notify chair that initial review is needed | Yes |
| More information requested | Chair moves request to `needs_more_info` with note | Resident submitter | Tell resident what is missing and that action is required | Yes |
| Resident resubmitted | Resident updates and resubmits same request | ACC chair(s) | Notify chair that request is back in `initial_review` | Yes |
| Sent to committee vote | Chair moves request to `committee_vote` | ACC committee members eligible to vote | Notify committee that a vote is needed and show deadline | Yes |
| Initial-review approved | Chair approves during `initial_review` | Resident submitter | Deliver final approval decision | Yes |
| Initial-review rejected | Chair rejects during `initial_review` | Resident submitter | Deliver final rejection decision | Yes |
| Vote finalized approved | Committee voting reaches approval threshold | Resident submitter | Deliver final approval decision | Yes |
| Vote finalized rejected | Committee voting reaches rejection threshold | Resident submitter | Deliver final rejection decision | Yes |
| Chair override approved | Chair overrides during vote as approved | Resident submitter | Deliver final approval decision | Yes |
| Chair override rejected | Chair overrides during vote as rejected | Resident submitter | Deliver final rejection decision | Yes |
| Completion verified | Admin or ACC chair marks an approved request as verified complete | None | Internal-only completion tracking | No email |
| Chair override informational | Chair overrides during vote | ACC committee members | Inform committee that voting was superseded by chair override | Optional |
| Vote reminder | Request remains in `committee_vote` near or past deadline | ACC committee members who have not voted | Prompt completion of outstanding votes | Not in v1 |

## Resident-Facing Portal Behavior

- Resident gets a `My ACC Requests` list page showing only their own submissions.
- Resident gets an `ACC Request Detail` page for each request.
- When status is `needs_more_info`, the detail page becomes editable for the resident.
- Resident can update fields and attachments on that same request and click `Resubmit`.
- Resident does not see internal committee-vote detail.
- Resident does not see internal verification/completion status.

## Required Email Contents

### Resident submission confirmation

- Request identifier
- Submitted date/time
- Address and project summary
- Current status: `initial_review`
- Portal link to request detail

### More information requested

- Request identifier
- Chair note listing missing details or attachments
- Portal link to request detail/edit page
- Clear action prompt to update and resubmit

### Resident resubmitted notification to chair

- Request identifier
- Resident name
- Address and project summary
- Link to review page
- Indication that the request was resubmitted after `needs_more_info`

### Committee vote notification

- Request identifier
- Resident/project summary
- Vote deadline
- Link to voting page

### Final decision email to resident

- Request identifier
- Final decision: approved or rejected
- Decision note when applicable
- Link to request detail

## Recipient Rules

- `ACC chair(s)` means users with chair authority for the ACC committee.
- `ACC committee members eligible to vote` means ACC committee members, including chairs if chairs are allowed to vote for that cycle.
- Resident emails go only to the submitting resident for v1.

## Deferred Decisions

These do not need to block schema or migration work:

- Final subject lines and template copy
- Sender display name and reply-to policy
- Retry-safe job infrastructure versus inline send on first implementation
- Reminder cadence for committee vote follow-ups

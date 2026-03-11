# ACC Workflow Email Template Reference

Use this note when creating the ACC workflow `emailTemplate` documents in Sanity.

Draft copy:
- [ACC Workflow Email Template Drafts](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/docs/acc-workflow-email-template-drafts.md)

## Required Template Keys

- `acc_workflow_submitted_resident`
- `acc_workflow_submitted_chair`
- `acc_workflow_more_info_resident`
- `acc_workflow_resubmitted_chair`
- `acc_workflow_sent_to_vote_committee`
- `acc_workflow_approved_resident`
- `acc_workflow_rejected_resident`

## Supported Placeholders

These placeholders are supported by the current ACC workflow notification code in [`lib/email/acc-workflow-notifications.ts`](../lib/email/acc-workflow-notifications.ts):

- `{{requestId}}`
- `{{requestNumber}}`
- `{{requestTitle}}`
- `{{residentName}}`
- `{{residentEmail}}`
- `{{residentAddress}}`
- `{{residentActionNote}}`
- `{{decisionNote}}`
- `{{voteDeadlineAt}}`
- `{{detailUrl}}`
- `{{managementUrl}}`
- `{{contactEmail}}`

## Template Intent

- `acc_workflow_submitted_resident`
  - confirm the resident submission was received
  - include `{{requestNumber}}` when helpful
  - link to `{{detailUrl}}`
- `acc_workflow_submitted_chair`
  - notify ACC chair(s) that a request is ready for initial review
  - include `{{requestNumber}}` when helpful
  - link to `{{managementUrl}}`
- `acc_workflow_more_info_resident`
  - notify resident that more information is required
  - include `{{requestNumber}}` when helpful
  - include `{{residentActionNote}}`
  - link to `{{detailUrl}}`
- `acc_workflow_resubmitted_chair`
  - notify chair(s) that the resident resubmitted the same request
  - include `{{requestNumber}}` when helpful
  - link to `{{managementUrl}}`
- `acc_workflow_sent_to_vote_committee`
  - notify eligible ACC committee members that a vote is required
  - include `{{requestNumber}}` when helpful
  - include `{{voteDeadlineAt}}`
  - link to `{{managementUrl}}`
- `acc_workflow_approved_resident`
  - notify resident of approval
  - include `{{requestNumber}}` when helpful
  - include `{{decisionNote}}` if present
  - link to `{{detailUrl}}`
- `acc_workflow_rejected_resident`
  - notify resident of rejection
  - include `{{requestNumber}}` when helpful
  - include `{{decisionNote}}`
  - link to `{{detailUrl}}`

## Notes

- If a Sanity template is missing or inactive, the app currently falls back to code-defined email content.
- Test-mode routing is controlled separately by:
  - `ACC_WORKFLOW_EMAIL_MODE`
  - `ACC_WORKFLOW_TEST_INBOX`

## ACC Test Mode

Use these environment variables to control ACC workflow email delivery during testing and rollout:

- `ACC_WORKFLOW_EMAIL_MODE=live`
  - normal behavior
  - sends to the real intended recipients
- `ACC_WORKFLOW_EMAIL_MODE=reroute`
  - preferred testing mode
  - sends all ACC workflow emails to the inbox in `ACC_WORKFLOW_TEST_INBOX`
  - current implementation also adds:
    - subject prefix: `[ACC TEST]`
    - HTML notice block showing `Delivery mode: reroute`
    - HTML notice block showing the original intended recipients
    - for resident-targeted emails, a note that the resident link must be opened as the resident account
    - a management fallback link to the ACC workflow queue for the same request
- `ACC_WORKFLOW_EMAIL_MODE=suppress`
  - sends no ACC workflow emails
  - useful for local development or data seeding when delivery should be disabled entirely

Recommended usage:

- local development:
  - `ACC_WORKFLOW_EMAIL_MODE=suppress`
- staging / rollout testing:
  - `ACC_WORKFLOW_EMAIL_MODE=reroute`
  - `ACC_WORKFLOW_TEST_INBOX=admin-test@example.com`
- production go-live:
  - `ACC_WORKFLOW_EMAIL_MODE=live`

Operational notes:

- `reroute` is safer than `live` during testing because it proves the trigger, template rendering, and send pipeline without notifying residents or committee users.
- If `ACC_WORKFLOW_EMAIL_MODE=reroute` but `ACC_WORKFLOW_TEST_INBOX` is empty, ACC workflow emails will not be delivered.
- ACC workflow notification logs now record:
  - template key
  - request id
  - delivery mode
  - original intended recipients
  - effective recipients
  - delivered / warning state

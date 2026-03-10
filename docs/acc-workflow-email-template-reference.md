# ACC Workflow Email Template Reference

Use this note when creating the ACC workflow `emailTemplate` documents in Sanity.

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
  - link to `{{detailUrl}}`
- `acc_workflow_submitted_chair`
  - notify ACC chair(s) that a request is ready for initial review
  - link to `{{managementUrl}}`
- `acc_workflow_more_info_resident`
  - notify resident that more information is required
  - include `{{residentActionNote}}`
  - link to `{{detailUrl}}`
- `acc_workflow_resubmitted_chair`
  - notify chair(s) that the resident resubmitted the same request
  - link to `{{managementUrl}}`
- `acc_workflow_sent_to_vote_committee`
  - notify eligible ACC committee members that a vote is required
  - include `{{voteDeadlineAt}}`
  - link to `{{managementUrl}}`
- `acc_workflow_approved_resident`
  - notify resident of approval
  - include `{{decisionNote}}` if present
  - link to `{{detailUrl}}`
- `acc_workflow_rejected_resident`
  - notify resident of rejection
  - include `{{decisionNote}}`
  - link to `{{detailUrl}}`

## Notes

- If a Sanity template is missing or inactive, the app currently falls back to code-defined email content.
- Test-mode routing is controlled separately by:
  - `ACC_WORKFLOW_EMAIL_MODE`
  - `ACC_WORKFLOW_TEST_INBOX`

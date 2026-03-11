# ACC Workflow Email Template Drafts

Use this note to create the ACC workflow `emailTemplate` documents in Sanity using the same copy that is currently working in the app fallback templates.

Reference:
- [ACC Workflow Email Template Reference](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/docs/acc-workflow-email-template-reference.md)
- [ACC notification code](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/lib/email/acc-workflow-notifications.ts)

## `acc_workflow_submitted_resident`

Subject:

```text
ACC request received: {{requestTitle}}
```

HTML Body:

```html
<p>Your ACC request has been received.</p>
<p><strong>Request:</strong> {{requestTitle}}</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><a href="{{detailUrl}}">View your request</a></p>
```

Text Body:

```text
Your ACC request has been received.

Request: {{requestTitle}}
Request Number: {{requestNumber}}

View your request:
{{detailUrl}}
```

## `acc_workflow_submitted_chair`

Subject:

```text
ACC review needed: {{requestTitle}}
```

HTML Body:

```html
<p>A new ACC request is ready for initial review.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Resident:</strong> {{residentName}}</p>
<p><strong>Address:</strong> {{residentAddress}}</p>
<p><a href="{{managementUrl}}">Open ACC workflow queue</a></p>
```

Text Body:

```text
A new ACC request is ready for initial review.

Request Number: {{requestNumber}}
Resident: {{residentName}}
Address: {{residentAddress}}

Open ACC workflow queue:
{{managementUrl}}
```

## `acc_workflow_more_info_resident`

Subject:

```text
More information needed for your ACC request
```

HTML Body:

```html
<p>Your ACC request needs more information before review can continue.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Note:</strong> {{residentActionNote}}</p>
<p><a href="{{detailUrl}}">Open your request</a></p>
```

Text Body:

```text
Your ACC request needs more information before review can continue.

Request Number: {{requestNumber}}
Note: {{residentActionNote}}

Open your request:
{{detailUrl}}
```

## `acc_workflow_resubmitted_chair`

Subject:

```text
ACC request resubmitted: {{requestTitle}}
```

HTML Body:

```html
<p>A resident has updated and resubmitted an ACC request.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Resident:</strong> {{residentName}}</p>
<p><a href="{{managementUrl}}">Open ACC workflow queue</a></p>
```

Text Body:

```text
A resident has updated and resubmitted an ACC request.

Request Number: {{requestNumber}}
Resident: {{residentName}}

Open ACC workflow queue:
{{managementUrl}}
```

## `acc_workflow_sent_to_vote_committee`

Subject:

```text
ACC vote requested: {{requestTitle}}
```

HTML Body:

```html
<p>An ACC request is ready for committee vote.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Resident:</strong> {{residentName}}</p>
<p><strong>Deadline:</strong> {{voteDeadlineAt}}</p>
<p><a href="{{managementUrl}}">Open ACC workflow queue</a></p>
```

Text Body:

```text
An ACC request is ready for committee vote.

Request Number: {{requestNumber}}
Resident: {{residentName}}
Deadline: {{voteDeadlineAt}}

Open ACC workflow queue:
{{managementUrl}}
```

## `acc_workflow_approved_resident`

Subject:

```text
ACC request approved: {{requestTitle}}
```

HTML Body:

```html
<p>Your ACC request has been approved.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Note:</strong> {{decisionNote}}</p>
<p><a href="{{detailUrl}}">View your request</a></p>
```

Text Body:

```text
Your ACC request has been approved.

Request Number: {{requestNumber}}
Note: {{decisionNote}}

View your request:
{{detailUrl}}
```

## `acc_workflow_rejected_resident`

Subject:

```text
ACC request decision: {{requestTitle}}
```

HTML Body:

```html
<p>Your ACC request has been rejected.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Note:</strong> {{decisionNote}}</p>
<p><a href="{{detailUrl}}">View your request</a></p>
```

Text Body:

```text
Your ACC request has been rejected.

Request Number: {{requestNumber}}
Note: {{decisionNote}}

View your request:
{{detailUrl}}
```

## Notes

- These drafts mirror the current fallback copy, with `Request Number` included consistently.
- In production content, if a note is truly optional for a given template, editors can choose wording that still reads naturally when the field is blank. The current app fallback already suppresses optional note blocks in some cases.
- Keep the hardcoded fallback in place until all Sanity templates are created and verified.

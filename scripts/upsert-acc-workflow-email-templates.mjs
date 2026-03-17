import { createClient } from "@sanity/client"

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const token = process.env.SANITY_API_TOKEN

if (!projectId || !dataset || !token) {
  throw new Error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, or SANITY_API_TOKEN")
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  token,
  useCdn: false,
})

const templates = [
  {
    key: "acc_workflow_submitted_resident",
    subject: "ACC request received: {{requestTitle}}",
    htmlBody: `<p>Your ACC request has been received and is now in review.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Project:</strong> {{requestTitle}}</p>
<p><strong>Property Address:</strong> {{residentAddress}}</p>
<p>Online submissions are usually reviewed within one week. Decisions are communicated by email or phone.</p>
<p><a href="{{detailUrl}}">View your request in the resident portal</a></p>
<p>If you have questions, contact the ACC at <a href="mailto:{{contactEmail}}">{{contactEmail}}</a>.</p>`,
    textBody: `Your ACC request has been received and is now in review.

Request Number: {{requestNumber}}
Project: {{requestTitle}}
Property Address: {{residentAddress}}

Online submissions are usually reviewed within one week. Decisions are communicated by email or phone.

View your request in the resident portal:
{{detailUrl}}

If you have questions, contact the ACC at {{contactEmail}}.`,
  },
  {
    key: "acc_workflow_submitted_chair",
    subject: "ACC review needed: {{requestTitle}}",
    htmlBody: `<p>A new ACC request is ready for initial review.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Resident:</strong> {{residentName}}</p>
<p><strong>Address:</strong> {{residentAddress}}</p>
<p><a href="{{managementUrl}}">Open ACC workflow queue</a></p>`,
    textBody: `A new ACC request is ready for initial review.

Request Number: {{requestNumber}}
Resident: {{residentName}}
Address: {{residentAddress}}

Open ACC workflow queue:
{{managementUrl}}`,
  },
  {
    key: "acc_workflow_more_info_resident",
    subject: "More information needed for your ACC request",
    htmlBody: `<p>Your ACC request needs more information before review can continue.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Project:</strong> {{requestTitle}}</p>
<p><strong>Property Address:</strong> {{residentAddress}}</p>
<p><strong>ACC Note:</strong> {{residentActionNote}}</p>
<p><a href="{{detailUrl}}">Update and resubmit your request in the resident portal</a></p>
<p>If you have questions, contact the ACC at <a href="mailto:{{contactEmail}}">{{contactEmail}}</a>.</p>`,
    textBody: `Your ACC request needs more information before review can continue.

Request Number: {{requestNumber}}
Project: {{requestTitle}}
Property Address: {{residentAddress}}
ACC Note: {{residentActionNote}}

Update and resubmit your request in the resident portal:
{{detailUrl}}

If you have questions, contact the ACC at {{contactEmail}}.`,
  },
  {
    key: "acc_workflow_resubmitted_chair",
    subject: "ACC request resubmitted: {{requestTitle}}",
    htmlBody: `<p>A resident has updated and resubmitted an ACC request.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Resident:</strong> {{residentName}}</p>
<p><a href="{{managementUrl}}">Open ACC workflow queue</a></p>`,
    textBody: `A resident has updated and resubmitted an ACC request.

Request Number: {{requestNumber}}
Resident: {{residentName}}

Open ACC workflow queue:
{{managementUrl}}`,
  },
  {
    key: "acc_workflow_sent_to_vote_committee",
    subject: "ACC vote requested: {{requestTitle}}",
    htmlBody: `<p>An ACC request is ready for committee vote.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Resident:</strong> {{residentName}}</p>
<p><strong>Deadline:</strong> {{voteDeadlineAt}}</p>
<p><a href="{{managementUrl}}">Open ACC workflow queue</a></p>`,
    textBody: `An ACC request is ready for committee vote.

Request Number: {{requestNumber}}
Resident: {{residentName}}
Deadline: {{voteDeadlineAt}}

Open ACC workflow queue:
{{managementUrl}}`,
  },
  {
    key: "acc_workflow_approved_resident",
    subject: "ACC request approved: {{requestTitle}}",
    htmlBody: `<p>Your ACC request has been approved.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Permit Number:</strong> {{permitNumber}}</p>
<p><strong>Project:</strong> {{requestTitle}}</p>
<p><strong>Property Address:</strong> {{residentAddress}}</p>
<p><strong>Decision Note:</strong> {{decisionNote}}</p>
<p><a href="{{detailUrl}}">View your request in the resident portal</a></p>
<p>If you have questions, contact the ACC at <a href="mailto:{{contactEmail}}">{{contactEmail}}</a>.</p>`,
    textBody: `Your ACC request has been approved.

Request Number: {{requestNumber}}
Permit Number: {{permitNumber}}
Project: {{requestTitle}}
Property Address: {{residentAddress}}
Decision Note: {{decisionNote}}

View your request in the resident portal:
{{detailUrl}}

If you have questions, contact the ACC at {{contactEmail}}.`,
  },
  {
    key: "acc_workflow_rejected_resident",
    subject: "ACC request decision: {{requestTitle}}",
    htmlBody: `<p>Your ACC request was not approved.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Project:</strong> {{requestTitle}}</p>
<p><strong>Property Address:</strong> {{residentAddress}}</p>
<p><strong>Decision Note:</strong> {{decisionNote}}</p>
<p><a href="{{detailUrl}}">View your request in the resident portal</a></p>
<p>If you have questions, contact the ACC at <a href="mailto:{{contactEmail}}">{{contactEmail}}</a>.</p>`,
    textBody: `Your ACC request was not approved.

Request Number: {{requestNumber}}
Project: {{requestTitle}}
Property Address: {{residentAddress}}
Decision Note: {{decisionNote}}

View your request in the resident portal:
{{detailUrl}}

If you have questions, contact the ACC at {{contactEmail}}.`,
  },
]

const transaction = client.transaction()

for (const template of templates) {
  transaction.createOrReplace({
    _id: `emailTemplate.${template.key}`,
    _type: "emailTemplate",
    key: template.key,
    subject: template.subject,
    htmlBody: template.htmlBody,
    textBody: template.textBody,
    isActive: true,
  })
}

const result = await transaction.commit()

console.log(
  JSON.stringify(
    {
      upserted: templates.map((template) => template.key),
      transactionId: result.transactionId,
      dataset,
      projectId,
    },
    null,
    2,
  ),
)

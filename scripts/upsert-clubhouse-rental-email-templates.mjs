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
    key: "clubhouse_rental_submitted_resident",
    subject: "Clubhouse rental request received: {{requestTitle}}",
    htmlBody: `<p>Your clubhouse rental request has been received.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Reservation:</strong> {{reservationDate}} · {{reservationTime}}</p>
<p><a href="{{detailUrl}}">View your request</a></p>`,
    textBody: `Your clubhouse rental request has been received.

Request Number: {{requestNumber}}
Reservation: {{reservationDate}} · {{reservationTime}}

View your request:
{{detailUrl}}`,
  },
  {
    key: "clubhouse_rental_submitted_admin",
    subject: "Clubhouse rental review needed: {{requestTitle}}",
    htmlBody: `<p>A new clubhouse rental request is ready for review.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Resident:</strong> {{residentName}}</p>
<p><strong>Address:</strong> {{residentAddress}}</p>
<p><strong>Reservation:</strong> {{reservationDate}} · {{reservationTime}}</p>
<p><a href="{{managementUrl}}">Open clubhouse rental queue</a></p>`,
    textBody: `A new clubhouse rental request is ready for review.

Request Number: {{requestNumber}}
Resident: {{residentName}}
Address: {{residentAddress}}
Reservation: {{reservationDate}} · {{reservationTime}}

Open clubhouse rental queue:
{{managementUrl}}`,
  },
  {
    key: "clubhouse_rental_more_info_resident",
    subject: "More information needed for your clubhouse rental request",
    htmlBody: `<p>Your clubhouse rental request needs more information before review can continue.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Reservation:</strong> {{reservationDate}} · {{reservationTime}}</p>
<p><strong>Note:</strong> {{residentActionNote}}</p>
<p><a href="{{detailUrl}}">Open your request</a></p>`,
    textBody: `Your clubhouse rental request needs more information before review can continue.

Request Number: {{requestNumber}}
Reservation: {{reservationDate}} · {{reservationTime}}
Note: {{residentActionNote}}

Open your request:
{{detailUrl}}`,
  },
  {
    key: "clubhouse_rental_resubmitted_admin",
    subject: "Clubhouse rental request resubmitted: {{requestTitle}}",
    htmlBody: `<p>A resident has updated and resubmitted a clubhouse rental request.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Resident:</strong> {{residentName}}</p>
<p><strong>Reservation:</strong> {{reservationDate}} · {{reservationTime}}</p>
<p><a href="{{managementUrl}}">Open clubhouse rental queue</a></p>`,
    textBody: `A resident has updated and resubmitted a clubhouse rental request.

Request Number: {{requestNumber}}
Resident: {{residentName}}
Reservation: {{reservationDate}} · {{reservationTime}}

Open clubhouse rental queue:
{{managementUrl}}`,
  },
  {
    key: "clubhouse_rental_approved_resident",
    subject: "Clubhouse rental request approved: {{requestTitle}}",
    htmlBody: `<p>Your clubhouse rental request has been approved.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Reservation:</strong> {{reservationDate}} · {{reservationTime}}</p>
<p><strong>Note:</strong> {{decisionNote}}</p>
<p><a href="{{detailUrl}}">View your request</a></p>`,
    textBody: `Your clubhouse rental request has been approved.

Request Number: {{requestNumber}}
Reservation: {{reservationDate}} · {{reservationTime}}
Note: {{decisionNote}}

View your request:
{{detailUrl}}`,
  },
  {
    key: "clubhouse_rental_rejected_resident",
    subject: "Clubhouse rental request decision: {{requestTitle}}",
    htmlBody: `<p>Your clubhouse rental request has been rejected.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Reservation:</strong> {{reservationDate}} · {{reservationTime}}</p>
<p><strong>Note:</strong> {{decisionNote}}</p>
<p><a href="{{detailUrl}}">View your request</a></p>`,
    textBody: `Your clubhouse rental request has been rejected.

Request Number: {{requestNumber}}
Reservation: {{reservationDate}} · {{reservationTime}}
Note: {{decisionNote}}

View your request:
{{detailUrl}}`,
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

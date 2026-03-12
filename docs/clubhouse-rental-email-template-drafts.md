# Clubhouse Rental Email Template Drafts

Use this note to create the clubhouse rental `emailTemplate` documents in Sanity using the same copy that is currently working in the app fallback templates.

Reference:
- [Clubhouse Rental Email Template Reference](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/docs/clubhouse-rental-email-template-reference.md)
- [Clubhouse rental notification code](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/lib/email/clubhouse-rental-notifications.ts)

## `clubhouse_rental_submitted_resident`

Subject:

```text
Clubhouse rental request received: {{requestTitle}}
```

HTML Body:

```html
<p>Your clubhouse rental request has been received.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Reservation:</strong> {{reservationDate}} · {{reservationTime}}</p>
<p><a href="{{detailUrl}}">View your request</a></p>
```

Text Body:

```text
Your clubhouse rental request has been received.

Request Number: {{requestNumber}}
Reservation: {{reservationDate}} · {{reservationTime}}

View your request:
{{detailUrl}}
```

## `clubhouse_rental_submitted_admin`

Subject:

```text
Clubhouse rental review needed: {{requestTitle}}
```

HTML Body:

```html
<p>A new clubhouse rental request is ready for review.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Resident:</strong> {{residentName}}</p>
<p><strong>Address:</strong> {{residentAddress}}</p>
<p><strong>Reservation:</strong> {{reservationDate}} · {{reservationTime}}</p>
<p><a href="{{managementUrl}}">Open clubhouse rental queue</a></p>
```

Text Body:

```text
A new clubhouse rental request is ready for review.

Request Number: {{requestNumber}}
Resident: {{residentName}}
Address: {{residentAddress}}
Reservation: {{reservationDate}} · {{reservationTime}}

Open clubhouse rental queue:
{{managementUrl}}
```

## `clubhouse_rental_more_info_resident`

Subject:

```text
More information needed for your clubhouse rental request
```

HTML Body:

```html
<p>Your clubhouse rental request needs more information before review can continue.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Reservation:</strong> {{reservationDate}} · {{reservationTime}}</p>
<p><strong>Note:</strong> {{residentActionNote}}</p>
<p><a href="{{detailUrl}}">Open your request</a></p>
```

Text Body:

```text
Your clubhouse rental request needs more information before review can continue.

Request Number: {{requestNumber}}
Reservation: {{reservationDate}} · {{reservationTime}}
Note: {{residentActionNote}}

Open your request:
{{detailUrl}}
```

## `clubhouse_rental_resubmitted_admin`

Subject:

```text
Clubhouse rental request resubmitted: {{requestTitle}}
```

HTML Body:

```html
<p>A resident has updated and resubmitted a clubhouse rental request.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Resident:</strong> {{residentName}}</p>
<p><strong>Reservation:</strong> {{reservationDate}} · {{reservationTime}}</p>
<p><a href="{{managementUrl}}">Open clubhouse rental queue</a></p>
```

Text Body:

```text
A resident has updated and resubmitted a clubhouse rental request.

Request Number: {{requestNumber}}
Resident: {{residentName}}
Reservation: {{reservationDate}} · {{reservationTime}}

Open clubhouse rental queue:
{{managementUrl}}
```

## `clubhouse_rental_approved_resident`

Subject:

```text
Clubhouse rental request approved: {{requestTitle}}
```

HTML Body:

```html
<p>Your clubhouse rental request has been approved.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Reservation:</strong> {{reservationDate}} · {{reservationTime}}</p>
<p><strong>Note:</strong> {{decisionNote}}</p>
<p><a href="{{detailUrl}}">View your request</a></p>
```

Text Body:

```text
Your clubhouse rental request has been approved.

Request Number: {{requestNumber}}
Reservation: {{reservationDate}} · {{reservationTime}}
Note: {{decisionNote}}

View your request:
{{detailUrl}}
```

## `clubhouse_rental_rejected_resident`

Subject:

```text
Clubhouse rental request decision: {{requestTitle}}
```

HTML Body:

```html
<p>Your clubhouse rental request has been rejected.</p>
<p><strong>Request Number:</strong> {{requestNumber}}</p>
<p><strong>Reservation:</strong> {{reservationDate}} · {{reservationTime}}</p>
<p><strong>Note:</strong> {{decisionNote}}</p>
<p><a href="{{detailUrl}}">View your request</a></p>
```

Text Body:

```text
Your clubhouse rental request has been rejected.

Request Number: {{requestNumber}}
Reservation: {{reservationDate}} · {{reservationTime}}
Note: {{decisionNote}}

View your request:
{{detailUrl}}
```

## Notes

- These drafts mirror the current fallback copy, with reservation timing included consistently.
- Keep the hardcoded fallback in place until all Sanity templates are created and verified.

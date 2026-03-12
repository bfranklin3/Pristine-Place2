# Clubhouse Rental Email Template Reference

Use this note when creating the clubhouse rental `emailTemplate` documents in Sanity.

Draft content:
- [Clubhouse Rental Email Template Drafts](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/docs/clubhouse-rental-email-template-drafts.md)

## Template Keys

- `clubhouse_rental_submitted_resident`
- `clubhouse_rental_submitted_admin`
- `clubhouse_rental_more_info_resident`
- `clubhouse_rental_resubmitted_admin`
- `clubhouse_rental_approved_resident`
- `clubhouse_rental_rejected_resident`

## Supported Placeholders

- `{{requestId}}`
- `{{requestNumber}}`
- `{{requestTitle}}`
- `{{residentName}}`
- `{{residentEmail}}`
- `{{residentAddress}}`
- `{{residentActionNote}}`
- `{{decisionNote}}`
- `{{reservationDate}}`
- `{{reservationTime}}`
- `{{detailUrl}}`
- `{{managementDetailUrl}}`
- `{{managementUrl}}`
- `{{contactEmail}}`

## Email Modes

Clubhouse rental workflow emails support the same three-mode pattern as ACC:

- `CLUBHOUSE_RENTAL_EMAIL_MODE=live`
- `CLUBHOUSE_RENTAL_EMAIL_MODE=reroute`
- `CLUBHOUSE_RENTAL_EMAIL_MODE=suppress`

When `reroute` is enabled, set:

- `CLUBHOUSE_RENTAL_TEST_INBOX`

Reroute behavior:

- subject prefix: `[CLUBHOUSE TEST]`
- original intended recipients shown in the email body
- resident-targeted rerouted emails include management fallback guidance

## Current Runtime Events

- resident submission confirmation
- admin notification on submission
- resident more-info notice
- admin notification on resident resubmission
- resident approval notice
- resident rejection notice

# Clubhouse Rental Online Form Spec

Date: March 12, 2026

## Purpose

This note converts the current WordPress Gravity Form `45` (`CLUBHOUSE RENTAL REQUEST FORM`) into a proposed field-by-field specification for the future `Clubhouse Rental Online` experience at:

- `/resident-portal/management/clubhouse-rental-online`

This is intended as a cleaner, more portal-friendly replacement for the old form. It should preserve the important rental-request data while removing paper-form artifacts, duplicated language, and internal committee-only fields from the resident submission flow.

## Source Form Summary

The current Gravity Form `45` contains these main groups:

- resident identity and contact information
- reservation date and time
- event type
- homeowner address
- homeowner insurance company and policy number
- long rental-agreement text sections
- consent
- committee disposition/signature fields

## Main Problems In The Old Form

- It mixes resident submission fields with internal committee decision fields.
- It includes duplicated or overly long agreement text blocks.
- It uses a paper-agreement layout rather than a cleaner portal workflow.
- It has redundant time capture:
  - `Rent From (Time)` / `Rent To (Time)`
  - `Rental Time` / `To: (Time)`
- It does not guide the resident through availability, rental rules, and required uploads in a very clear order.

## Design Goals

The new form should:

- feel like a resident-facing portal workflow, not a scanned paper form
- collect only the information needed from the resident
- separate resident submission from internal review/approval fields
- support future workflow states and calendar availability checks
- be easier to read, complete, and review

## Workflow Direction

The future clubhouse rental workflow should allow the reviewing admin or committee to return a request to the submitter when more information is needed.

Recommended future pattern:

- submitted
- needs more information
- approved
- rejected

This should follow the same high-level loopback idea already used for ACC:

- reviewer requests more information
- submitter updates the same request
- submitter resubmits without creating a brand-new request record

## High-Level Structure

Recommended form sections:

1. Resident Information
2. Event Details
3. Rental Details
4. Insurance & Attachments
5. Agreement & Submission

## Field-By-Field Proposal

### 1. Resident Information

#### Resident Name

- Type: text
- Required: yes
- Source form field: `23` `Reserved by: (Owner's Name)`
- Notes:
  - Prefill from portal profile when available.
  - Allow editing in case the stored profile needs correction.

#### Best Contact Phone

- Type: phone
- Required: yes
- Source form field: `41` `Owners Best Contact Phone Number`
- Notes:
  - Prefill when available.

#### Best Email Address

- Type: email
- Required: yes
- Source form field: `20` `Owners Best Email Address`
- Notes:
  - Use a single email input in the portal form.
  - Confirmation field is optional if we trust account email, but can remain if desired.

#### Property Address

- Type: address or resident-property selector
- Required: yes
- Source form field: `11` `Homeowner's Address`
- Notes:
  - Prefer prefilled resident address from portal data.
  - Do not make users re-enter full address if we already know it.

## 2. Event Details

#### Event Type

- Type: text or select with optional `Other`
- Required: yes
- Source form field: `51`
- Notes:
  - Suggested common values:
    - Birthday Party
    - Anniversary Celebration
    - Reception
    - Family Gathering
    - Meeting
    - Other

#### Reservation Date

- Type: date
- Required: yes
- Source form field: `15`
- Notes:
  - This field should eventually validate against clubhouse availability.

#### Start Time

- Type: time select
- Required: yes
- Source form fields:
  - `59` `Rent From (Time)`
  - redundant overlap with `42`
- Notes:
  - Keep only one start-time field in the new form.

#### End Time

- Type: time select
- Required: yes
- Source form fields:
  - `60` `Rent To (Time)`
  - redundant overlap with `43`
- Notes:
  - Keep only one end-time field in the new form.

#### Estimated Guest Count

- Type: number
- Required: yes
- Source form field: none in old form
- Notes:
  - This should be added in the new version.
  - Helps validate capacity expectations.

## 3. Rental Details

#### Requested Space

- Type: select
- Required: yes
- Source form field: implied, but not clearly modeled in old form
- Default: `Grand Ballroom`
- Notes:
  - Because current rental is ballroom-focused, the first version can default to:
    - Grand Ballroom
  - Later, if needed, expand to other clubhouse rental scopes.

#### Additional Spaces / Included Areas

- Type: read-only informational section or optional multi-select
- Required: no
- Source form: informational only
- Notes:
  - Old page references kitchen and library/meeting room as included areas.
  - This may be better presented as information rather than a request field in v1.

#### Event Description

- Type: textarea
- Required: yes
- Source form field: none explicit beyond event type
- Notes:
  - Add this in the new form.
  - Should capture a plain-language description of the event and planned use.

#### Setup / Special Requests

- Type: textarea
- Required: no
- Source form field: none
- Notes:
  - Good place for layout needs, vendor notes, access timing, or special setup concerns.

#### Vendors / Entertainment

- Type: radio or checkbox + optional textarea
- Required: yes
- Source form: implied in liability text but not cleanly modeled
- Suggested options:
  - No outside vendors
  - Yes, vendors or entertainment will be involved
- Conditional follow-up:
  - vendor details textarea
- Notes:
  - Important because liability rules reference hired entertainment or vendor services.

## 4. Insurance & Attachments

#### Homeowner Insurance Company

- Type: text
- Required: yes
- Source form field: `44`

#### Homeowner Insurance Policy Number

- Type: text
- Required: yes
- Source form field: `45`

#### Insurance Certificate Upload

- Type: file upload
- Required: yes
- Source form field: implied by old agreement text, but not modeled as a dedicated upload
- Notes:
  - This should be explicit in the new form.

#### Vendor Insurance Upload

- Type: file upload
- Required: conditional
- Condition: only when vendors/entertainment are involved
- Source form field: none explicit
- Notes:
  - Added because the old agreement text requires vendor liability proof when applicable.

#### Additional Attachments

- Type: file upload
- Required: no
- Source form field: none
- Notes:
  - Useful for supporting documents or event-specific materials.

## 5. Agreement & Submission

### Agreement Section Handling

The old paper form effectively requires the renter to initial several distinct agreement blocks. The online form should preserve that intent, but in a cleaner digital format.

Recommended approach:

- keep the agreement content grouped into separate sections
- require section-specific acknowledgement for each major block
- require typed initials for each major block
- require a final typed confirmation name at submission

The major acknowledgement groups should be:

- Clubhouse Rental Agreement
- Insurance
- Decoration Limitations / Rules

#### Rental Rules Acknowledgement

- Type: checkbox
- Required: yes
- Source form fields:
  - old section text blocks
  - old consent field `17`
- Notes:
  - Replace long paragraph walls with short grouped acknowledgements.

#### Deposit / Damage Responsibility Acknowledgement

- Type: checkbox
- Required: yes
- Source form: old agreement text

#### Attendance Responsibility Acknowledgement

- Type: checkbox
- Required: yes
- Source form: old agreement text
- Rule:
  - resident must be present for the duration of the event

#### Capacity / Safety Acknowledgement

- Type: checkbox
- Required: yes
- Source form: old agreement text
- Rule:
  - renter agrees to comply with clubhouse occupancy and safety requirements

#### Typed Signature / Confirmation Name

- Type: text
- Required: yes
- Source form: old consent intent
- Notes:
  - This is cleaner than a paper-style signature placeholder for portal use.

#### Clubhouse Rental Agreement Initials

- Type: text
- Required: yes
- Source form: old paper initial requirement
- Notes:
  - This should confirm the submitter reviewed the rental terms section.

#### Insurance Initials

- Type: text
- Required: yes
- Source form: old paper initial requirement
- Notes:
  - This should confirm the submitter reviewed the insurance/liability section.

#### Decoration Rules Initials

- Type: text
- Required: yes
- Source form: old paper initial requirement
- Notes:
  - This should confirm the submitter reviewed the decoration limitations/rules section.

#### Submission Date

- Type: system-generated
- Required: automatic
- Source form field: `22` hidden date
- Notes:
  - No resident entry needed.

## Fields To Remove From Resident Submission

These fields should not appear in the resident-facing form:

#### Duplicate Time Fields

- Remove old fields:
  - `42` `Rental Time`
  - `43` `To: (Time)`
- Reason:
  - redundant with `Rent From` / `Rent To`

#### Internal Committee Disposition

- Remove old fields:
  - `36` `CLUBHOUSE RENTAL COMMITTEE DISPOSITION`
  - `38` `CLUBHOUSE RENTAL COMMITTEE SIGNATURE`
- Reason:
  - these belong to internal workflow processing, not resident submission

#### Paper-Style Long Agreement Sections

- Replace old fields:
  - `13`
  - `46`
  - `47`
  - `48`
  - `56`
- Reason:
  - the content should be rewritten into shorter grouped rules, help text, acknowledgements, and linked documents

## Recommended Future Workflow Fields

These should exist in the workflow/data model, but not as resident-editable fields on the form:

- request number
- submission status
- decision note
- review history
- payment/deposit tracking
- approved / rejected timestamps
- calendar booking status

## UI / UX Recommendations

- Use a multi-step form instead of one long page.
- Show a progress indicator.
- Prefill resident identity and address when possible.
- Use a single clean time-range step.
- Show important rental rules in grouped, readable sections.
- Put helper text near each field instead of hiding key requirements in long paragraphs.
- Add a final review step before submit.

## Calendar / Availability Integration

This form spec should work with the availability assumptions documented in:

- [clubhouse-rental-online-availability-note.md](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/docs/clubhouse-rental-online-availability-note.md)

In particular:

- the reservation date/time must eventually validate against approved rentals
- the reservation date/time must also validate against Sanity events whose location blocks the clubhouse or ballroom

## Suggested First Implementation Scope

For the first portal workflow version, I recommend implementing:

- resident information
- reservation date
- start/end time
- event type
- guest count
- event description
- insurance company
- policy number
- insurance upload
- required acknowledgements
- typed confirmation name

Optional items that can wait if needed:

- vendor-specific conditional upload
- extra attachment slots
- advanced setup request fields

# Portal Content Submission Architecture Note

## Goal

Provide a frontend portal workflow for committee members to submit content for events and announcements, optionally use AI to help draft or refine that content, route it through moderation/review, and then publish approved content into Sanity.

This approach is intended to:

- keep committee contributors in the resident portal rather than Sanity Studio
- avoid adding large numbers of committee members as Sanity seats
- allow AI drafting assistance without depending on Sanity Studio AI features
- preserve a clear approval and audit workflow before content is published

## Recommended Architecture

### 1. Portal-native submission form

Committee members use a portal page to create content submissions.

Recommended content types:

- `event`
- `announcement`

Recommended form inputs:

- content type
- headline / title
- summary / short description
- main body / notes
- category
- publish target
- publish date
- expiry date
- location (for events)
- committee source
- submission notes

The portal form should be tailored by content type rather than exposing a single generic document editor.

### 2. AI assist step in the portal

AI assistance should be provided through the portal application backend, not through Sanity Studio.

Recommended AI actions:

- draft from notes
- rewrite for clarity
- shorten
- expand
- convert committee notes into resident-friendly copy
- draft event description from structured event inputs

Recommended guardrails:

- do not invent facts
- preserve submitted dates, locations, and operational details exactly
- use HOA-safe tone
- avoid legal promises or policy interpretations unless explicitly approved
- require human review before submission or publication

### 3. Moderation / review workflow

Content submissions should go through a native portal review workflow before they are written to Sanity.

Recommended workflow states:

- `submitted`
- `needs_more_info`
- `approved`
- `rejected`
- optional later: `published`

Recommended reviewer actions:

- approve
- request more information
- reject
- preview final content before publish

The `needs_more_info` pattern should work like ACC:

- same submission record
- returned to submitter for edits
- resubmitted into the same workflow

### 4. Save-to-Sanity on approval

Once approved, the portal backend writes the final content into Sanity using a server-side token.

Portal submitters do not need to be Sanity users.

Sanity remains the publishing/content store, while the portal remains the contributor workflow layer.

Recommended stored metadata:

- submitted by portal user ID
- approved by portal user ID
- committee source
- workflow submission ID
- original submission timestamp

## Recommended Data Separation

Use portal-native workflow tables for in-progress content and review state.

Suggested future model family:

- `ContentSubmission`
- `ContentSubmissionEvent`
- optional `ContentSubmissionAttachment`

Sanity should store only approved/published content rather than every in-progress draft revision.

## Why This Direction Is Recommended

- avoids Sanity seat sprawl for committee contributors
- keeps committee users in the portal they already use
- provides stronger workflow/audit control
- allows custom AI behavior and guardrails
- fits the application’s existing workflow patterns used for ACC and clubhouse rental

## Pricing / Seat Implication

If committee members submit content through the portal and are not added as Sanity project members:

- they do **not** consume Sanity seats
- the website page itself is **not** a Sanity seat

This makes a portal-native authoring flow more cost-effective than giving each contributor direct Sanity Studio access.

## Suggested Rollout

1. Build portal-native submission workflow for events and announcements.
2. Add moderation/review queue in the portal.
3. Add AI assist actions behind the portal form.
4. Publish approved submissions into Sanity.
5. Later decide whether any admin/editor-only Studio-side tooling is still needed.

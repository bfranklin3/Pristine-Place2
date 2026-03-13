# Board Meeting Documents Architecture Note

## Goal

Provide a cleaner long-term way to manage Board of Directors meeting agendas and meeting minutes so they can be uploaded through the portal, automatically placed in the correct area of the site, and published consistently.

## Recommended Direction

Treat agendas and minutes as one document family rather than two unrelated storage patterns.

Recommended unified content type:

- `Board Meeting Document`

Recommended subtype values:

- `agenda`
- `minutes`

Recommended core fields:

- title
- meeting date
- subtype
- publish date
- visibility
- file attachment
- optional summary / extracted text

## Where They Should Appear

### Minutes

Meeting minutes should continue to appear on:

- `/resident-portal/documents`

under the existing Board Meeting Records area.

### Agendas

Agendas should also be treated as Board meeting records rather than living only as standalone Sanity text content.

Recommended display:

- in the Board Meeting Records area as `Agendas`
- optionally also surfaced as `Upcoming Agenda` / `Recent Agendas`
- optionally linked from the related Board meeting event or Board page

## Recommended Published Format

Use **PDF as the canonical published format for both agendas and minutes**.

Optional secondary storage:

- extracted text or rich text for preview/search/accessibility

### Why PDF for both

- consistent handling across both document types
- stable and printable for official records
- aligns with resident expectations for board records
- avoids special-case logic for agenda text vs. minutes PDF

## Recommendation on Word Documents

Board agendas and minutes are often received as Word documents.

For the first implementation, do **not** make in-app Word-to-PDF conversion a requirement.

Recommended v1 rule:

- uploader provides PDF as the publishable artifact

Optional later enhancement:

- allow DOCX upload as source material
- add background conversion to PDF

This should be deferred because reliable server-side Word conversion adds complexity and operational overhead.

## Recommended Upload Workflow

### Portal-side uploader

Provide a frontend portal page for admins or Board members to upload Board meeting documents.

Recommended inputs:

- document type: `Agenda` or `Minutes`
- meeting date
- title
- optional summary
- PDF upload

### Automatic placement

The system should automatically route the document based on subtype:

- `agenda` → Board agenda area / upcoming or recent agendas
- `minutes` → Board meeting records archive

No manual placement should be required after upload.

## Recommended System Architecture

Use a native portal submission/storage layer for Board meeting documents, then publish them to the correct public/portal destination automatically.

Suggested future model family:

- `BoardMeetingDocument`
- optional `BoardMeetingDocumentEvent` for audit/history

Sanity can still remain the broader content system if needed, but the upload workflow should be driven by a structured portal-side process rather than ad hoc manual conversion and placement.

## Recommended Rollout

1. Define unified Board meeting document model.
2. Build portal upload page for admins / Board members.
3. Require PDF upload for v1.
4. Automatically place uploaded agendas and minutes in the correct site locations.
5. Later add optional extracted text, previews, search support, or DOCX conversion if needed.

## Related Note

For the current-state display findings and the exact additive schema/display changes needed to support:

- `Upcoming Agenda`
- `Agenda Archive`
- `Minutes Archive`

see:

- [Board Meeting Documents Display Note](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/docs/board-meeting-documents-display-note.md)

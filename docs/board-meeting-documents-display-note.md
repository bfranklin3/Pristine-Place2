# Board Meeting Documents Display Note

## Current State

Board meeting agendas and minutes are currently handled as `hoaDocument` records in Sanity and displayed together on:

- `/resident-portal/documents`

The current implementation in:

- [app/(portal)/resident-portal/documents/page.tsx](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/app/%28portal%29/resident-portal/documents/page.tsx)
- [components/portal/documents-browser.tsx](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/components/portal/documents-browser.tsx)

treats both `agendas` and `minutes` as one flat `Board Meeting Records` archive grouped only by year.

This has three problems:

- residents cannot easily distinguish upcoming agendas from older records
- agendas and minutes are mixed together even though they serve different purposes
- there is no way to show a clear "agenda not yet posted" message for the next Board meeting

## Recommended Direction

Keep agendas and minutes in one document family, but separate them in the UI.

Recommended display on `/resident-portal/documents`:

1. `Upcoming Board Meeting Agenda`
2. `Agenda Archive`
3. `Approved Meeting Minutes`

This preserves a unified storage model while making the resident experience much clearer.

## Recommended Data Model Direction

For the near term, continue using the existing `hoaDocument` schema rather than introducing a brand-new document type immediately.

This is the lowest-risk path because:

- agendas and minutes already exist in `hoaDocument`
- the current document browser and document queries already use `hoaDocument`
- additive schema changes are enough to support the improved Board records display

## Recommended Schema Changes

### Keep Existing Fields

Continue using existing `hoaDocument` fields:

- `category`
- `title`
- `description`
- `file`
- `externalFileUrl`
- `content`
- `effectiveDate`
- `published`
- `visibility`
- `source`
- `legacyWpId`

### Additive Fields Needed

Add the following fields to `hoaDocument`:

#### `meetingDate`

- type: `date`
- required when `category` is `agendas` or `minutes`
- purpose:
  - stable sort key
  - archive grouping
  - matching agendas/minutes to Board events

#### `meetingTime`

- type: `string`
- optional
- purpose:
  - display convenience for agendas
  - not required for minutes

#### `meetingKind`

- type: `string`
- recommended values:
  - `board`
  - `annual`
  - `organizational`
  - `special`
  - `emergency`
  - `membership`
- purpose:
  - cleaner labeling
  - future filtering or badge display

#### `relatedEvent`

- type: reference to `event`
- optional but strongly recommended
- purpose:
  - identifies which Sanity Board meeting event the agenda or minutes belongs to
  - powers the upcoming-agenda slot more reliably than title matching alone

#### `boardRecordStatus`

- type: `string`
- recommended values:
  - `draft`
  - `published`
- optional for v1 because `published` already exists
- useful later if a draft upload flow is added before public release

## Recommended Validation Rules

When `category` is `agendas` or `minutes`:

- `meetingDate` should be required
- one of `file`, `externalFileUrl`, or `content` should still be required

When `category` is `agendas`:

- `meetingTime` is recommended but can remain optional

## Recommended Query / Display Logic

### Upcoming Board Meeting Agenda

Determine the next Board meeting using the existing Sanity events system:

- `_type == "event"`
- `published == true`
- category consistent with Board meetings
  - currently expected to include `bod-meeting`
- future occurrence is next on or after today

Then:

1. find the next Board meeting event
2. attempt to find an `hoaDocument` agenda that matches it
   - first by `relatedEvent`
   - fallback by `meetingDate`
3. if found:
   - show it in the `Upcoming Board Meeting Agenda` slot
4. if not found:
   - show a banner message such as:
     - `The agenda for the next Board meeting will be posted a few days before the meeting.`

### Agenda Archive

Show published Board agendas that are not the active upcoming agenda.

Recommended sorting:

- newest `meetingDate` first

Recommended grouping:

- by year

### Approved Meeting Minutes

Show published Board meeting minutes separately from agendas.

Recommended sorting:

- newest `meetingDate` first

Recommended grouping:

- by year

## Recommended UX Pattern on `/resident-portal/documents`

Within the `Board Meeting Records` section:

### Block 1: Upcoming Board Meeting Agenda

- single featured card
- shows:
  - title
  - meeting date
  - optional meeting time
  - open/download button

If missing:

- show an informational banner instead of an empty state

### Block 2: Agenda Archive

- archive list of past agendas
- grouped by year

### Block 3: Approved Meeting Minutes

- archive list of minutes
- grouped by year

This is preferable to one mixed list because residents usually look for:

- the next agenda before a meeting
- minutes after a meeting

## Recommended Implementation Order

1. Add the new `hoaDocument` fields:
   - `meetingDate`
   - `meetingTime`
   - `meetingKind`
   - `relatedEvent`
2. Update the Board agenda import path to populate `meetingDate` and `meetingTime`.
3. Update the documents query layer to expose the new fields.
4. Split the `Board Meeting Records` section into:
   - `Upcoming Board Meeting Agenda`
   - `Agenda Archive`
   - `Approved Meeting Minutes`
5. Add the fallback "agenda not yet posted" banner logic based on the next Board event.

## Recommended Rollout Note

This proposal keeps the storage model unified while improving resident clarity.

It does **not** require agendas and minutes to become separate content systems. The separation should happen in the presentation layer and query logic, not by splitting them into unrelated storage types.

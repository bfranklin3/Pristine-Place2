# Clubhouse Rental Online Availability Note

Date: March 12, 2026

## Purpose

This note captures the current shared decisions for the future `Clubhouse Rental Online` workflow and its availability calendar. It is intended to guide the upcoming form spec, workflow design, and calendar integration work.

## Current Direction

- `Clubhouse Rental Online` will become a real online rental workflow, not just a static information page.
- The workflow will need a clubhouse availability calendar.
- That calendar should reflect both:
  - approved private clubhouse rentals
  - HOA community events already stored in Sanity

## Availability Sources

The future calendar should combine these booking sources:

- approved clubhouse rental requests
- Sanity events with clubhouse-related locations

Manual blackout dates may be added later if needed, but they are not required for v1 if they complicate the initial implementation.

## Booking Assumptions

These availability rules are now agreed:

- `Clubhouse` means the whole facility is unavailable for private rental.
- `Clubhouse Ballroom` means the ballroom is unavailable for private rental.
- Because the current rental product is specifically ballroom rental, both `Clubhouse` and `Clubhouse Ballroom` should block booking.
- Sanity event start/end datetime values should be used when available.
- If a future source does not provide usable times, it should be treated as an all-day block.

## Sanity Event Integration

HOA community events already displayed on the home page and resident events pages are stored in Sanity and should be part of the rental availability model.

For calendar blocking purposes:

- if a Sanity event location is `Clubhouse`, it blocks the facility
- if a Sanity event location is `Clubhouse Ballroom`, it blocks ballroom rental

## Sanity Location Field Direction

We should consider converting the Sanity event `location` field into a controlled dropdown for more reliable booking logic.

Proposed location options:

- `Clubhouse`
- `Clubhouse Ballroom`
- `Clubhouse Grounds`
- `Clubhouse Parking Lot`
- `Other`

Notes:

- Most HOA events occur in the clubhouse or on its surrounding grounds.
- `Other` should remain available for events that do not relate to the clubhouse.
- A controlled location list will make calendar blocking more reliable than free-text matching.

## Recommended Calendar Model

To keep availability logic clean, the future system should distinguish between:

- source record
  - rental request
  - HOA event
- booking block
  - location scope
  - start datetime
  - end datetime
  - source type

This makes it easier to combine multiple booking sources in one calendar without tightly coupling the availability engine to only one system.

## Suggested Rollout Order

1. Build the new `Clubhouse Rental Online` request form and workflow.
2. Add an internal admin calendar view first.
3. Merge Sanity clubhouse events into that calendar.
4. Later expose resident-facing availability guidance if needed.

## First Implementation Slice

The first implementation slice should use a lower-risk internal view before a full interactive calendar is built.

Current recommended first pass:

- admin-only availability page
- grouped timeline/list by date
- approved rental requests shown as blocking
- submitted / needs-more-info rental requests shown as tentative
- published Sanity events shown as blocking only when location is `Clubhouse` or `Clubhouse Ballroom`

This provides immediate operational value while keeping the eventual monthly calendar open as a later enhancement.

## Related Page

- `/resident-portal/management/clubhouse-rental-online`
- `/resident-portal/management/clubhouse-rental-availability`

## Related Notes

- [clubhouse-rental-online-form-spec.md](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/docs/clubhouse-rental-online-form-spec.md)
- [portal-calendar-architecture-note.md](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/docs/portal-calendar-architecture-note.md)

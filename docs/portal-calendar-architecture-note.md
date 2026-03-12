# Portal Calendar Architecture Note

Date: March 12, 2026

## Purpose

This note captures the recommended shared calendar architecture for:

- `/resident-portal/events/calendar`
- clubhouse rental availability and future resident-facing rental availability guidance

The goal is to build one calendar system that can support both use cases, rather than creating two separate calendar implementations.

## Current State

- The Events monthly calendar page is still a placeholder:
  - [app/(portal)/resident-portal/events/calendar/page.tsx](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/app/%28portal%29/resident-portal/events/calendar/page.tsx)
- The clubhouse availability page currently uses a grouped timeline/list view:
  - [app/(portal)/resident-portal/management/clubhouse-rental-availability/page.tsx](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/app/%28portal%29/resident-portal/management/clubhouse-rental-availability/page.tsx)
- No dedicated calendar UI library is currently installed in the repo.

## Recommended Direction

Build a shared custom month calendar component for the portal first.

Recommendation:

- create one shared month calendar component
- use one normalized event model
- adapt different data sources into that shared model
- use the same calendar foundation for both Events and Clubhouse Availability

This is preferred over adding a large third-party calendar package for the initial implementation.

## Why A Custom Month Calendar

Benefits:

- cleaner visual integration with the existing portal design
- no heavy third-party dependency to theme or work around
- easier to tailor for HOA-specific behavior
- easier to support custom blocking logic for clubhouse use
- one shared component can serve both events and rentals

Tradeoff:

- we must build and maintain month-grid layout, navigation, and overlap display ourselves

That tradeoff is acceptable here because the first target is a monthly view, not a full scheduling suite.

## Calendar Model

Use one normalized calendar item shape across all sources.

Suggested fields:

- `id`
- `title`
- `start`
- `end`
- `allDay`
- `source`
- `status`
- `location`
- `href`
- `isBlocking`

Suggested source values:

- `hoa_event`
- `clubhouse_rental`

Suggested status values:

- `scheduled`
- `tentative`
- `approved`
- `blocked`

## Data Adapters

The shared calendar component should not fetch raw source data directly. Instead, source-specific adapters should map data into the normalized calendar shape.

Initial adapters:

- Sanity events adapter
- clubhouse rental booking adapter

Sanity events adapter:

- used for the Events calendar
- also reused by clubhouse availability when event location is clubhouse-related

Clubhouse rental adapter:

- approved rentals show as blocking
- submitted / needs-more-info rentals may be shown as tentative in admin availability views

## View Strategy

Use the same core month calendar with source-specific filtering.

Events calendar:

- show HOA community events only
- primarily resident-facing

Clubhouse availability calendar:

- show HOA events with clubhouse-related locations
- show approved rentals as blocking
- show tentative rental requests differently for admin users

## Component Recommendation

Suggested first component:

- `components/portal/calendar-month.tsx`

Suggested supporting helpers:

- `lib/calendar/normalize.ts`
- `lib/calendar/month-grid.ts`
- `lib/calendar/format.ts`

The month calendar should support:

- previous / next month navigation
- mobile-friendly stacked cell summaries
- event color treatment by source/status
- click-through links on items
- optional legend / filter chips

## Mobile Recommendation

The first version should prioritize desktop monthly view, but remain usable on mobile.

Recommended behavior:

- month grid on desktop and tablet
- compact month grid on mobile
- optional agenda/list fallback later if month cells become too dense

Do not build a separate mobile-only calendar first.

## Library Option Kept In Reserve

If the custom month calendar becomes too expensive or if weekly/day views become necessary, reassess a library.

Best fallback package option:

- `FullCalendar`

Reason:

- strongest scheduling feature set
- mature monthly and time-grid views
- good support for multiple event sources

But this is not the recommended first step.

## Recommended Rollout

1. Build the shared month calendar component and normalized event model.
2. Replace the Events calendar placeholder with the shared component.
3. Reuse the same component for clubhouse availability.
4. Add filters, legends, and click-through detail behavior.
5. Later consider agenda view, weekly view, or library adoption only if needed.

## Related Notes

- [docs/clubhouse-rental-online-availability-note.md](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/docs/clubhouse-rental-online-availability-note.md)

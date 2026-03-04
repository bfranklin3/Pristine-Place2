// lib/sanity/recurring-events.ts
// Utilities for handling recurring events from Sanity CMS

import { RRule, RRuleSet, rrulestr } from "rrule"
import { HOA_TIME_ZONE, getTimePartsInZone, zonedLocalDateTimeToUtc } from "@/lib/timezone"

/**
 * Sanity event with recurrence support
 */
export interface RecurringEvent {
  _id: string
  title: string
  slug: { current: string }
  eventDate: string
  endDate?: string
  isRecurring?: boolean
  recurrence?: {
    rrule?: string // RRULE string from Sanity plugin
    dtstart?: string
    dtend?: string
    startDate?: string
    endDate?: string
    tzid?: string
  }
  location?: string
  description?: any[]
  category?: string
  published: boolean
  visibility: "portal" | "public" | "both"
}

/**
 * Event occurrence instance
 */
export interface EventOccurrence {
  _id: string
  title: string
  slug: { current: string }
  date: Date
  endDate?: Date
  location?: string
  description?: any[]
  category?: string
  isRecurring: boolean
  originalEventId: string
}

/**
 * Generate all occurrences for a recurring event within a date range
 *
 * @param event - The event from Sanity with recurrence data
 * @param options - Options for generating occurrences
 * @returns Array of event occurrences
 *
 * @example
 * ```typescript
 * const event = await client.fetch(`*[_type == "event" && slug.current == $slug][0]`, { slug })
 * const occurrences = generateOccurrences(event, {
 *   startDate: new Date(),
 *   endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Next 90 days
 *   limit: 10
 * })
 * ```
 */
export function generateOccurrences(
  event: RecurringEvent,
  options: {
    startDate?: Date
    endDate?: Date
    limit?: number
  } = {}
): EventOccurrence[] {
  // If not a recurring event, return single occurrence
  if (!event.isRecurring || !event.recurrence?.rrule) {
    return [
      {
        _id: event._id,
        title: event.title,
        slug: event.slug,
        date: new Date(event.eventDate),
        endDate: event.endDate ? new Date(event.endDate) : undefined,
        location: event.location,
        description: event.description,
        category: event.category,
        isRecurring: false,
        originalEventId: event._id,
      },
    ]
  }

  try {
    // Parse the RRULE string from Sanity
    const recurrenceStart = event.recurrence.startDate || event.recurrence.dtstart || event.eventDate
    const rule = rrulestr(event.recurrence.rrule, {
      dtstart: new Date(recurrenceStart),
    })

    // Get occurrences within the specified range
    const occurrences = rule.between(
      options.startDate || new Date(),
      options.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default: 1 year
      true // Include start date
    )

    // Apply limit if specified
    const limitedOccurrences = options.limit
      ? occurrences.slice(0, options.limit)
      : occurrences

    // Capture the intended local wall-time from the original event in HOA timezone.
    // This prevents recurring meetings from drifting by 1 hour/day around DST boundaries.
    const sourceEventDate = new Date(event.eventDate)
    const sourceLocalTime = getTimePartsInZone(sourceEventDate, HOA_TIME_ZONE)

    // Calculate event duration for end dates
    const duration = event.endDate
      ? new Date(event.endDate).getTime() - new Date(event.eventDate).getTime()
      : null

    // Convert to EventOccurrence objects
    return limitedOccurrences.map((date, index) => {
      const adjustedDate = zonedLocalDateTimeToUtc(
        {
          year: date.getUTCFullYear(),
          month: date.getUTCMonth() + 1,
          day: date.getUTCDate(),
          hour: sourceLocalTime.hour,
          minute: sourceLocalTime.minute,
          second: sourceLocalTime.second,
        },
        HOA_TIME_ZONE
      )

      return {
      _id: `${event._id}-occurrence-${index}`,
      title: event.title,
      slug: event.slug,
      date: adjustedDate,
      endDate: duration ? new Date(adjustedDate.getTime() + duration) : undefined,
      location: event.location,
      description: event.description,
      category: event.category,
      isRecurring: true,
      originalEventId: event._id,
      }
    })
  } catch (error) {
    console.error("Error generating recurring event occurrences:", error)
    // Fallback to single occurrence on error
    return [
      {
        _id: event._id,
        title: event.title,
        slug: event.slug,
        date: new Date(event.eventDate),
        endDate: event.endDate ? new Date(event.endDate) : undefined,
        location: event.location,
        description: event.description,
        category: event.category,
        isRecurring: false,
        originalEventId: event._id,
      },
    ]
  }
}

/**
 * Get the next N occurrences of a recurring event
 *
 * @example
 * ```typescript
 * const nextMeetings = getNextOccurrences(event, 5)
 * ```
 */
export function getNextOccurrences(
  event: RecurringEvent,
  count: number = 5
): EventOccurrence[] {
  return generateOccurrences(event, {
    startDate: new Date(),
    limit: count,
  })
}

/**
 * Get all occurrences for multiple events and sort them chronologically
 *
 * @example
 * ```typescript
 * const events = await client.fetch(`*[_type == "event" && published == true]`)
 * const upcoming = getUpcomingEvents(events, { limit: 20 })
 * ```
 */
export function getUpcomingEvents(
  events: RecurringEvent[],
  options: {
    startDate?: Date
    endDate?: Date
    limit?: number
  } = {}
): EventOccurrence[] {
  // Generate all occurrences for all events
  const allOccurrences = events.flatMap((event) =>
    generateOccurrences(event, options)
  )

  // Sort chronologically
  allOccurrences.sort((a, b) => a.date.getTime() - b.date.getTime())

  // Apply limit if specified
  return options.limit
    ? allOccurrences.slice(0, options.limit)
    : allOccurrences
}

/**
 * Format recurrence rule to human-readable text
 *
 * @example
 * ```typescript
 * formatRecurrence(event.recurrence.rrule) // "Every 3rd Wednesday"
 * ```
 */
export function formatRecurrence(rruleString: string): string {
  try {
    const rule = rrulestr(rruleString)
    return rule.toText()
  } catch (error) {
    return "Custom recurrence"
  }
}

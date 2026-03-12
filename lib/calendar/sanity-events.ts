import { getEvents } from "@/lib/sanity/queries"
import { generateOccurrences, type RecurringEvent } from "@/lib/sanity/recurring-events"
import type { PortalCalendarItem } from "./types"
import { getMonthRange } from "./month"

export async function getPortalEventCalendarItems(monthDate: Date): Promise<PortalCalendarItem[]> {
  const events = await getEvents("portal")
  const { start, endExclusive } = getMonthRange(monthDate)

  const occurrences = events.flatMap((event) =>
    generateOccurrences(event as RecurringEvent, {
      startDate: start,
      endDate: endExclusive,
    }),
  )

  return occurrences
    .filter((occurrence) => occurrence.date >= start && occurrence.date < endExclusive)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((occurrence) => ({
      id: occurrence._id,
      title: occurrence.title,
      start: occurrence.date.toISOString(),
      end: occurrence.endDate ? occurrence.endDate.toISOString() : null,
      allDay: false,
      source: "hoa_event",
      status: "scheduled",
      location: occurrence.location || null,
      href: occurrence.slug?.current ? `/resident-portal/events/${occurrence.slug.current}` : null,
      isBlocking: false,
      isRecurring: occurrence.isRecurring,
    }))
}

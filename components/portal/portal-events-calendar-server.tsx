import { CalendarMonth } from "./calendar-month"
import { getPortalEventCalendarItems } from "@/lib/calendar/sanity-events"

export async function PortalEventsCalendarServer({ monthDate }: { monthDate: Date }) {
  const items = await getPortalEventCalendarItems(monthDate)

  return (
    <CalendarMonth
      monthDate={monthDate}
      items={items}
      basePath="/resident-portal/events/calendar"
      backHref="/resident-portal/events"
      backLabel="Back to Events"
      showSourceLabels={false}
    />
  )
}

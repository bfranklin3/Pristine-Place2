export type PortalCalendarItemSource = "hoa_event" | "clubhouse_rental"

export type PortalCalendarItemStatus = "scheduled" | "tentative" | "approved" | "blocked"

export interface PortalCalendarItem {
  id: string
  title: string
  referenceNumber?: string | null
  start: string
  end?: string | null
  allDay: boolean
  source: PortalCalendarItemSource
  status: PortalCalendarItemStatus
  location?: string | null
  href?: string | null
  isBlocking: boolean
  isRecurring?: boolean
}

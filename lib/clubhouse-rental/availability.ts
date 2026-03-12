import { prisma } from "@/lib/db/prisma"
import { getAllPublishedEvents, type SanityEvent } from "@/lib/sanity/queries"
import { getUpcomingEvents as expandRecurringEvents } from "@/lib/sanity/recurring-events"
import { getMonthRange } from "@/lib/calendar/month"
import type { PortalCalendarItem } from "@/lib/calendar/types"

export type ClubhouseAvailabilitySource = "rental" | "hoa_event"
export type ClubhouseAvailabilityScope = "clubhouse" | "ballroom"

export interface ClubhouseAvailabilityEntry {
  id: string
  source: ClubhouseAvailabilitySource
  title: string
  subtitle: string
  statusLabel: string
  isBlocking: boolean
  scope: ClubhouseAvailabilityScope
  date: string
  startLabel: string
  endLabel: string
  locationLabel: string
  href: string | null
}

interface ClubhouseAvailabilityEntryInternal extends ClubhouseAvailabilityEntry {
  startAt: Date
  endAt: Date | null
}

export interface ClubhouseAvailabilityConflictResult {
  blockingConflicts: ClubhouseAvailabilityEntry[]
  tentativeConflicts: ClubhouseAvailabilityEntry[]
}

function normalizeLocation(value: string | null | undefined) {
  return (value || "").trim().toLowerCase()
}

function mapClubhouseLocation(location: string | null | undefined): ClubhouseAvailabilityScope | null {
  const normalized = normalizeLocation(location)
  if (normalized === "clubhouse") return "clubhouse"
  if (normalized === "clubhouse ballroom") return "ballroom"
  return null
}

function scopeLabel(scope: ClubhouseAvailabilityScope) {
  return scope === "clubhouse" ? "Whole Clubhouse" : "Clubhouse Ballroom"
}

function statusLabel(status: string) {
  if (status === "approved") return "Approved Rental"
  if (status === "submitted") return "Submitted Request"
  if (status === "needs_more_info") return "Needs More Info"
  if (status === "rejected") return "Rejected"
  return status
}

function timeLabelToMinutes(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return Number.MAX_SAFE_INTEGER
  let hour = Number.parseInt(match[1], 10)
  const minute = Number.parseInt(match[2], 10)
  const meridiem = match[3].toUpperCase()
  if (meridiem === "AM" && hour === 12) hour = 0
  if (meridiem === "PM" && hour !== 12) hour += 12
  return hour * 60 + minute
}

function minutesToDate(base: Date, minutes: number) {
  const copy = new Date(base)
  copy.setUTCHours(0, 0, 0, 0)
  return new Date(copy.getTime() + minutes * 60_000)
}

function ensureEndMinutes(startMinutes: number, endMinutes: number) {
  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) return endMinutes
  return endMinutes > startMinutes ? endMinutes : endMinutes + 60
}

function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd
}

function sortEntries<T extends { date: string; startLabel: string; title: string }>(entries: T[]) {
  return [...entries].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime()
    if (dateDiff !== 0) return dateDiff
    const timeDiff = timeLabelToMinutes(a.startLabel) - timeLabelToMinutes(b.startLabel)
    if (timeDiff !== 0) return timeDiff
    return a.title.localeCompare(b.title)
  })
}

function mapSanityEventToEntry(event: {
  _id: string
  title: string
  slug: { current: string }
  eventDate: string
  endDate?: string
  location?: string
}): ClubhouseAvailabilityEntryInternal | null {
  const scope = mapClubhouseLocation(event.location)
  if (!scope) return null

  const start = new Date(event.eventDate)
  const end = event.endDate ? new Date(event.endDate) : null
  if (Number.isNaN(start.getTime())) return null

  return {
    id: event._id,
    source: "hoa_event",
    title: event.title,
    subtitle: "HOA / community event from Sanity",
    statusLabel: "Blocks Availability",
    isBlocking: true,
    scope,
    date: start.toISOString(),
    startLabel: start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    endLabel: end && !Number.isNaN(end.getTime())
      ? end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : "All Day",
    locationLabel: event.location || scopeLabel(scope),
    href: `/resident-portal/events/${event.slug.current}`,
    startAt: start,
    endAt: end && !Number.isNaN(end.getTime()) ? end : null,
  }
}

function buildClubhouseEventOccurrences(events: SanityEvent[], startDate: Date, endDate: Date) {
  const occurrences = expandRecurringEvents(events, {
    startDate,
    endDate,
  })

  return occurrences
    .map((occurrence) =>
      mapSanityEventToEntry({
        _id: occurrence._id,
        title: occurrence.title,
        slug: occurrence.slug,
        eventDate: occurrence.date.toISOString(),
        endDate: occurrence.endDate?.toISOString(),
        location: occurrence.location,
      }),
    )
    .filter((entry): entry is ClubhouseAvailabilityEntryInternal => !!entry)
}

function mapRentalRowToEntry(row: {
  id: string
  requestNumber: string
  residentNameSnapshot: string
  eventType: string
  reservationDate: Date
  reservationStartLabel: string
  reservationEndLabel: string
  requestedSpace: string
  status: string
}): ClubhouseAvailabilityEntryInternal {
  const startMinutes = timeLabelToMinutes(row.reservationStartLabel)
  const endMinutes = ensureEndMinutes(startMinutes, timeLabelToMinutes(row.reservationEndLabel))
  const startAt = minutesToDate(row.reservationDate, startMinutes)
  const endAt = minutesToDate(row.reservationDate, endMinutes)

  return {
    id: row.id,
    source: "rental",
    title: `${row.requestNumber} · ${row.eventType}`,
    subtitle: row.residentNameSnapshot,
    statusLabel: statusLabel(row.status),
    isBlocking: row.status === "approved",
    scope: "ballroom",
    date: row.reservationDate.toISOString(),
    startLabel: row.reservationStartLabel,
    endLabel: row.reservationEndLabel,
    locationLabel: row.requestedSpace === "grand_ballroom" ? "Clubhouse Ballroom" : row.requestedSpace,
    href: `/resident-portal/management/clubhouse-rental-queue?selected=${row.id}`,
    startAt,
    endAt,
  }
}

function toPublicEntry(entry: ClubhouseAvailabilityEntryInternal): ClubhouseAvailabilityEntry {
  return {
    id: entry.id,
    source: entry.source,
    title: entry.title,
    subtitle: entry.subtitle,
    statusLabel: entry.statusLabel,
    isBlocking: entry.isBlocking,
    scope: entry.scope,
    date: entry.date,
    startLabel: entry.startLabel,
    endLabel: entry.endLabel,
    locationLabel: entry.locationLabel,
    href: entry.href,
  }
}

async function getClubhouseAvailabilityEntriesInternal(input?: {
  startDate?: Date
  endDate?: Date
  includeStatuses?: Array<"submitted" | "needs_more_info" | "approved">
  excludeRentalRequestId?: string | null
}) {
  const startDate = input?.startDate || new Date()
  const endDate = input?.endDate || new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)
  const includeStatuses = input?.includeStatuses || ["submitted", "needs_more_info", "approved"]

  const [rentalRows, events] = await Promise.all([
    prisma.clubhouseRentalRequest.findMany({
      where: {
        reservationDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: includeStatuses,
        },
        ...(input?.excludeRentalRequestId ? { id: { not: input.excludeRentalRequestId } } : {}),
      },
      select: {
        id: true,
        requestNumber: true,
        residentNameSnapshot: true,
        eventType: true,
        reservationDate: true,
        reservationStartLabel: true,
        reservationEndLabel: true,
        requestedSpace: true,
        status: true,
      },
      orderBy: [{ reservationDate: "asc" }, { reservationStartLabel: "asc" }, { requestNumber: "asc" }],
    }),
    getAllPublishedEvents(),
  ])

  const rentalEntries = rentalRows.map((row) => mapRentalRowToEntry(row))
  const eventEntries = buildClubhouseEventOccurrences(events, startDate, endDate)
  return sortEntries<ClubhouseAvailabilityEntryInternal>([...rentalEntries, ...eventEntries])
}

export async function getClubhouseAvailability(input?: {
  startDate?: Date
  endDate?: Date
}) {
  const startDate = input?.startDate || new Date()
  const endDate = input?.endDate || new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)

  const allEntries = await getClubhouseAvailabilityEntriesInternal({ startDate, endDate })
  const blockingEntries = allEntries.filter((entry) => entry.isBlocking).map((entry) => toPublicEntry(entry))
  const tentativeEntries = allEntries.filter((entry) => !entry.isBlocking).map((entry) => toPublicEntry(entry))

  const byDay = new Map<string, ClubhouseAvailabilityEntry[]>()
  for (const entry of allEntries) {
    const dayKey = entry.date.slice(0, 10)
    const current = byDay.get(dayKey) || []
    current.push(toPublicEntry(entry))
    byDay.set(dayKey, current)
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    blockingEntries,
    tentativeEntries,
    groupedDays: Array.from(byDay.entries()).map(([day, entries]) => ({
      day,
      entries: sortEntries(entries),
    })),
  }
}

export async function getClubhouseAvailabilityCalendarItems(monthDate: Date): Promise<PortalCalendarItem[]> {
  const { start, endExclusive } = getMonthRange(monthDate)
  const entries = await getClubhouseAvailabilityEntriesInternal({
    startDate: start,
    endDate: endExclusive,
  })

  return entries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    start: entry.startAt.toISOString(),
    end: entry.endAt ? entry.endAt.toISOString() : null,
    allDay: !entry.endAt,
    source: entry.source === "hoa_event" ? "hoa_event" : "clubhouse_rental",
    status: entry.source === "hoa_event" ? "blocked" : entry.isBlocking ? "approved" : "tentative",
    location: entry.locationLabel,
    href: entry.href,
    isBlocking: entry.isBlocking,
  }))
}

export async function getClubhouseAvailabilityConflicts(input: {
  reservationDate: string
  startLabel: string
  endLabel: string
  requestedSpace: string
  excludeRentalRequestId?: string | null
}) {
  const reservationDate = new Date(`${input.reservationDate}T12:00:00.000Z`)
  if (Number.isNaN(reservationDate.getTime())) {
    return {
      blockingConflicts: [],
      tentativeConflicts: [],
    } satisfies ClubhouseAvailabilityConflictResult
  }

  const startMinutes = timeLabelToMinutes(input.startLabel)
  const endMinutes = ensureEndMinutes(startMinutes, timeLabelToMinutes(input.endLabel))
  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) {
    return {
      blockingConflicts: [],
      tentativeConflicts: [],
    } satisfies ClubhouseAvailabilityConflictResult
  }

  const requestedStart = minutesToDate(reservationDate, startMinutes)
  const requestedEnd = minutesToDate(reservationDate, endMinutes)
  const dayStart = new Date(reservationDate)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

  const entries = await getClubhouseAvailabilityEntriesInternal({
    startDate: dayStart,
    endDate: dayEnd,
    excludeRentalRequestId: input.excludeRentalRequestId || null,
  })

  const overlapping = entries.filter((entry) => {
    const entryEnd = entry.endAt || new Date(entry.startAt.getTime() + 24 * 60 * 60 * 1000)
    return intervalsOverlap(requestedStart, requestedEnd, entry.startAt, entryEnd)
  })

  return {
    blockingConflicts: overlapping.filter((entry) => entry.isBlocking).map((entry) => toPublicEntry(entry)),
    tentativeConflicts: overlapping.filter((entry) => !entry.isBlocking).map((entry) => toPublicEntry(entry)),
  } satisfies ClubhouseAvailabilityConflictResult
}

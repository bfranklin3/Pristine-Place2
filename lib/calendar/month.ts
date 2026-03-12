import { HOA_TIME_ZONE, getTimePartsInZone, zonedLocalDateTimeToUtc } from "@/lib/timezone"
import type { PortalCalendarItem } from "./types"

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

export const CALENDAR_WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

export type CalendarDayCell = {
  date: Date
  key: string
  dayNumber: number
  inCurrentMonth: boolean
  isToday: boolean
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

export function formatMonthParam(date: Date) {
  const parts = getTimePartsInZone(date, HOA_TIME_ZONE)
  return `${parts.year}-${pad(parts.month)}`
}

export function createHoaDate(year: number, month: number, day: number) {
  const normalized = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return zonedLocalDateTimeToUtc(
    {
      year: normalized.getUTCFullYear(),
      month: normalized.getUTCMonth() + 1,
      day: normalized.getUTCDate(),
      hour: 12,
      minute: 0,
    },
    HOA_TIME_ZONE,
  )
}

export function parseMonthParam(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [yearText, monthText] = raw.split("-")
    const year = Number.parseInt(yearText, 10)
    const month = Number.parseInt(monthText, 10)
    if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
      return createHoaDate(year, month, 1)
    }
  }

  const nowParts = getTimePartsInZone(new Date(), HOA_TIME_ZONE)
  return createHoaDate(nowParts.year, nowParts.month, 1)
}

export function shiftHoaMonth(date: Date, deltaMonths: number) {
  const parts = getTimePartsInZone(date, HOA_TIME_ZONE)
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1 + deltaMonths, 1, 12, 0, 0))
  return createHoaDate(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 1)
}

export function getMonthLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: HOA_TIME_ZONE,
  })
}

export function getMonthRange(date: Date) {
  const start = parseMonthParam(formatMonthParam(date))
  const endExclusive = shiftHoaMonth(start, 1)
  return { start, endExclusive }
}

export function toHoaDateKey(input: Date | string) {
  const date = typeof input === "string" ? new Date(input) : input
  const parts = getTimePartsInZone(date, HOA_TIME_ZONE)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

function getTodayKey() {
  return toHoaDateKey(new Date())
}

function daysInHoaMonth(date: Date) {
  const parts = getTimePartsInZone(date, HOA_TIME_ZONE)
  return new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate()
}

function weekdayIndexInHoa(date: Date) {
  const label = date.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: HOA_TIME_ZONE,
  })
  return WEEKDAY_TO_INDEX[label] ?? 0
}

export function buildMonthGrid(monthDate: Date): CalendarDayCell[][] {
  const monthStart = parseMonthParam(formatMonthParam(monthDate))
  const monthParts = getTimePartsInZone(monthStart, HOA_TIME_ZONE)
  const firstWeekday = weekdayIndexInHoa(monthStart)
  const totalDays = daysInHoaMonth(monthStart)
  const todayKey = getTodayKey()
  const weeks: CalendarDayCell[][] = []

  let currentDay = 1 - firstWeekday
  while (weeks.length < 6) {
    const week: CalendarDayCell[] = []

    for (let weekday = 0; weekday < 7; weekday += 1) {
      const cellDate = createHoaDate(monthParts.year, monthParts.month, currentDay)
      const cellParts = getTimePartsInZone(cellDate, HOA_TIME_ZONE)
      const key = toHoaDateKey(cellDate)

      week.push({
        date: cellDate,
        key,
        dayNumber: cellParts.day,
        inCurrentMonth: cellParts.month === monthParts.month,
        isToday: key === todayKey,
      })

      currentDay += 1
    }

    weeks.push(week)

    const lastCell = week[week.length - 1]
    if (lastCell.inCurrentMonth && lastCell.dayNumber >= totalDays) {
      break
    }
  }

  return weeks
}

export function groupItemsByHoaDate(items: PortalCalendarItem[]) {
  const grouped = new Map<string, PortalCalendarItem[]>()

  for (const item of items) {
    const key = toHoaDateKey(item.start)
    const existing = grouped.get(key)
    if (existing) {
      existing.push(item)
    } else {
      grouped.set(key, [item])
    }
  }

  for (const value of grouped.values()) {
    value.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  }

  return grouped
}

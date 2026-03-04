export const HOA_TIME_ZONE = "America/New_York"

function parseShortOffset(offsetText: string): number {
  // Examples: GMT-5, GMT-04:00, GMT+0
  const normalized = offsetText.replace("GMT", "")
  if (!normalized || normalized === "+0" || normalized === "-0") return 0

  const sign = normalized.startsWith("-") ? -1 : 1
  const raw = normalized.replace(/^[-+]/, "")
  const [h, m = "0"] = raw.split(":")
  const hours = Number(h) || 0
  const minutes = Number(m) || 0
  return sign * (hours * 60 + minutes) * 60 * 1000
}

function getOffsetMsForInstant(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date)
  const token = parts.find((part) => part.type === "timeZoneName")?.value || "GMT+0"
  return parseShortOffset(token)
}

export function getTimePartsInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date)

  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0)

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  }
}

export function zonedLocalDateTimeToUtc(
  value: { year: number; month: number; day: number; hour: number; minute: number; second?: number },
  timeZone: string
): Date {
  const second = value.second || 0
  const utcGuess = Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, second)

  const offsetA = getOffsetMsForInstant(new Date(utcGuess), timeZone)
  const candidateA = utcGuess - offsetA

  const offsetB = getOffsetMsForInstant(new Date(candidateA), timeZone)
  const finalTs = offsetB === offsetA ? candidateA : utcGuess - offsetB

  return new Date(finalTs)
}

export function formatDateInHoaTimeZone(date: Date, options: Intl.DateTimeFormatOptions) {
  return date.toLocaleDateString("en-US", { ...options, timeZone: HOA_TIME_ZONE })
}

export function formatTimeInHoaTimeZone(date: Date, options?: Intl.DateTimeFormatOptions) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    ...options,
    timeZone: HOA_TIME_ZONE,
  })
}

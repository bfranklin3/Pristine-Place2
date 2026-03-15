import dotenv from "dotenv"
import fs from "node:fs"
import path from "node:path"
import { createClient } from "@sanity/client"
import rrulePkg from "rrule"

const { rrulestr } = rrulePkg

dotenv.config({ path: ".env.local" })

const HOA_TIME_ZONE = "America/New_York"
const apiVersion = "2024-01-01"
const isDryRun = process.argv.includes("--dry-run")
const force = process.argv.includes("--force")

function getEnv() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
  const token = process.env.SANITY_API_TOKEN

  if (!projectId || !dataset || !token) {
    throw new Error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, or SANITY_API_TOKEN")
  }

  return { projectId, dataset, token }
}

function makeClient() {
  const { projectId, dataset, token } = getEnv()
  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token,
  })
}

function parseShortOffset(offsetText) {
  const normalized = String(offsetText || "").replace("GMT", "")
  if (!normalized || normalized === "+0" || normalized === "-0") return 0

  const sign = normalized.startsWith("-") ? -1 : 1
  const raw = normalized.replace(/^[-+]/, "")
  const [h, m = "0"] = raw.split(":")
  const hours = Number(h) || 0
  const minutes = Number(m) || 0
  return sign * (hours * 60 + minutes) * 60 * 1000
}

function getOffsetMsForInstant(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date)
  const token = parts.find((part) => part.type === "timeZoneName")?.value || "GMT+0"
  return parseShortOffset(token)
}

function getTimePartsInZone(date, timeZone) {
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

  const read = (type) => Number(parts.find((part) => part.type === type)?.value || 0)

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  }
}

function zonedLocalDateTimeToUtc(value, timeZone) {
  const second = value.second || 0
  const utcGuess = Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, second)

  const offsetA = getOffsetMsForInstant(new Date(utcGuess), timeZone)
  const candidateA = utcGuess - offsetA

  const offsetB = getOffsetMsForInstant(new Date(candidateA), timeZone)
  const finalTs = offsetB === offsetA ? candidateA : utcGuess - offsetB

  return new Date(finalTs)
}

function toHoaIsoDate(date) {
  const parts = getTimePartsInZone(date, HOA_TIME_ZONE)
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`
}

function generateOccurrences(event, options = {}) {
  const baseOccurrence = {
    originalEventId: event._id,
    title: event.title,
    category: event.category,
    date: new Date(event.eventDate),
  }

  const inRange =
    (!options.startDate || baseOccurrence.date >= options.startDate) &&
    (!options.endDate || baseOccurrence.date <= options.endDate)

  if (!event.isRecurring || !event.recurrence?.rrule) {
    return inRange ? [baseOccurrence] : []
  }

  const recurrenceStart = event.recurrence.startDate || event.recurrence.dtstart || event.eventDate
  const rule = rrulestr(event.recurrence.rrule, {
    dtstart: new Date(recurrenceStart),
  })

  const occurrences = rule.between(
    options.startDate || new Date(),
    options.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    true,
  )

  const sourceEventDate = new Date(event.eventDate)
  const sourceLocalTime = getTimePartsInZone(sourceEventDate, HOA_TIME_ZONE)

  const adjustedOccurrences = occurrences.map((date) => {
    const adjustedDate = zonedLocalDateTimeToUtc(
      {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: sourceLocalTime.hour,
        minute: sourceLocalTime.minute,
        second: sourceLocalTime.second,
      },
      HOA_TIME_ZONE,
    )

    return {
      originalEventId: event._id,
      title: event.title,
      category: event.category,
      date: adjustedDate,
    }
  })

  return inRange ? [baseOccurrence, ...adjustedOccurrences] : adjustedOccurrences
}

function categoriesForMeetingKind(kind) {
  switch (kind) {
    case "annual":
    case "membership":
      return ["annual-meeting"]
    case "special":
      return ["special-meeting"]
    case "emergency":
      return ["special-meeting", "bod-meeting"]
    case "organizational":
      return ["bod-meeting"]
    case "board":
    default:
      return ["bod-meeting"]
  }
}

function buildDateRange(docs) {
  const dates = docs.map((doc) => new Date(`${doc.meetingDate}T12:00:00Z`).getTime()).filter(Number.isFinite)
  const min = Math.min(...dates)
  const max = Math.max(...dates)
  return {
    startDate: new Date(min - 2 * 24 * 60 * 60 * 1000),
    endDate: new Date(max + 2 * 24 * 60 * 60 * 1000),
  }
}

async function fetchAgendaDocs(client) {
  const query = `*[
    _type == "hoaDocument" &&
    !(_id in path("drafts.**")) &&
    category == "agendas" &&
    defined(meetingDate)
    ${force ? "" : "&& !defined(relatedEvent)"}
  ] | order(meetingDate asc) {
    _id,
    title,
    meetingDate,
    meetingKind,
    relatedEvent->{
      _id
    }
  }`
  return client.fetch(query)
}

async function fetchBoardEvents(client) {
  const query = `*[
    _type == "event" &&
    !(_id in path("drafts.**")) &&
    category in ["bod-meeting", "special-meeting", "annual-meeting"]
  ]{
    _id,
    title,
    slug,
    eventDate,
    endDate,
    isRecurring,
    recurrence,
    category,
    published,
    visibility
  }`
  return client.fetch(query)
}

function indexOccurrencesByDate(events, range) {
  const byDate = new Map()

  for (const event of events) {
    const occurrences = generateOccurrences(event, range)
    for (const occurrence of occurrences) {
      const isoDate = toHoaIsoDate(occurrence.date)
      const current = byDate.get(isoDate) || []
      current.push(occurrence)
      byDate.set(isoDate, current)
    }
  }

  return byDate
}

function uniqueByEventId(occurrences) {
  const map = new Map()
  for (const occurrence of occurrences) {
    if (!map.has(occurrence.originalEventId)) {
      map.set(occurrence.originalEventId, occurrence)
    }
  }
  return Array.from(map.values())
}

function findMatchForAgenda(doc, byDate) {
  const sameDate = uniqueByEventId(byDate.get(doc.meetingDate) || [])
  if (sameDate.length === 0) {
    return { status: "unmatched", candidates: [] }
  }

  const preferredCategories = categoriesForMeetingKind(doc.meetingKind || "board")
  const preferred = sameDate.filter((occurrence) => preferredCategories.includes(occurrence.category))

  if (preferred.length === 1) {
    return { status: "matched", match: preferred[0], candidates: preferred }
  }

  if (preferred.length > 1) {
    return { status: "ambiguous", candidates: preferred }
  }

  if (sameDate.length === 1) {
    return { status: "matched-fallback", match: sameDate[0], candidates: sameDate }
  }

  return { status: "ambiguous", candidates: sameDate }
}

async function main() {
  const client = makeClient()
  const docs = await fetchAgendaDocs(client)

  if (docs.length === 0) {
    console.log(JSON.stringify({
      at: new Date().toISOString(),
      dryRun: isDryRun,
      summary: {
        selected: 0,
        matched: 0,
        patched: 0,
        unmatched: 0,
        ambiguous: 0,
      },
      matches: [],
      unmatched: [],
      ambiguous: [],
    }, null, 2))
    return
  }

  const events = await fetchBoardEvents(client)
  const range = buildDateRange(docs)
  const occurrencesByDate = indexOccurrencesByDate(events, range)

  const summary = {
    selected: docs.length,
    matched: 0,
    patched: 0,
    unmatched: 0,
    ambiguous: 0,
  }
  const matches = []
  const unmatched = []
  const ambiguous = []

  for (const doc of docs) {
    const result = findMatchForAgenda(doc, occurrencesByDate)

    if (result.status === "matched" || result.status === "matched-fallback") {
      summary.matched += 1
      matches.push({
        docId: doc._id,
        title: doc.title,
        meetingDate: doc.meetingDate,
        meetingKind: doc.meetingKind || "board",
        matchedEventId: result.match.originalEventId,
        matchedEventTitle: result.match.title,
        matchedEventCategory: result.match.category,
        fallbackCategoryMatch: result.status === "matched-fallback",
      })

      if (!isDryRun) {
        await client
          .patch(doc._id)
          .set({
            relatedEvent: {
              _type: "reference",
              _ref: result.match.originalEventId,
            },
          })
          .commit({ autoGenerateArrayKeys: true })
      }

      summary.patched += 1
      continue
    }

    if (result.status === "ambiguous") {
      summary.ambiguous += 1
      ambiguous.push({
        docId: doc._id,
        title: doc.title,
        meetingDate: doc.meetingDate,
        meetingKind: doc.meetingKind || "board",
        candidates: result.candidates.map((candidate) => ({
          eventId: candidate.originalEventId,
          title: candidate.title,
          category: candidate.category,
          occurrenceDate: candidate.date.toISOString(),
        })),
      })
      continue
    }

    summary.unmatched += 1
    unmatched.push({
      docId: doc._id,
      title: doc.title,
      meetingDate: doc.meetingDate,
      meetingKind: doc.meetingKind || "board",
    })
  }

  const report = {
    at: new Date().toISOString(),
    dryRun: isDryRun,
    force,
    summary,
    matches,
    unmatched,
    ambiguous,
  }

  const reportsDir = path.join(process.cwd(), "reports")
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true })
  const reportPath = path.join(reportsDir, `board-agenda-related-events-${Date.now()}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  console.log(JSON.stringify({ ...report, reportPath }, null, 2))
}

main().catch((error) => {
  console.error("Board agenda relatedEvent backfill failed:", error)
  process.exit(1)
})

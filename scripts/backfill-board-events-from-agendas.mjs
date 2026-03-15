import dotenv from "dotenv"
import fs from "node:fs"
import path from "node:path"
import { createClient } from "@sanity/client"

dotenv.config({ path: ".env.local" })

const HOA_TIME_ZONE = "America/New_York"
const apiVersion = "2024-01-01"
const isDryRun = process.argv.includes("--dry-run")
const force = process.argv.includes("--force")

function getArgValue(flag) {
  const exact = process.argv.find((arg) => arg.startsWith(`${flag}=`))
  if (exact) return exact.slice(flag.length + 1)
  const index = process.argv.indexOf(flag)
  if (index >= 0) return process.argv[index + 1]
  return null
}

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

function zonedLocalDateTimeToUtc(value, timeZone) {
  const second = value.second || 0
  const utcGuess = Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, second)

  const offsetA = getOffsetMsForInstant(new Date(utcGuess), timeZone)
  const candidateA = utcGuess - offsetA

  const offsetB = getOffsetMsForInstant(new Date(candidateA), timeZone)
  const finalTs = offsetB === offsetA ? candidateA : utcGuess - offsetB

  return new Date(finalTs)
}

function toHoaIsoDate(value) {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: HOA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsed)
  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value
  if (!year || !month || !day) return undefined
  return `${year}-${month}-${day}`
}

function parseMeetingTimeLabel(label) {
  const match = String(label || "").match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i)
  if (!match) {
    return { hour: 19, minute: 0, label: "7:00 PM" }
  }

  let hour = Number(match[1]) || 7
  const minute = Number(match[2] || "0")
  const meridiem = match[3].toUpperCase()

  if (meridiem === "PM" && hour < 12) hour += 12
  if (meridiem === "AM" && hour === 12) hour = 0

  const displayHour = hour % 12 || 12
  const normalized = `${displayHour}:${String(minute).padStart(2, "0")} ${meridiem}`

  return { hour, minute, label: normalized }
}

function eventCategoryForMeetingKind(kind) {
  switch (kind) {
    case "annual":
    case "membership":
      return "annual-meeting"
    case "special":
    case "emergency":
      return "special-meeting"
    case "organizational":
    case "board":
    default:
      return "bod-meeting"
  }
}

function titleForMeetingKind(kind) {
  switch (kind) {
    case "annual":
    case "membership":
      return "Annual HOA Meeting"
    case "special":
      return "Special Board Meeting"
    case "emergency":
      return "Emergency Board Meeting"
    case "organizational":
      return "Organizational Board Meeting"
    case "board":
    default:
      return "Monthly Board of Directors Meeting"
  }
}

function key(seed) {
  return seed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || Math.random().toString(36).slice(2, 10)
}

function toPortableTextParagraphs(lines) {
  return lines.map((text, index) => ({
    _type: "block",
    _key: key(`block-${index}-${text}`),
    style: "normal",
    markDefs: [],
    children: [
      {
        _type: "span",
        _key: key(`span-${index}-${text}`),
        text,
        marks: [],
      },
    ],
  }))
}

function portableTextToPlainText(content) {
  if (!Array.isArray(content)) return ""
  return content
    .map((block) => {
      if (!Array.isArray(block?.children)) return ""
      return block.children
        .map((child) => (typeof child?.text === "string" ? child.text : ""))
        .join("")
        .trim()
    })
    .filter(Boolean)
    .join("\n")
}

function inferLocation(doc) {
  const text = `${doc.title || ""}\n${portableTextToPlainText(doc.content)}`.toLowerCase()
  const hasZoom = text.includes("zoom") || text.includes("telephone conference") || text.includes("video conference")
  const hasClubhouse = text.includes("4350 st. ives") || text.includes("clubhouse")

  if (hasZoom && hasClubhouse) return "Clubhouse / Zoom"
  if (hasClubhouse) return "Clubhouse"
  if (hasZoom) return "Zoom"
  return undefined
}

function buildHistoricalEventId(docId) {
  return `historic-board-event-${docId.replace(/[^a-zA-Z0-9-_.]/g, "-")}`
}

function buildSlug(doc) {
  const date = doc.meetingDate || "meeting"
  const kind = doc.meetingKind || "board"
  return `${date}-${kind}-meeting`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96)
}

function buildEventDateIso(doc) {
  const [year, month, day] = String(doc.meetingDate).split("-").map((value) => Number(value))
  const time = parseMeetingTimeLabel(doc.meetingTime)
  const date = zonedLocalDateTimeToUtc(
    {
      year,
      month,
      day,
      hour: time.hour,
      minute: time.minute,
      second: 0,
    },
    HOA_TIME_ZONE,
  )
  return {
    iso: date.toISOString(),
    meetingTimeLabel: time.label,
  }
}

function buildDescription(doc, eventTitle) {
  const time = parseMeetingTimeLabel(doc.meetingTime).label
  return toPortableTextParagraphs([
    `Historical support record for ${eventTitle}.`,
    `Backfilled from agenda document "${doc.title}" for ${doc.meetingDate} at ${time}.`,
  ])
}

async function fetchAgendaDocs(client, limit) {
  const query = `*[
    _type == "hoaDocument" &&
    !(_id in path("drafts.**")) &&
    category == "agendas" &&
    defined(meetingDate)
    ${force ? "" : "&& !defined(relatedEvent)"}
  ] | order(meetingDate asc) [0...$limit] {
    _id,
    title,
    slug,
    meetingDate,
    meetingTime,
    meetingKind,
    content,
    relatedEvent->{
      _id
    }
  }`

  return client.fetch(query, { limit })
}

async function fetchExistingBoardEvents(client) {
  const query = `*[
    _type == "event" &&
    !(_id in path("drafts.**")) &&
    category in ["bod-meeting", "special-meeting", "annual-meeting"]
  ]{
    _id,
    title,
    slug,
    eventDate,
    category,
    published,
    visibility
  }`

  return client.fetch(query)
}

function findExistingEvent(doc, events) {
  const expectedDate = doc.meetingDate
  const expectedCategory = eventCategoryForMeetingKind(doc.meetingKind || "board")

  const matches = events.filter((event) => {
    return event.category === expectedCategory && toHoaIsoDate(event.eventDate) === expectedDate
  })

  if (matches.length === 1) return { status: "matched", event: matches[0] }
  if (matches.length > 1) return { status: "ambiguous", events: matches }
  return { status: "missing", events: [] }
}

async function main() {
  const limitRaw = getArgValue("--limit")
  const limit = limitRaw ? Math.max(1, Number.parseInt(limitRaw, 10) || 0) : 500

  const client = makeClient()
  const docs = await fetchAgendaDocs(client, limit)
  const existingEvents = await fetchExistingBoardEvents(client)

  const summary = {
    selected: docs.length,
    matchedExisting: 0,
    wouldCreate: 0,
    created: 0,
    ambiguousExisting: 0,
    failed: 0,
  }

  const matchedExisting = []
  const created = []
  const ambiguous = []
  const failures = []

  for (const doc of docs) {
    try {
      const existing = findExistingEvent(doc, existingEvents)

      if (existing.status === "matched") {
        summary.matchedExisting += 1
        matchedExisting.push({
          docId: doc._id,
          title: doc.title,
          meetingDate: doc.meetingDate,
          existingEventId: existing.event._id,
          existingEventTitle: existing.event.title,
          existingEventCategory: existing.event.category,
        })
        continue
      }

      if (existing.status === "ambiguous") {
        summary.ambiguousExisting += 1
        ambiguous.push({
          docId: doc._id,
          title: doc.title,
          meetingDate: doc.meetingDate,
          candidates: existing.events.map((event) => ({
            eventId: event._id,
            title: event.title,
            category: event.category,
            eventDate: event.eventDate,
          })),
        })
        continue
      }

      const eventTitle = titleForMeetingKind(doc.meetingKind || "board")
      const eventCategory = eventCategoryForMeetingKind(doc.meetingKind || "board")
      const eventDate = buildEventDateIso(doc)
      const eventId = buildHistoricalEventId(doc._id)
      const location = inferLocation(doc)

      const payload = {
        _id: eventId,
        _type: "event",
        title: eventTitle,
        slug: {
          _type: "slug",
          current: buildSlug(doc),
        },
        isRecurring: false,
        eventDate: eventDate.iso,
        category: eventCategory,
        location,
        description: buildDescription(doc, eventTitle),
        rsvpRequired: false,
        published: false,
        visibility: "portal",
      }

      if (!isDryRun) {
        await client.createOrReplace(payload)
      }

      summary.wouldCreate += 1
      summary.created += 1
      created.push({
        docId: doc._id,
        title: doc.title,
        meetingDate: doc.meetingDate,
        createdEventId: eventId,
        createdEventTitle: eventTitle,
        createdEventCategory: eventCategory,
        eventDate: eventDate.iso,
        location: location || null,
      })
    } catch (error) {
      summary.failed += 1
      failures.push({
        docId: doc._id,
        title: doc.title,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const report = {
    at: new Date().toISOString(),
    dryRun: isDryRun,
    force,
    summary,
    matchedExisting,
    created,
    ambiguous,
    failures,
  }

  const reportsDir = path.join(process.cwd(), "reports")
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true })
  const reportPath = path.join(reportsDir, `board-events-from-agendas-${Date.now()}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  console.log(JSON.stringify({ ...report, reportPath }, null, 2))
}

main().catch((error) => {
  console.error("Board events backfill from agendas failed:", error)
  process.exit(1)
})

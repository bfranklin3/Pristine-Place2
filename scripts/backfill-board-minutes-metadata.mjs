import dotenv from "dotenv"
import fs from "node:fs"
import path from "node:path"
import { createClient } from "@sanity/client"

dotenv.config({ path: ".env.local" })

const HOA_TIME_ZONE = "America/New_York"
const apiVersion = "2024-01-01"
const isDryRun = process.argv.includes("--dry-run")
const force = process.argv.includes("--force")

const MONTHS = new Map([
  ["january", 1],
  ["jan", 1],
  ["february", 2],
  ["feb", 2],
  ["march", 3],
  ["mar", 3],
  ["april", 4],
  ["apr", 4],
  ["may", 5],
  ["june", 6],
  ["jun", 6],
  ["july", 7],
  ["jul", 7],
  ["august", 8],
  ["aug", 8],
  ["september", 9],
  ["sept", 9],
  ["sep", 9],
  ["october", 10],
  ["oct", 10],
  ["november", 11],
  ["nov", 11],
  ["december", 12],
  ["dec", 12],
])

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

function pad2(value) {
  return String(value).padStart(2, "0")
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

function monthKeyFromIso(isoDate) {
  if (!isoDate) return undefined
  const [year, month] = String(isoDate).split("-")
  if (!year || !month) return undefined
  return `${year}-${month}`
}

function categoryForMeetingKind(kind) {
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

function inferMeetingKind(title) {
  const lower = String(title || "").toLowerCase()
  if (lower.includes("organizational")) return "organizational"
  if (lower.includes("annual")) return "annual"
  if (lower.includes("special")) return "special"
  if (lower.includes("emergency")) return "emergency"
  if (lower.includes("membership")) return "membership"
  return "board"
}

function parseExactDateFromTitle(title) {
  const normalized = String(title || "").replace(/[–—]/g, "-")
  const match = normalized.match(
    /(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?\s+(20\d{2})/i,
  )

  if (!match) return null
  const month = MONTHS.get(match[1].toLowerCase())
  const day = Number.parseInt(match[2], 10)
  const year = Number.parseInt(match[3], 10)
  if (!month || !Number.isFinite(day) || !Number.isFinite(year)) return null
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function parseMonthKeyFromTitle(title) {
  const normalized = String(title || "").replace(/[–—]/g, "-")
  const exact = parseExactDateFromTitle(title)
  if (exact) return monthKeyFromIso(exact)

  const match = normalized.match(
    /(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+(20\d{2})/i,
  )
  if (!match) return null

  const month = MONTHS.get(match[1].toLowerCase())
  const year = Number.parseInt(match[2], 10)
  if (!month || !Number.isFinite(year)) return null
  return `${year}-${pad2(month)}`
}

async function fetchMinuteDocs(client, limit) {
  const query = `*[
    _type == "hoaDocument" &&
    !(_id in path("drafts.**")) &&
    category == "minutes" &&
    ${force ? "true" : "(!defined(meetingDate) || !defined(meetingKind) || !defined(relatedEvent))"}
  ] | order(title asc) [0...$limit] {
    _id,
    title,
    meetingDate,
    meetingKind,
    relatedEvent->{
      _id
    }
  }`

  return client.fetch(query, { limit })
}

async function fetchBoardEvents(client) {
  const query = `*[
    _type == "event" &&
    !(_id in path("drafts.**")) &&
    category in ["bod-meeting", "special-meeting", "annual-meeting"]
  ]{
    _id,
    title,
    category,
    eventDate
  }`

  return client.fetch(query)
}

function indexEvents(events) {
  const byDateAndCategory = new Map()
  const byMonthAndCategory = new Map()

  for (const event of events) {
    const isoDate = toHoaIsoDate(event.eventDate)
    if (!isoDate) continue
    const dateKey = `${isoDate}::${event.category}`
    const monthKey = `${monthKeyFromIso(isoDate)}::${event.category}`

    const dateCurrent = byDateAndCategory.get(dateKey) || []
    dateCurrent.push(event)
    byDateAndCategory.set(dateKey, dateCurrent)

    const monthCurrent = byMonthAndCategory.get(monthKey) || []
    monthCurrent.push(event)
    byMonthAndCategory.set(monthKey, monthCurrent)
  }

  return { byDateAndCategory, byMonthAndCategory }
}

function mainPatchForDoc(doc, eventIndex) {
  const meetingKind = inferMeetingKind(doc.title)
  const category = categoryForMeetingKind(meetingKind)
  const exactDate = parseExactDateFromTitle(doc.title)

  if (exactDate) {
    const key = `${exactDate}::${category}`
    const matches = eventIndex.byDateAndCategory.get(key) || []
    if (matches.length > 1) {
      return { status: "ambiguous", reason: "multiple-date-events", exactDate, meetingKind, category, matches }
    }

    return {
      status: "ready",
      patch: {
        meetingDate: exactDate,
        meetingKind,
        relatedEvent:
          matches.length === 1
            ? {
                _type: "reference",
                _ref: matches[0]._id,
              }
            : undefined,
      },
      exactDate,
      meetingKind,
      category,
      matchedEvent: matches[0],
    }
  }

  const monthKey = parseMonthKeyFromTitle(doc.title)
  if (!monthKey) {
    return { status: "unparsed", reason: "no-date-in-title", meetingKind, category }
  }

  const monthMatches = eventIndex.byMonthAndCategory.get(`${monthKey}::${category}`) || []
  if (monthMatches.length !== 1) {
    return {
      status: monthMatches.length === 0 ? "unmatched-month" : "ambiguous",
      reason: monthMatches.length === 0 ? "no-month-event" : "multiple-month-events",
      monthKey,
      meetingKind,
      category,
      matches: monthMatches,
    }
  }

  const matchedDate = toHoaIsoDate(monthMatches[0].eventDate)
  return {
    status: "ready",
    patch: {
      meetingDate: matchedDate,
      meetingKind,
      relatedEvent: {
        _type: "reference",
        _ref: monthMatches[0]._id,
      },
    },
    exactDate: matchedDate,
    meetingKind,
    category,
    matchedEvent: monthMatches[0],
    inferredFromMonth: true,
  }
}

async function main() {
  const limitRaw = getArgValue("--limit")
  const limit = limitRaw ? Math.max(1, Number.parseInt(limitRaw, 10) || 0) : 500

  const client = makeClient()
  const docs = await fetchMinuteDocs(client, limit)
  const events = await fetchBoardEvents(client)
  const eventIndex = indexEvents(events)

  const summary = {
    selected: docs.length,
    ready: 0,
    patched: 0,
    ambiguous: 0,
    unparsed: 0,
    unmatchedMonth: 0,
    failed: 0,
  }

  const ready = []
  const ambiguous = []
  const unparsed = []
  const unmatchedMonth = []
  const failures = []

  for (const doc of docs) {
    try {
      const result = mainPatchForDoc(doc, eventIndex)

      if (result.status === "ready") {
        summary.ready += 1
        ready.push({
          docId: doc._id,
          title: doc.title,
          previousMeetingDate: doc.meetingDate || null,
          nextMeetingDate: result.patch.meetingDate,
          previousMeetingKind: doc.meetingKind || null,
          nextMeetingKind: result.patch.meetingKind,
          relatedEventId: result.matchedEvent?._id || null,
          relatedEventTitle: result.matchedEvent?.title || null,
          inferredFromMonth: result.inferredFromMonth === true,
        })

        if (!isDryRun) {
          const patch = {
            meetingDate: result.patch.meetingDate,
            meetingKind: result.patch.meetingKind,
          }

          if (result.patch.relatedEvent) {
            patch.relatedEvent = result.patch.relatedEvent
          }

          await client.patch(doc._id).set(patch).commit({ autoGenerateArrayKeys: true })
        }

        summary.patched += 1
        continue
      }

      if (result.status === "ambiguous") {
        summary.ambiguous += 1
        ambiguous.push({
          docId: doc._id,
          title: doc.title,
          reason: result.reason,
          category: result.category,
          matches: (result.matches || []).map((event) => ({
            eventId: event._id,
            title: event.title,
            category: event.category,
            eventDate: event.eventDate,
          })),
        })
        continue
      }

      if (result.status === "unmatched-month") {
        summary.unmatchedMonth += 1
        unmatchedMonth.push({
          docId: doc._id,
          title: doc.title,
          reason: result.reason,
          monthKey: result.monthKey,
          category: result.category,
        })
        continue
      }

      summary.unparsed += 1
      unparsed.push({
        docId: doc._id,
        title: doc.title,
        reason: result.reason,
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
    ready,
    ambiguous,
    unmatchedMonth,
    unparsed,
    failures,
  }

  const reportsDir = path.join(process.cwd(), "reports")
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true })
  const reportPath = path.join(reportsDir, `board-minutes-metadata-${Date.now()}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  console.log(JSON.stringify({ ...report, reportPath }, null, 2))
}

main().catch((error) => {
  console.error("Board minutes metadata backfill failed:", error)
  process.exit(1)
})

import dotenv from "dotenv"
import { WP_BOARD_AGENDA_OVERRIDES } from "./wp-board-agenda-overrides.mjs"

dotenv.config({ path: ".env.local" })

const WP_DOC_BASE = "https://www.pristineplace.us/wp-json/wp/v2/document"
const WP_TAXONOMY_BASE = "https://www.pristineplace.us/wp-json/wp/v2/document-type"
const WP_PER_PAGE = 50

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

export function decodeHtml(html) {
  return String(html || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
}

export function stripTags(input) {
  return decodeHtml(String(input || "").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim()
}

function normalizeYear(yearText) {
  const raw = Number.parseInt(yearText, 10)
  if (!Number.isFinite(raw)) return null
  if (yearText.length === 2) return raw >= 70 ? 1900 + raw : 2000 + raw
  return raw
}

function pad2(value) {
  return String(value).padStart(2, "0")
}

function formatLongDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

function formatTimeLabel(time) {
  if (!time) return null
  const minute = time.minute ?? 0
  const hour12 = time.hour % 12 || 12
  const suffix = time.hour >= 12 ? "PM" : "AM"
  return `${hour12}:${pad2(minute)} ${suffix}`
}

function parseTimeParts(rawText) {
  if (!rawText) return null
  const normalized = decodeHtml(rawText)
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim()
  const match = normalized.match(/(?:^|[^0-9])(\d{1,2})(?::?(\d{2}))?\s*(am|pm)\b/i)
  if (!match) return null
  let hour = Number.parseInt(match[1], 10)
  const minute = Number.parseInt(match[2] || "0", 10)
  const meridiem = match[3].toUpperCase()
  if (meridiem === "AM" && hour === 12) hour = 0
  if (meridiem === "PM" && hour !== 12) hour += 12
  return { hour, minute }
}

function extractDateTimeFromText(text, fallbackYear = null) {
  const normalized = decodeHtml(text).replace(/[–—]/g, "-")

  const namedWithYear = normalized.match(
    /(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)(?:,)?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?\s+(\d{2,4})/i,
  )
  if (namedWithYear) {
    const month = MONTHS.get(namedWithYear[1].toLowerCase())
    const day = Number.parseInt(namedWithYear[2], 10)
    const year = normalizeYear(namedWithYear[3])
    if (month && year) {
      const time = parseTimeParts(normalized)
      return {
        meetingDateIso: `${year}-${pad2(month)}-${pad2(day)}`,
        meetingDateLabel: formatLongDate(year, month, day),
        meetingTimeLabel: formatTimeLabel(time),
      }
    }
  }

  const numeric = normalized.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/)
  if (numeric) {
    const month = Number.parseInt(numeric[1], 10)
    const day = Number.parseInt(numeric[2], 10)
    const year = normalizeYear(numeric[3])
    if (year) {
      const time = parseTimeParts(normalized)
      return {
        meetingDateIso: `${year}-${pad2(month)}-${pad2(day)}`,
        meetingDateLabel: formatLongDate(year, month, day),
        meetingTimeLabel: formatTimeLabel(time),
      }
    }
  }

  const namedWithoutYear = normalized.match(
    /(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)(?:,)?\s+(\d{1,2})(?:st|nd|rd|th)?/i,
  )
  if (namedWithoutYear && fallbackYear) {
    const month = MONTHS.get(namedWithoutYear[1].toLowerCase())
    const day = Number.parseInt(namedWithoutYear[2], 10)
    if (month) {
      const time = parseTimeParts(normalized)
      return {
        meetingDateIso: `${fallbackYear}-${pad2(month)}-${pad2(day)}`,
        meetingDateLabel: formatLongDate(fallbackYear, month, day),
        meetingTimeLabel: formatTimeLabel(time),
      }
    }
  }

  return {
    meetingDateIso: null,
    meetingDateLabel: null,
    meetingTimeLabel: formatTimeLabel(parseTimeParts(normalized)),
  }
}

function inferMeetingKind(title) {
  const lower = title.toLowerCase()
  if (lower.includes("annual")) return "Annual Meeting Agenda"
  if (lower.includes("organizational")) return "Organizational Meeting Agenda"
  if (lower.includes("emergency")) return "Emergency Meeting Agenda"
  if (lower.includes("special")) return "Special Meeting Agenda"
  if (lower.includes("membership")) return "Membership Meeting Agenda"
  return "Board Meeting Agenda"
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function buildOutputBasename(title, meetingDateIso, id) {
  if (meetingDateIso) return `${meetingDateIso}-board-meeting-agenda`
  return `${slugify(title) || `board-meeting-agenda-${id}`}`
}

export function extractFileUrlFromAcf(acf) {
  if (!acf || typeof acf !== "object") return null

  const candidates = []
  for (const [k, v] of Object.entries(acf)) {
    const keyLower = String(k).toLowerCase()
    if (!/(file|pdf|document|url|attachment|download)/.test(keyLower)) continue

    if (typeof v === "string" && /^https?:\/\//.test(v)) candidates.push(v)
    if (v && typeof v === "object") {
      if (typeof v.url === "string" && /^https?:\/\//.test(v.url)) candidates.push(v.url)
      if (typeof v.link === "string" && /^https?:\/\//.test(v.link)) candidates.push(v.link)
      if (typeof v.source_url === "string" && /^https?:\/\//.test(v.source_url)) candidates.push(v.source_url)
    }
  }

  return candidates.find((u) => /\.(pdf|docx?|xlsx?|txt)(\?|$)/i.test(u)) || candidates[0] || null
}

export function mapCategoryFromClassList(classList = [], taxonomyNames = []) {
  const combined = `${classList.join(" ")} ${taxonomyNames.join(" ")}`.toLowerCase()
  if (combined.includes("meeting-agenda") || combined.includes("agenda")) return "agendas"
  if (combined.includes("meeting_minutes") || combined.includes("meeting-minutes") || combined.includes("minutes")) return "minutes"
  return "other"
}

export function extractLegacyCategoryPath(classList = [], taxonomyNames = []) {
  const combined = `${classList.join(" ")} ${taxonomyNames.join(" ")}`.toLowerCase()
  if (combined.includes("meeting-agenda") || combined.includes("agenda")) {
    return { parent: "Meetings", child: "Agenda" }
  }
  if (combined.includes("meeting_minutes") || combined.includes("meeting-minutes") || combined.includes("minutes")) {
    return { parent: "Meetings", child: "Minutes" }
  }
  return { parent: undefined, child: undefined }
}

async function fetchAllPages(baseUrl) {
  const all = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const url = `${baseUrl}?per_page=${WP_PER_PAGE}&page=${page}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Fetch failed for ${url}: ${response.status} ${response.statusText}`)
    }

    const items = await response.json()
    all.push(...items)

    const totalPagesHeader = response.headers.get("x-wp-totalpages")
    totalPages = totalPagesHeader ? Number.parseInt(totalPagesHeader, 10) : 1
    page += 1
  }

  return all
}

async function fetchTaxonomyMap() {
  const items = await fetchAllPages(WP_TAXONOMY_BASE)
  return new Map(items.map((item) => [item.id, item]))
}

async function fetchAttachmentFileUrl(wpItem) {
  const mediaHref = wpItem?._links?.["wp:attachment"]?.[0]?.href
  if (!mediaHref) return null

  try {
    const response = await fetch(mediaHref)
    if (!response.ok) return null
    const mediaItems = await response.json()
    if (!Array.isArray(mediaItems) || mediaItems.length === 0) return null

    const urls = mediaItems
      .map((item) => item?.source_url)
      .filter((value) => typeof value === "string" && /^https?:\/\//.test(value))

    return urls.find((u) => /\.(pdf|docx?|xlsx?|txt)(\?|$)/i.test(u)) || urls[0] || null
  } catch {
    return null
  }
}

function formatDate(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toISOString().slice(0, 10)
}

function buildAgendaRecord(wp, taxonomyMap) {
  const termIds = Array.isArray(wp["document-type"]) ? wp["document-type"] : []
  const taxonomyNames = termIds
    .map((id) => taxonomyMap.get(id))
    .filter(Boolean)
    .map((item) => item.slug || item.name || String(item.id))

  const classList = Array.isArray(wp.class_list) ? wp.class_list : []
  const category = mapCategoryFromClassList(classList, taxonomyNames)
  const legacyPath = extractLegacyCategoryPath(classList, taxonomyNames)
  if (category !== "agendas") return null

  const override = WP_BOARD_AGENDA_OVERRIDES[wp.id] || null
  const html = override?.html || wp.content?.rendered || ""
  const plainText = stripTags(html)
  const modified = formatDate(wp.modified_gmt || wp.modified)
  const fallbackYear = modified ? Number.parseInt(modified.slice(0, 4), 10) : null
  const title = decodeHtml(override?.title || wp.title?.rendered || `WP Document ${wp.id}`).replace(/\s+/g, " ").trim()
  const meetingFromTitle = extractDateTimeFromText(title, null)
  const meetingFromBody = extractDateTimeFromText(plainText, fallbackYear)
  const meeting = {
    meetingDateIso: meetingFromTitle.meetingDateIso || meetingFromBody.meetingDateIso,
    meetingDateLabel: meetingFromTitle.meetingDateLabel || meetingFromBody.meetingDateLabel,
    meetingTimeLabel: meetingFromTitle.meetingTimeLabel || meetingFromBody.meetingTimeLabel,
  }

  return {
    id: wp.id,
    slug: wp.slug || "",
    title,
    normalizedTitle: `${inferMeetingKind(title)}${meeting.meetingDateLabel ? ` – ${meeting.meetingDateLabel}` : ""}${meeting.meetingTimeLabel ? ` at ${meeting.meetingTimeLabel}` : ""}`,
    status: wp.status || "",
    modified,
    taxonomy: taxonomyNames.join(", "),
    taxonomyNames,
    legacyPath: [legacyPath.parent, legacyPath.child].filter(Boolean).join(" > "),
    hasHtmlContent: plainText.length > 0,
    htmlChars: plainText.length,
    html,
    plainText,
    fileUrl:
      (typeof wp.document_file_url === "string" && wp.document_file_url.trim() ? wp.document_file_url.trim() : null) ||
      extractFileUrlFromAcf(wp.acf),
    link: wp.link || "",
    classList: classList.join(", "),
    meetingDateIso: meeting.meetingDateIso,
    meetingDateLabel: meeting.meetingDateLabel,
    meetingTimeLabel: meeting.meetingTimeLabel,
    outputBasename: buildOutputBasename(title, meeting.meetingDateIso, wp.id),
  }
}

export async function fetchWpBoardAgendas() {
  const [wpDocs, taxonomyMap] = await Promise.all([
    fetchAllPages(WP_DOC_BASE),
    fetchTaxonomyMap(),
  ])

  const agendas = []
  for (const wp of wpDocs) {
    const agenda = buildAgendaRecord(wp, taxonomyMap)
    if (!agenda) continue

    if (!agenda.fileUrl) {
      agenda.fileUrl = await fetchAttachmentFileUrl(wp)
    }

    agendas.push(agenda)
  }

  agendas.sort((a, b) => {
    if (a.meetingDateIso && b.meetingDateIso && a.meetingDateIso !== b.meetingDateIso) {
      return a.meetingDateIso.localeCompare(b.meetingDateIso)
    }
    if (a.modified !== b.modified) return a.modified.localeCompare(b.modified)
    return a.title.localeCompare(b.title)
  })

  return agendas
}

export function summarizeWpBoardAgendas(agendas) {
  return {
    totalAgendaDocs: agendas.length,
    withHtmlContent: agendas.filter((row) => row.hasHtmlContent).length,
    withFileUrl: agendas.filter((row) => !!row.fileUrl).length,
    htmlOnly: agendas.filter((row) => row.hasHtmlContent && !row.fileUrl).length,
    fileOnly: agendas.filter((row) => !row.hasHtmlContent && !!row.fileUrl).length,
    withBoth: agendas.filter((row) => row.hasHtmlContent && !!row.fileUrl).length,
  }
}

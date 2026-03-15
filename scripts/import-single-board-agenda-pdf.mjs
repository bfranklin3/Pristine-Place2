import dotenv from "dotenv"
import fs from "node:fs"
import path from "node:path"
import { createClient } from "@sanity/client"
import { PDFParse } from "pdf-parse"

dotenv.config({ path: ".env.local" })

const apiVersion = "2024-01-01"
const isDryRun = process.argv.includes("--dry-run")

const MONTHS = new Map([
  ["january", 1],
  ["february", 2],
  ["march", 3],
  ["april", 4],
  ["may", 5],
  ["june", 6],
  ["july", 7],
  ["august", 8],
  ["september", 9],
  ["october", 10],
  ["november", 11],
  ["december", 12],
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

function key(seed) {
  return seed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || Math.random().toString(36).slice(2, 10)
}

function safeSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96)
}

function pad2(value) {
  return String(value).padStart(2, "0")
}

function formatMeetingDateLabel(isoDate) {
  if (!isoDate) return null
  const parsed = new Date(`${isoDate}T12:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

function normalizeExtractedText(text) {
  const normalizedLines = String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => {
      if (!line) return false
      if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)) return false
      if (/^Page\s+\d+\s+of\s+\d+$/i.test(line)) return false
      return true
    })

  const deduped = []
  for (const line of normalizedLines) {
    if (deduped[deduped.length - 1] === line) continue
    deduped.push(line)
  }

  return deduped
}

function chunkParagraphs(paragraphs, maxChars = 1400) {
  const chunks = []

  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChars) {
      chunks.push(paragraph)
      continue
    }

    let remaining = paragraph
    while (remaining.length > maxChars) {
      chunks.push(remaining.slice(0, maxChars).trim())
      remaining = remaining.slice(maxChars).trim()
    }
    if (remaining) chunks.push(remaining)
  }

  return chunks
}

function toPortableTextParagraphs(paragraphs) {
  return paragraphs.map((text, index) => ({
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

function extractMeetingKind(text) {
  const lower = String(text || "").toLowerCase()
  if (lower.includes("organizational")) return "organizational"
  if (lower.includes("annual")) return "annual"
  if (lower.includes("special")) return "special"
  if (lower.includes("emergency")) return "emergency"
  if (lower.includes("membership")) return "membership"
  return "board"
}

function extractDateTime(text) {
  const normalized = String(text || "").replace(/[–—]/g, "-")
  const match = normalized.match(
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),\s*(\d{4})(?:\s+(\d{1,2})(?::?(\d{2}))?\s*(am|pm))?/i,
  )

  if (!match) return null

  const month = MONTHS.get(match[1].toLowerCase())
  const day = Number.parseInt(match[2], 10)
  const year = Number.parseInt(match[3], 10)
  if (!month || !year || !day) return null

  let timeLabel = null
  if (match[4]) {
    const rawHour = Number.parseInt(match[4], 10)
    const rawMinute = Number.parseInt(match[5] || "0", 10)
    const meridiem = String(match[6] || "").toUpperCase()
    let hour = rawHour
    if (meridiem === "AM" && hour === 12) hour = 0
    if (meridiem === "PM" && hour !== 12) hour += 12
    const hour12 = hour % 12 || 12
    const suffix = hour >= 12 ? "PM" : "AM"
    timeLabel = `${hour12}:${pad2(rawMinute)} ${suffix}`
  }

  return {
    meetingDateIso: `${year}-${pad2(month)}-${pad2(day)}`,
    meetingDateLabel: formatMeetingDateLabel(`${year}-${pad2(month)}-${pad2(day)}`),
    meetingTimeLabel: timeLabel,
  }
}

function buildTitle(kind, meetingDateLabel, meetingTimeLabel) {
  const labelByKind = {
    board: "Board Meeting Agenda",
    annual: "Annual Meeting Agenda",
    organizational: "Organizational Meeting Agenda",
    special: "Special Meeting Agenda",
    emergency: "Emergency Meeting Agenda",
    membership: "Membership Meeting Agenda",
  }

  const base = labelByKind[kind] || labelByKind.board
  const datePart = meetingDateLabel ? ` – ${meetingDateLabel}` : ""
  const timePart = meetingTimeLabel ? ` at ${meetingTimeLabel}` : ""
  return `${base}${datePart}${timePart}`
}

function buildDescription(kind, meetingDateIso) {
  const dateLabel = formatMeetingDateLabel(meetingDateIso)
  const labelByKind = {
    board: "Board meeting agenda",
    annual: "Annual meeting agenda",
    organizational: "Organizational meeting agenda",
    special: "Special meeting agenda",
    emergency: "Emergency meeting agenda",
    membership: "Membership meeting agenda",
  }
  const base = labelByKind[kind] || labelByKind.board
  const suffix = dateLabel ? ` for ${dateLabel}` : ""
  return `${base}${suffix}.`
}

async function extractPdfText(pdfPath) {
  const parser = new PDFParse({ data: fs.readFileSync(pdfPath) })

  try {
    const result = await parser.getText()
    return result.text || ""
  } finally {
    await parser.destroy()
  }
}

async function fetchExistingAgendaByDate(client, meetingDateIso) {
  const query = `*[
    _type == "hoaDocument" &&
    !(_id in path("drafts.**")) &&
    category == "agendas" &&
    meetingDate == $meetingDate
  ][0]{
    _id,
    title,
    slug,
    description,
    meetingDate,
    meetingTime,
    meetingKind,
    published,
    visibility,
    featured,
    requiresLogin,
    source,
    file,
    relatedEvent
  }`

  return client.fetch(query, { meetingDate: meetingDateIso })
}

async function uploadPdfAsset(client, pdfPath) {
  const buffer = fs.readFileSync(pdfPath)
  return client.assets.upload("file", buffer, {
    filename: path.basename(pdfPath),
    contentType: "application/pdf",
  })
}

async function main() {
  const pdfPath = getArgValue("--pdf")
  if (!pdfPath) throw new Error("Provide --pdf=/absolute/path/to/file.pdf")
  if (!fs.existsSync(pdfPath)) throw new Error(`PDF not found at ${pdfPath}`)

  const client = makeClient()
  const rawText = await extractPdfText(pdfPath)
  const normalizedParagraphs = chunkParagraphs(normalizeExtractedText(rawText))
  const dateTime = extractDateTime(rawText)

  if (!dateTime?.meetingDateIso) {
    throw new Error("Could not infer meeting date from PDF text.")
  }

  const meetingKind = extractMeetingKind(rawText)
  const title =
    getArgValue("--title") || buildTitle(meetingKind, dateTime.meetingDateLabel, dateTime.meetingTimeLabel || "7:00 PM")
  const slug = safeSlug(`board-meeting-agenda-${dateTime.meetingDateIso}`)
  const description = buildDescription(meetingKind, dateTime.meetingDateIso)
  const content = toPortableTextParagraphs(normalizedParagraphs)
  const existing = await fetchExistingAgendaByDate(client, dateTime.meetingDateIso)

  let fileRef = { _type: "reference", _ref: `dry-run-asset-${dateTime.meetingDateIso}` }
  if (!isDryRun) {
    const asset = await uploadPdfAsset(client, pdfPath)
    fileRef = { _type: "reference", _ref: asset._id }
  }

  const patchFields = {
    title,
    slug: {
      _type: "slug",
      current: slug,
    },
    description,
    content,
    file: {
      _type: "file",
      asset: fileRef,
    },
    fileType: "pdf",
    category: "agendas",
    categoryParent: "Meetings",
    categoryChild: "Agenda",
    meetingDate: dateTime.meetingDateIso,
    meetingTime: dateTime.meetingTimeLabel || "7:00 PM",
    meetingKind,
    published: existing?.published ?? true,
    visibility: existing?.visibility || "portal",
    showInSearch: true,
    featured: existing?.featured ?? false,
    requiresLogin: existing?.requiresLogin ?? true,
    source: existing?.source || "manual",
    tags: ["meetings", "agenda", "board"],
  }

  const docId = existing?._id || `manual-board-agenda-${dateTime.meetingDateIso}`

  if (!isDryRun) {
    if (existing) {
      await client.patch(docId).set(patchFields).commit({ autoGenerateArrayKeys: true })
    } else {
      await client.create({
        _id: docId,
        _type: "hoaDocument",
        ...patchFields,
      })
    }
  }

  const result = {
    at: new Date().toISOString(),
    dryRun: isDryRun,
    action: existing ? "patch" : "create",
    docId,
    meetingDate: dateTime.meetingDateIso,
    meetingTime: patchFields.meetingTime,
    meetingKind,
    title,
    pdfPath,
    contentBlocks: content.length,
  }

  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error("Single board agenda PDF import failed:", error)
  process.exit(1)
})

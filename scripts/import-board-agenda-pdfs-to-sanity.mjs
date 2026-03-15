import dotenv from "dotenv"
import fs from "node:fs"
import path from "node:path"
import { createClient } from "@sanity/client"

dotenv.config({ path: ".env.local" })

const DEFAULT_MANIFEST_PATH = path.join(process.cwd(), "tmp", "wp-board-agenda-pdfs", "manifest.json")
const apiVersion = "2024-01-01"
const isDryRun = process.argv.includes("--dry-run")

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

function readManifest(manifestPath) {
  const content = fs.readFileSync(manifestPath, "utf8")
  const parsed = JSON.parse(content)
  if (!Array.isArray(parsed.generated)) {
    throw new Error(`Manifest at ${manifestPath} does not contain a generated[] array.`)
  }
  return parsed
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

function inferMeetingKind(title) {
  const lower = String(title || "").toLowerCase()
  if (lower.includes("organizational")) return "organizational"
  if (lower.includes("annual")) return "annual"
  if (lower.includes("special")) return "special"
  if (lower.includes("emergency")) return "emergency"
  if (lower.includes("membership")) return "membership"
  return "board"
}

function buildDescription(entry) {
  const dateLabel = formatMeetingDateLabel(entry.meetingDateIso)
  const kind = inferMeetingKind(entry.normalizedTitle || entry.title)
  const labelByKind = {
    board: "Board meeting agenda",
    annual: "Annual meeting agenda",
    organizational: "Organizational meeting agenda",
    special: "Special meeting agenda",
    emergency: "Emergency meeting agenda",
    membership: "Membership meeting agenda",
  }
  const base = labelByKind[kind] || "Board meeting agenda"
  const suffix = dateLabel ? ` for ${dateLabel}` : ""
  return `${base}${suffix}.`
}

function slugFromSourceLink(url, fallback) {
  try {
    const parsed = new URL(url)
    const last = parsed.pathname.split("/").filter(Boolean).pop()
    return safeSlug(last || fallback)
  } catch {
    return safeSlug(fallback)
  }
}

async function fetchExistingDocs(client, ids) {
  if (!ids.length) return new Map()
  const query = `*[_type == "hoaDocument" && _id in $ids]{
    _id,
    title,
    description,
    slug,
    content,
    externalFileUrl,
    file,
    meetingDate,
    meetingTime,
    published,
    visibility,
    featured,
    requiresLogin,
    source,
    legacyWpId,
    legacyWpUrl
  }`
  const docs = await client.fetch(query, { ids })
  return new Map(docs.map((doc) => [doc._id, doc]))
}

async function uploadPdfAsset(client, pdfPath, filename) {
  const buffer = fs.readFileSync(pdfPath)
  return client.assets.upload("file", buffer, {
    filename,
    contentType: "application/pdf",
  })
}

async function main() {
  const manifestPath = getArgValue("--manifest") || DEFAULT_MANIFEST_PATH
  const limitRaw = getArgValue("--limit")
  const limit = limitRaw ? Math.max(1, Number.parseInt(limitRaw, 10) || 0) : null

  const manifest = readManifest(manifestPath)
  const entries = limit ? manifest.generated.slice(0, limit) : manifest.generated
  const sanity = makeClient()
  const ids = entries.map((entry) => `wp-document-${entry.id}`)
  const existingDocs = await fetchExistingDocs(sanity, ids)

  const summary = {
    manifestPath,
    selected: entries.length,
    existingDocsFound: existingDocs.size,
    uploadedAssets: 0,
    patchedDocs: 0,
    createdDocs: 0,
    skippedMissingPdf: 0,
    failed: 0,
  }
  const failures = []

  for (const entry of entries) {
    const docId = `wp-document-${entry.id}`
    const pdfPath = entry.pdfPath

    if (!pdfPath || !fs.existsSync(pdfPath)) {
      summary.skippedMissingPdf += 1
      console.log(`Skipped ${docId} (${entry.normalizedTitle || entry.title}) — missing PDF at ${pdfPath || "n/a"}`)
      continue
    }

    try {
      const filename = path.basename(pdfPath)
      const slug = slugFromSourceLink(entry.sourceLink, entry.outputBasename || entry.normalizedTitle || entry.title)
      const title = entry.normalizedTitle || entry.title
      const existing = existingDocs.get(docId)

      let assetRef = null
      if (!isDryRun) {
        const asset = await uploadPdfAsset(sanity, pdfPath, filename)
        assetRef = asset?._id
        if (!assetRef) throw new Error("PDF upload returned no asset _id")
      } else {
        assetRef = `dry-run-asset-${entry.id}`
      }

      const patchFields = {
        title,
        slug: {
          _type: "slug",
          current: slug,
        },
        description: existing?.description || buildDescription(entry),
        file: {
          _type: "file",
          asset: {
            _type: "reference",
            _ref: assetRef,
          },
        },
        fileType: "pdf",
        category: "agendas",
        categoryParent: "Meetings",
        categoryChild: "Agenda",
        meetingDate: entry.meetingDateIso || existing?.meetingDate || undefined,
        meetingTime: entry.meetingTimeLabel || existing?.meetingTime || undefined,
        meetingKind: inferMeetingKind(title),
        published: existing?.published ?? true,
        visibility: existing?.visibility || "portal",
        showInSearch: true,
        featured: existing?.featured ?? false,
        requiresLogin: existing?.requiresLogin ?? true,
        source: existing?.source || "wordpress",
        legacyWpId: entry.id,
        legacyWpUrl: entry.sourceLink || existing?.legacyWpUrl || undefined,
      }

      if (existing) {
        if (!isDryRun) {
          await sanity.patch(docId).set(patchFields).commit({ autoGenerateArrayKeys: true })
        }
        summary.uploadedAssets += 1
        summary.patchedDocs += 1
        console.log(`${isDryRun ? "Dry-run patch" : "Patched"} ${docId} | ${title}`)
      } else {
        const newDoc = {
          _id: docId,
          _type: "hoaDocument",
          ...patchFields,
          content: [],
          tags: ["meetings", "agenda", "board"],
          legacyWpSlug: slug,
        }

        if (!isDryRun) {
          await sanity.create(newDoc)
        }
        summary.uploadedAssets += 1
        summary.createdDocs += 1
        console.log(`${isDryRun ? "Dry-run create" : "Created"} ${docId} | ${title}`)
      }
    } catch (error) {
      summary.failed += 1
      failures.push({
        id: docId,
        title: entry.normalizedTitle || entry.title,
        error: error instanceof Error ? error.message : String(error),
      })
      console.error(`Failed ${docId}: ${failures[failures.length - 1].error}`)
    }
  }

  const result = {
    at: new Date().toISOString(),
    dryRun: isDryRun,
    summary,
    failures,
  }

  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error("Board agenda PDF import failed:", error)
  process.exit(1)
})

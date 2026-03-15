import dotenv from "dotenv"
import fs from "node:fs"
import path from "node:path"
import { createClient } from "@sanity/client"
import { PDFParse } from "pdf-parse"

dotenv.config({ path: ".env.local" })

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

function key(seed) {
  return seed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || Math.random().toString(36).slice(2, 10)
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

function normalizeExtractedText(text) {
  const normalizedLines = String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => {
      if (/^\d+\s*\|\s*P\s*a\s*g\s*e$/i.test(line)) return false
      if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)) return false
      if (/^Page\s+\d+\s+of\s+\d+$/i.test(line)) return false
      return true
    })

  const paragraphs = []
  let current = []

  for (const line of normalizedLines) {
    if (!line) {
      if (current.length) paragraphs.push(current.join(" "))
      current = []
      continue
    }

    if (/^(Draft|Approved)$/i.test(line) && current.length === 0) {
      current.push(line)
      continue
    }

    current.push(line)
  }

  if (current.length) paragraphs.push(current.join(" "))

  const deduped = []
  for (const paragraph of paragraphs) {
    if (!paragraph) continue
    if (deduped.length > 0 && deduped[deduped.length - 1] === paragraph) continue
    deduped.push(paragraph)
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

    const sentences = paragraph.split(/(?<=[.!?])\s+/)
    let current = ""

    for (const sentence of sentences) {
      if (!sentence) continue

      const next = current ? `${current} ${sentence}` : sentence
      if (next.length <= maxChars) {
        current = next
        continue
      }

      if (current) chunks.push(current)
      if (sentence.length <= maxChars) {
        current = sentence
        continue
      }

      let remaining = sentence
      while (remaining.length > maxChars) {
        chunks.push(remaining.slice(0, maxChars))
        remaining = remaining.slice(maxChars).trim()
      }
      current = remaining
    }

    if (current) chunks.push(current)
  }

  return chunks
}

async function extractPdfTextFromUrl(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`)
  }

  const data = Buffer.from(await response.arrayBuffer())
  const parser = new PDFParse({ data })

  try {
    const result = await parser.getText()
    return result.text || ""
  } finally {
    await parser.destroy()
  }
}

async function fetchMinuteDocs(client, limit) {
  const query = `*[
    _type == "hoaDocument" &&
    !(_id in path("drafts.**")) &&
    category == "minutes" &&
    ${force ? "true" : "(!defined(content) || count(content) == 0)"}
  ] | order(title asc) [0...$limit] {
    _id,
    title,
    content,
    file {
      asset->{
        url
      }
    },
    externalFileUrl
  }`

  return client.fetch(query, { limit })
}

async function main() {
  const limitRaw = getArgValue("--limit")
  const limit = limitRaw ? Math.max(1, Number.parseInt(limitRaw, 10) || 0) : 500

  const client = makeClient()
  const docs = await fetchMinuteDocs(client, limit)

  const summary = {
    selected: docs.length,
    extracted: 0,
    patched: 0,
    skippedMissingUrl: 0,
    skippedTooShort: 0,
    failed: 0,
  }

  const extracted = []
  const skippedMissingUrl = []
  const skippedTooShort = []
  const failures = []

  for (const doc of docs) {
    const url = doc.file?.asset?.url || doc.externalFileUrl || null

    if (!url) {
      summary.skippedMissingUrl += 1
      skippedMissingUrl.push({
        docId: doc._id,
        title: doc.title,
      })
      continue
    }

    try {
      const rawText = await extractPdfTextFromUrl(url)
      const paragraphs = chunkParagraphs(normalizeExtractedText(rawText))

      if (paragraphs.join(" ").length < 200) {
        summary.skippedTooShort += 1
        skippedTooShort.push({
          docId: doc._id,
          title: doc.title,
          extractedChars: rawText.length,
          normalizedChars: paragraphs.join(" ").length,
        })
        continue
      }

      const portableText = toPortableTextParagraphs(paragraphs)
      summary.extracted += 1
      extracted.push({
        docId: doc._id,
        title: doc.title,
        paragraphCount: portableText.length,
        normalizedChars: paragraphs.join(" ").length,
      })

      if (!isDryRun) {
        await client.patch(doc._id).set({ content: portableText }).commit({ autoGenerateArrayKeys: true })
      }

      summary.patched += 1
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
    extracted,
    skippedMissingUrl,
    skippedTooShort,
    failures,
  }

  const reportsDir = path.join(process.cwd(), "reports")
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true })
  const reportPath = path.join(reportsDir, `board-minutes-searchable-content-${Date.now()}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  console.log(JSON.stringify({ ...report, reportPath }, null, 2))
}

main().catch((error) => {
  console.error("Board minutes searchable content backfill failed:", error)
  process.exit(1)
})

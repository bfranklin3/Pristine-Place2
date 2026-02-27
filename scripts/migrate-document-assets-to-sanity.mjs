import dotenv from "dotenv"
import { createClient } from "@sanity/client"
import fs from "node:fs"
import path from "node:path"

dotenv.config({ path: ".env.local" })

const apiVersion = "2024-01-01"
const isDryRun = process.argv.includes("--dry-run")
const clearExternal = process.argv.includes("--clear-external")

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))
const limit = limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : undefined

const startArg = process.argv.find((arg) => arg.startsWith("--start="))
const start = startArg ? Number.parseInt(startArg.split("=")[1], 10) : 0

const retriesArg = process.argv.find((arg) => arg.startsWith("--retries="))
const retries = retriesArg ? Number.parseInt(retriesArg.split("=")[1], 10) : 2

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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

function extFromUrl(url) {
  const clean = String(url).split("?")[0].split("#")[0]
  const ext = path.extname(clean).toLowerCase()
  if (ext) return ext
  return ".pdf"
}

function safeFilename(base) {
  return String(base)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function filenameForDoc(doc) {
  const url = String(doc.externalFileUrl || "")
  const fromUrl = decodeURIComponent(url.split("?")[0].split("#")[0].split("/").pop() || "")
  if (fromUrl) return safeFilename(fromUrl)
  const slug = doc.slug?.current || doc._id
  return `${safeFilename(slug || "document")}${extFromUrl(url)}`
}

function mimeFromFilename(name) {
  const lower = name.toLowerCase()
  if (lower.endsWith(".pdf")) return "application/pdf"
  if (lower.endsWith(".doc")) return "application/msword"
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel"
  if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  if (lower.endsWith(".txt")) return "text/plain"
  return "application/octet-stream"
}

async function fetchWithRetry(url, maxRetries) {
  let lastError
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": "PristinePlaceAssetMigration/1.0" },
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`)
      }
      return response
    } catch (error) {
      lastError = error
      if (attempt < maxRetries) {
        await sleep(500 * (attempt + 1))
      }
    }
  }
  throw lastError
}

async function getDocsToMigrate(client) {
  const query = `*[
    _type == "hoaDocument" &&
    published == true &&
    defined(externalFileUrl) &&
    !defined(file.asset)
  ] | order(_createdAt asc) {
    _id,
    title,
    slug,
    externalFileUrl
  }`
  return client.fetch(query)
}

async function main() {
  const sanity = makeClient()
  const docs = await getDocsToMigrate(sanity)

  const sliceStart = Math.max(0, start || 0)
  const sliceEnd = Number.isFinite(limit) && limit > 0 ? sliceStart + limit : undefined
  const batch = docs.slice(sliceStart, sliceEnd)

  const stats = {
    totalCandidates: docs.length,
    selected: batch.length,
    migrated: 0,
    skippedNoUrl: 0,
    failed: 0,
  }
  const failures = []
  const urlToAsset = new Map()

  console.log(
    `Document asset migration starting: selected=${stats.selected}, dryRun=${isDryRun}, clearExternal=${clearExternal}`
  )

  for (let i = 0; i < batch.length; i += 1) {
    const doc = batch[i]
    const url = String(doc.externalFileUrl || "").trim()
    const label = `[${i + 1}/${batch.length}] ${doc._id} ${doc.title}`

    if (!url) {
      stats.skippedNoUrl += 1
      console.log(`${label} -> skipped (no externalFileUrl)`)
      continue
    }

    try {
      let assetId = urlToAsset.get(url)

      if (!assetId) {
        const response = await fetchWithRetry(url, retries)
        const buffer = Buffer.from(await response.arrayBuffer())
        const filename = filenameForDoc(doc)
        const contentType = response.headers.get("content-type") || mimeFromFilename(filename)

        if (!isDryRun) {
          const asset = await sanity.assets.upload("file", buffer, {
            filename,
            contentType,
          })
          assetId = asset?._id
          if (!assetId) throw new Error("Asset upload returned no _id")
        } else {
          assetId = `dry-run-asset-${i + 1}`
        }

        urlToAsset.set(url, assetId)
      }

      if (!isDryRun) {
        const patch = sanity.patch(doc._id).set({
          file: {
            _type: "file",
            asset: {
              _type: "reference",
              _ref: assetId,
            },
          },
        })

        if (clearExternal) patch.unset(["externalFileUrl"])
        await patch.commit({ autoGenerateArrayKeys: true })
      }

      stats.migrated += 1
      console.log(`${label} -> migrated (${isDryRun ? "dry-run" : "uploaded"})`)
    } catch (error) {
      stats.failed += 1
      failures.push({
        id: doc._id,
        title: doc.title,
        url,
        error: error instanceof Error ? error.message : String(error),
      })
      console.error(`${label} -> failed: ${failures[failures.length - 1].error}`)
    }
  }

  const report = {
    at: new Date().toISOString(),
    args: process.argv.slice(2),
    stats,
    failures,
  }

  const reportsDir = path.join(process.cwd(), "reports")
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true })
  const reportPath = path.join(reportsDir, `document-asset-migration-${Date.now()}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  console.log("Migration summary:", stats)
  console.log(`Report saved: ${reportPath}`)
}

main().catch((error) => {
  console.error("Document asset migration failed:", error)
  process.exit(1)
})


import "dotenv/config"
import path from "node:path"
import { PrismaClient } from "@prisma/client"
import { canonicalizeAddressParts, normalizeSpace } from "../lib/address-normalization"
import { getAccImportOverride } from "./lib/acc-import-overrides"

type GfEntry = Record<string, unknown> & {
  id?: string
  form_id?: string
  date_created?: string
  date_updated?: string
  status?: string
}

type ImportMode = "full" | "delta" | "final"

const prisma = new PrismaClient()

const GF_API_URL = process.env.GRAVITY_FORMS_API_URL ?? "https://www.pristineplace.us/wp-json/gf/v2"
const GF_KEY = process.env.GRAVITY_FORMS_API_KEY ?? ""
const GF_SECRET = process.env.GRAVITY_FORMS_API_SECRET ?? ""
const DEFAULT_FORM_ID = process.env.ACC_FORM_ID ?? "44"

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  return idx >= 0 ? process.argv[idx + 1] : undefined
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function gfAuthHeaders() {
  const token = Buffer.from(`${GF_KEY}:${GF_SECRET}`).toString("base64")
  return {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
  }
}

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const out = String(value).trim()
  return out.length > 0 ? out : null
}

function parseWpDateTime(value: unknown): Date | null {
  const s = asString(value)
  if (!s) return null
  // GF dates are typically "YYYY-MM-DD HH:mm:ss"
  const iso = s.replace(" ", "T")
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseMdyDate(value: unknown): Date | null {
  const s = asString(value)
  if (!s) return null
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const month = Number.parseInt(m[1], 10)
  const day = Number.parseInt(m[2], 10)
  const year = Number.parseInt(m[3], 10)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const d = new Date(year, month - 1, day)
  return Number.isNaN(d.getTime()) ? null : d
}

function normalizeAddress(raw: string | null): {
  addressRaw: string | null
  addressNumber: string | null
  streetName: string | null
  addressCanonical: string | null
} {
  if (!raw) {
    return { addressRaw: null, addressNumber: null, streetName: null, addressCanonical: null }
  }

  const cleaned = normalizeSpace(raw).replace(/[.,]/g, "")
  const parsed = canonicalizeAddressParts(cleaned)
  if (!parsed.number) {
    return {
      addressRaw: cleaned,
      addressNumber: null,
      streetName: null,
      addressCanonical: parsed.canonical,
    }
  }

  const addressNumber = parsed.number
  const streetName = parsed.street
  const addressCanonical = parsed.canonical

  return {
    addressRaw: cleaned,
    addressNumber,
    streetName,
    addressCanonical,
  }
}

function normalizeDisposition(value: unknown):
  | "approved"
  | "denied"
  | "conditional"
  | "duplicate"
  | "canceled"
  | "unknown" {
  const v = (asString(value) ?? "").toLowerCase()
  if (v === "approved") return "approved"
  if (v === "denied" || v === "disapproved" || v === "rejected") return "denied"
  if (v === "conditional") return "conditional"
  if (v === "duplicate") return "duplicate"
  if (v === "canceled" || v === "cancelled") return "canceled"
  return "unknown"
}

function parseUrls(raw: unknown): string[] {
  const urls = new Set<string>()

  function addUrl(candidate: string) {
    const cleaned = candidate.trim().replace(/^"+|"+$/g, "")
    if (!/^https?:\/\//i.test(cleaned)) return
    urls.add(cleaned)
  }

  function walk(value: unknown) {
    if (!value) return
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (!trimmed) return

      if ((trimmed.startsWith("[") || trimmed.startsWith("{")) && trimmed.includes("http")) {
        try {
          walk(JSON.parse(trimmed))
        } catch {
          // Ignore invalid JSON and keep fallback parsing below.
        }
      }

      addUrl(trimmed)
      const matches = trimmed.match(/https?:\/\/[^\s"'<>]+/g) || []
      for (const m of matches) addUrl(m)
      const split = trimmed.split(/[\n,]+/)
      for (const part of split) addUrl(part)
      return
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item)
      return
    }
    if (typeof value === "object") {
      for (const item of Object.values(value as Record<string, unknown>)) walk(item)
    }
  }

  walk(raw)
  return Array.from(urls)
}

function filenameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const base = path.basename(parsed.pathname)
    return base || null
  } catch {
    return null
  }
}

function mapEntry(entry: GfEntry, formId: string) {
  const sourceEntryId = asString(entry.id) ?? ""
  const submittedAt = parseWpDateTime(entry.date_created)
  const updatedAtSource = parseWpDateTime(entry.date_updated)
  const statusRaw = asString(entry.status)
  const ownerName = asString(entry["23"])
  const ownerPhone = asString(entry["6"])
  const ownerEmail = asString(entry["20"])
  const authorizedRepName = asString(entry["44"])
  const workType = asString(entry["27"])
  const description = asString(entry["14"])
  const notes = asString(entry["37"])
  const permitNumber = asString(entry["39"])
  const processDate = parseMdyDate(entry["61"])
  const override = getAccImportOverride(sourceEntryId)
  const disposition = override?.disposition ?? normalizeDisposition(entry["55"])
  const phase = asString(entry["4"])
  const lot = asString(entry["5"])
  const address = normalizeAddress(asString(entry["58"]))

  const attachments = [
    ...parseUrls(entry["19"]).map((url) => ({ fieldId: "19", url, filename: filenameFromUrl(url) })),
    ...parseUrls(entry["60"]).map((url) => ({ fieldId: "60", url, filename: filenameFromUrl(url) })),
  ]

  return {
    sourceSystem: "wordpress_gf" as const,
    sourceFormId: formId,
    sourceEntryId,
    submittedAt,
    updatedAtSource,
    statusRaw,
    disposition,
    permitNumber,
    processDate,
    workType,
    ownerName,
    ownerPhone,
    ownerEmail,
    authorizedRepName,
    addressRaw: address.addressRaw,
    addressNumber: address.addressNumber,
    streetName: address.streetName,
    addressCanonical: address.addressCanonical,
    phase,
    lot,
    description,
    notes,
    rawEntryJson: override
      ? {
          ...entry,
          ...override.rawEntryPatch,
          _importOverrideNote: override.note,
        }
      : entry,
    attachments,
  }
}

function compareForChange(
  existing: Record<string, unknown> | null,
  mapped: ReturnType<typeof mapEntry>,
  existingAttachments: Array<{ fieldId: string; url: string }> = [],
): { changed: boolean; attachmentChanged: boolean } {
  if (!existing) return { changed: true, attachmentChanged: mapped.attachments.length > 0 }

  const keysToCompare: Array<keyof ReturnType<typeof mapEntry>> = [
    "submittedAt",
    "updatedAtSource",
    "statusRaw",
    "disposition",
    "permitNumber",
    "processDate",
    "workType",
    "ownerName",
    "ownerPhone",
    "ownerEmail",
    "authorizedRepName",
    "addressRaw",
    "addressNumber",
    "streetName",
    "addressCanonical",
    "phase",
    "lot",
    "description",
    "notes",
  ]

  let changed = false
  for (const key of keysToCompare) {
    const a = existing[key as string]
    const b = mapped[key]
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changed = true
      break
    }
  }

  const incomingSet = new Set(mapped.attachments.map((a) => `${a.fieldId}|${a.url}`))
  const existingSet = new Set(existingAttachments.map((a) => `${a.fieldId}|${a.url}`))
  const attachmentChanged =
    incomingSet.size !== existingSet.size ||
    Array.from(incomingSet).some((item) => !existingSet.has(item))

  return { changed, attachmentChanged }
}

async function fetchAllEntries(formId: string, pageSize = 200): Promise<GfEntry[]> {
  if (!GF_KEY || !GF_SECRET) {
    throw new Error("Missing GRAVITY_FORMS_API_KEY or GRAVITY_FORMS_API_SECRET.")
  }

  const rows: GfEntry[] = []
  let page = 1
  let total = Number.POSITIVE_INFINITY

  while (rows.length < total) {
    const url = new URL(`${GF_API_URL}/forms/${formId}/entries`)
    url.searchParams.set("paging[page_size]", String(pageSize))
    url.searchParams.set("paging[current_page]", String(page))
    url.searchParams.set("search", JSON.stringify({ status: "active" }))

    const res = await fetch(url.toString(), { headers: gfAuthHeaders(), cache: "no-store" })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(`Failed GF fetch page ${page}: ${res.status} ${JSON.stringify(json).slice(0, 220)}`)
    }

    const entries = Array.isArray(json?.entries) ? (json.entries as GfEntry[]) : []
    total = typeof json?.total_count === "number" ? json.total_count : rows.length + entries.length
    rows.push(...entries)

    if (!entries.length) break
    page += 1
    if (page > 1000) break
  }

  return rows
}

async function main() {
  const formId = getArg("--form") ?? DEFAULT_FORM_ID
  const modeArg = (getArg("--mode") ?? "full").toLowerCase()
  const mode: ImportMode = modeArg === "delta" || modeArg === "final" ? modeArg : "full"
  const dryRun = hasFlag("--dry-run")
  const entryIdFilter = getArg("--entry-id") ?? null
  const limitArg = getArg("--limit")
  const pageSize = Math.max(10, Number.parseInt(getArg("--page-size") ?? "200", 10) || 200)

  const startedAt = new Date()
  let rowsRead = 0
  let rowsProcessed = 0
  let rowsUpserted = 0
  let rowsUnchanged = 0
  let attachmentsUpserted = 0
  const errors: Array<{ entryId?: string; message: string }> = []

  let importRunId: string | null = null
  if (!dryRun) {
    const run = await prisma.accImportRun.create({
      data: {
        sourceSystem: "wordpress_gf",
        sourceFormId: formId,
        mode,
        startedAt,
        triggeredBy: "script:import-acc-from-gf",
      },
    })
    importRunId = run.id
  }

  try {
    const allRows = await fetchAllEntries(formId, pageSize)
    const limit = limitArg ? Math.max(1, Number.parseInt(limitArg, 10) || allRows.length) : allRows.length
    const filtered = entryIdFilter
      ? allRows.filter((row) => asString(row.id) === entryIdFilter)
      : allRows
    const selected = filtered.slice(0, limit)
    rowsRead = allRows.length

    for (const entry of selected) {
      const mapped = mapEntry(entry, formId)
      rowsProcessed += 1

      if (!mapped.sourceEntryId) {
        errors.push({ message: "Missing source entry id" })
        continue
      }

      try {
        const existing = await prisma.accRequest.findUnique({
          where: {
            sourceSystem_sourceFormId_sourceEntryId: {
              sourceSystem: "wordpress_gf",
              sourceFormId: formId,
              sourceEntryId: mapped.sourceEntryId,
            },
          },
          include: {
            attachments: {
              where: { fieldId: { in: ["19", "60"] } },
              select: { fieldId: true, url: true },
            },
          },
        })

        const { changed, attachmentChanged } = compareForChange(
          existing as unknown as Record<string, unknown> | null,
          mapped,
          existing?.attachments ?? [],
        )

        if (!changed && !attachmentChanged) {
          rowsUnchanged += 1
          if (!dryRun) {
            await prisma.accRequest.update({
              where: { id: existing!.id },
              data: { lastSeenAt: new Date() },
            })
          }
          continue
        }

        rowsUpserted += 1
        attachmentsUpserted += mapped.attachments.length

        if (dryRun) continue

        await prisma.$transaction(async (tx) => {
          const upserted = await tx.accRequest.upsert({
            where: {
              sourceSystem_sourceFormId_sourceEntryId: {
                sourceSystem: "wordpress_gf",
                sourceFormId: formId,
                sourceEntryId: mapped.sourceEntryId,
              },
            },
            create: {
              sourceSystem: "wordpress_gf",
              sourceFormId: formId,
              sourceEntryId: mapped.sourceEntryId,
              submittedAt: mapped.submittedAt,
              updatedAtSource: mapped.updatedAtSource,
              statusRaw: mapped.statusRaw,
              disposition: mapped.disposition,
              permitNumber: mapped.permitNumber,
              processDate: mapped.processDate,
              workType: mapped.workType,
              ownerName: mapped.ownerName,
              ownerPhone: mapped.ownerPhone,
              ownerEmail: mapped.ownerEmail,
              authorizedRepName: mapped.authorizedRepName,
              addressRaw: mapped.addressRaw,
              addressNumber: mapped.addressNumber,
              streetName: mapped.streetName,
              addressCanonical: mapped.addressCanonical,
              phase: mapped.phase,
              lot: mapped.lot,
              description: mapped.description,
              notes: mapped.notes,
              rawEntryJson: mapped.rawEntryJson,
              importBatchId: importRunId,
              lastSeenAt: new Date(),
            },
            update: {
              submittedAt: mapped.submittedAt,
              updatedAtSource: mapped.updatedAtSource,
              statusRaw: mapped.statusRaw,
              disposition: mapped.disposition,
              permitNumber: mapped.permitNumber,
              processDate: mapped.processDate,
              workType: mapped.workType,
              ownerName: mapped.ownerName,
              ownerPhone: mapped.ownerPhone,
              ownerEmail: mapped.ownerEmail,
              authorizedRepName: mapped.authorizedRepName,
              addressRaw: mapped.addressRaw,
              addressNumber: mapped.addressNumber,
              streetName: mapped.streetName,
              addressCanonical: mapped.addressCanonical,
              phase: mapped.phase,
              lot: mapped.lot,
              description: mapped.description,
              notes: mapped.notes,
              rawEntryJson: mapped.rawEntryJson,
              importBatchId: importRunId,
              lastSeenAt: new Date(),
            },
          })

          for (const att of mapped.attachments) {
            await tx.accRequestAttachment.upsert({
              where: {
                accRequestId_fieldId_url: {
                  accRequestId: upserted.id,
                  fieldId: att.fieldId,
                  url: att.url,
                },
              },
              create: {
                accRequestId: upserted.id,
                fieldId: att.fieldId,
                url: att.url,
                filename: att.filename,
              },
              update: {
                filename: att.filename,
              },
            })
          }

          const keepKeys = new Set(mapped.attachments.map((a) => `${a.fieldId}|${a.url}`))
          const existingAttachments = await tx.accRequestAttachment.findMany({
            where: {
              accRequestId: upserted.id,
              fieldId: { in: ["19", "60"] },
            },
            select: { id: true, fieldId: true, url: true },
          })
          const deleteIds = existingAttachments
            .filter((a) => !keepKeys.has(`${a.fieldId}|${a.url}`))
            .map((a) => a.id)
          if (deleteIds.length) {
            await tx.accRequestAttachment.deleteMany({
              where: { id: { in: deleteIds } },
            })
          }
        })
      } catch (error) {
        errors.push({
          entryId: mapped.sourceEntryId,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
  } finally {
    if (!dryRun && importRunId) {
      await prisma.accImportRun.update({
        where: { id: importRunId },
        data: {
          finishedAt: new Date(),
          rowsRead,
          rowsUpserted,
          rowsUnchanged,
          attachmentsUpserted,
          errorsJson: errors.length ? errors.slice(0, 200) : null,
        },
      })
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? "dry-run" : mode,
        formId,
        entryIdFilter,
        pageSize,
        rowsRead,
        rowsProcessed,
        rowsUpserted,
        rowsUnchanged,
        attachmentsUpserted,
        errors: errors.length,
        sampleErrors: errors.slice(0, 5),
      },
      null,
      2,
    ),
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

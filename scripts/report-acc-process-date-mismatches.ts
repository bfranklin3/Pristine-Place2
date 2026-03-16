import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { HOA_TIME_ZONE, formatDateInHoaTimeZone, zonedLocalDateTimeToUtc } from "../lib/timezone"

const prisma = new PrismaClient()

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const out = String(value).trim()
  return out.length > 0 ? out : null
}

function parseRawProcessDate(value: unknown): Date | null {
  const s = asString(value)
  if (!s) return null

  let year = 0
  let month = 0
  let day = 0

  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) {
    month = Number.parseInt(mdy[1], 10)
    day = Number.parseInt(mdy[2], 10)
    year = Number.parseInt(mdy[3], 10)
  } else {
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!iso) return null
    year = Number.parseInt(iso[1], 10)
    month = Number.parseInt(iso[2], 10)
    day = Number.parseInt(iso[3], 10)
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const date = zonedLocalDateTimeToUtc({ year, month, day, hour: 0, minute: 0, second: 0 }, HOA_TIME_ZONE)
  return Number.isNaN(date.getTime()) ? null : date
}

function toHoaDateLabel(date: Date | null): string | null {
  if (!date) return null
  return formatDateInHoaTimeZone(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

async function main() {
  const rows = await prisma.accRequest.findMany({
    orderBy: [{ updatedAtSource: "desc" }, { sourceEntryId: "desc" }],
    select: {
      id: true,
      sourceEntryId: true,
      ownerName: true,
      permitNumber: true,
      processDate: true,
      updatedAtSource: true,
      rawEntryJson: true,
    },
  })

  const mismatches = rows.flatMap((row) => {
    const rawValue = row.rawEntryJson && typeof row.rawEntryJson === "object"
      ? (row.rawEntryJson as Record<string, unknown>)["61"]
      : null
    const rawText = asString(rawValue)
    if (!rawText) return []

    const parsedRaw = parseRawProcessDate(rawText)
    const expectedLabel = toHoaDateLabel(parsedRaw)
    const storedLabel = toHoaDateLabel(row.processDate)

    if (expectedLabel === storedLabel) return []

    return [{
      id: row.id,
      sourceEntryId: row.sourceEntryId,
      ownerName: row.ownerName,
      permitNumber: row.permitNumber,
      rawProcessDate: rawText,
      expectedHoaDate: expectedLabel,
      storedProcessDateIso: row.processDate ? row.processDate.toISOString() : null,
      storedHoaDate: storedLabel,
      updatedAtSource: row.updatedAtSource ? row.updatedAtSource.toISOString() : null,
    }]
  })

  console.log(JSON.stringify({
    totalRows: rows.length,
    mismatches: mismatches.length,
    rows: mismatches,
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

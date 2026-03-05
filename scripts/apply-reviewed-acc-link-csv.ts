import "dotenv/config"
import XLSX from "xlsx"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

type ReviewAction = "link" | "unresolved" | "skip"
type ResidentState = "current" | "past" | "unknown"
type MatchConfidence = "high" | "medium" | "low" | "unresolved"

type CsvRow = Record<string, unknown>

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  return idx >= 0 ? process.argv[idx + 1] : undefined
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function toStr(value: unknown): string {
  return String(value ?? "").trim()
}

function toNullable(value: unknown): string | null {
  const v = toStr(value)
  return v ? v : null
}

function asReviewAction(value: string): ReviewAction | null {
  const v = value.toLowerCase()
  if (v === "link" || v === "unresolved" || v === "skip") return v
  return null
}

function asResidentState(value: string): ResidentState | null {
  const v = value.toLowerCase()
  if (v === "current" || v === "past" || v === "unknown") return v
  return null
}

function asMatchConfidence(value: string): MatchConfidence | null {
  const v = value.toLowerCase()
  if (v === "high" || v === "medium" || v === "low" || v === "unresolved") return v
  return null
}

async function main() {
  const filePath = getArg("--file")
  const execute = hasFlag("--execute")
  const actor = getArg("--actor") || "script:apply-reviewed-acc-link-csv"
  const limitArg = Number.parseInt(getArg("--limit") || "0", 10) || 0

  if (!filePath) {
    throw new Error("Missing --file. Example: npm run apply:acc:link-review -- --file '/abs/path/review.csv' --execute")
  }

  const wb = XLSX.readFile(filePath)
  const sheetName = wb.SheetNames[0]
  if (!sheetName) throw new Error("CSV/Workbook has no sheet.")
  const sheet = wb.Sheets[sheetName]
  if (!sheet) throw new Error("Unable to load first worksheet.")
  const rows = XLSX.utils.sheet_to_json<CsvRow>(sheet, { defval: "" })
  const selected = limitArg > 0 ? rows.slice(0, limitArg) : rows

  const summary = {
    mode: execute ? "execute" : "dry-run",
    filePath,
    rowsRead: selected.length,
    actionableRows: 0,
    linked: 0,
    unresolved: 0,
    skipped: 0,
    errors: 0,
  }

  const results: Array<{
    row: number
    accId: string
    sourceEntryId: string
    action: string
    status: "ok" | "skip" | "error"
    reason?: string
  }> = []

  for (let i = 0; i < selected.length; i += 1) {
    const rowNum = i + 2
    const row = selected[i]

    const accId = toStr(row.accId)
    const sourceEntryId = toStr(row.sourceEntryId)
    const actionRaw = toStr(row.reviewAction)
    const action = asReviewAction(actionRaw)

    if (!accId || !sourceEntryId) {
      summary.errors += 1
      results.push({ row: rowNum, accId, sourceEntryId, action: actionRaw, status: "error", reason: "Missing accId/sourceEntryId." })
      continue
    }

    if (!action || action === "skip") {
      summary.skipped += 1
      results.push({ row: rowNum, accId, sourceEntryId, action: actionRaw || "skip", status: "skip", reason: "No actionable reviewAction." })
      continue
    }

    summary.actionableRows += 1

    try {
      const acc = await prisma.accRequest.findUnique({
        where: { id: accId },
        select: { id: true, sourceEntryId: true, householdId: true, residencyId: true, clerkUserId: true },
      })
      if (!acc) {
        summary.errors += 1
        results.push({ row: rowNum, accId, sourceEntryId, action, status: "error", reason: "AccRequest not found." })
        continue
      }
      if (acc.sourceEntryId !== sourceEntryId) {
        summary.errors += 1
        results.push({ row: rowNum, accId, sourceEntryId, action, status: "error", reason: "sourceEntryId mismatch for accId." })
        continue
      }

      const reviewNotes = toStr(row.reviewNotes)

      if (action === "unresolved") {
        if (execute) {
          await prisma.$transaction(async (tx) => {
            await tx.accRequest.update({
              where: { id: accId },
              data: {
                residencyId: null,
                clerkUserId: null,
                residentState: "unknown",
                matchConfidence: "unresolved",
                matchMethod: "manual_review_unresolved",
                matchedAt: new Date(),
                matchedBy: actor,
              },
            })
            await tx.linkAudit.create({
              data: {
                entityType: "acc_request",
                entityId: accId,
                previousHouseholdId: acc.householdId,
                newHouseholdId: acc.householdId,
                previousResidencyId: acc.residencyId,
                newResidencyId: null,
                reason: reviewNotes || "Manual review marked unresolved.",
                actorUserId: actor,
              },
            })
          })
        }

        summary.unresolved += 1
        results.push({ row: rowNum, accId, sourceEntryId, action, status: "ok" })
        continue
      }

      const reviewResidencyId = toNullable(row.reviewResidencyId)
      const reviewClerkUserId = toNullable(row.reviewClerkUserId)
      const state = asResidentState(toStr(row.reviewResidentState)) || "current"
      const confidence = asMatchConfidence(toStr(row.reviewMatchConfidence)) || "medium"

      if (!reviewResidencyId) {
        summary.errors += 1
        results.push({ row: rowNum, accId, sourceEntryId, action, status: "error", reason: "reviewResidencyId is required for action=link." })
        continue
      }

      const residency = await prisma.residency.findUnique({
        where: { id: reviewResidencyId },
        select: { id: true, householdId: true, clerkUserId: true },
      })
      if (!residency) {
        summary.errors += 1
        results.push({ row: rowNum, accId, sourceEntryId, action, status: "error", reason: "reviewResidencyId not found." })
        continue
      }

      if (acc.householdId && acc.householdId !== residency.householdId) {
        summary.errors += 1
        results.push({ row: rowNum, accId, sourceEntryId, action, status: "error", reason: "reviewResidencyId belongs to different household." })
        continue
      }

      const nextClerkUserId = reviewClerkUserId || residency.clerkUserId || null

      if (execute) {
        await prisma.$transaction(async (tx) => {
          await tx.accRequest.update({
            where: { id: accId },
            data: {
              householdId: residency.householdId,
              residencyId: reviewResidencyId,
              clerkUserId: nextClerkUserId,
              residentState: state,
              matchConfidence: confidence,
              matchMethod: "manual_review",
              matchedAt: new Date(),
              matchedBy: actor,
            },
          })
          await tx.linkAudit.create({
            data: {
              entityType: "acc_request",
              entityId: accId,
              previousHouseholdId: acc.householdId,
              newHouseholdId: residency.householdId,
              previousResidencyId: acc.residencyId,
              newResidencyId: reviewResidencyId,
              reason: reviewNotes || "Manual review linked residency.",
              actorUserId: actor,
            },
          })
        })
      }

      summary.linked += 1
      results.push({ row: rowNum, accId, sourceEntryId, action, status: "ok" })
    } catch (error) {
      summary.errors += 1
      results.push({
        row: rowNum,
        accId,
        sourceEntryId,
        action: actionRaw,
        status: "error",
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }

  console.log(JSON.stringify({ summary, results }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

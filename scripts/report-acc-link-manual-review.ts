import "dotenv/config"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  return idx >= 0 ? process.argv[idx + 1] : undefined
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function nameFromParts(first: string | null | undefined, last: string | null | undefined): string {
  return normalizeSpace([first || "", last || ""].join(" ")).trim()
}

function csvEscape(value: unknown): string {
  const s = String(value ?? "")
  return `"${s.replace(/"/g, "\"\"")}"`
}

type CandidateResidency = {
  residencyId: string
  residentType: string
  clerkUserId: string
  names: string[]
}

function recommendationFor(input: {
  householdId: string
  residencyId: string
  matchConfidence: string
  candidateCurrentCount: number
}): string {
  if (!input.householdId) {
    return "ADDRESS_UNRESOLVED: verify/normalize address, then relink household."
  }
  if (!input.residencyId && input.candidateCurrentCount === 1) {
    return "LINK_SINGLE_CURRENT: one current residency candidate at household."
  }
  if (!input.residencyId && input.candidateCurrentCount > 1) {
    return "SELECT_CURRENT_RESIDENT: multiple current residency candidates at household."
  }
  if (input.matchConfidence === "low") {
    return "VERIFY_NAME_MATCH: linked by address with low confidence; confirm owner/authorized rep."
  }
  return "REVIEW_REQUIRED"
}

async function main() {
  const outDir = resolve(getArg("--out-dir") || "reports")
  const stamp = new Date().toISOString().replace(/[:]/g, "-").slice(0, 19)
  const csvPath = resolve(getArg("--csv") || `${outDir}/acc-link-manual-review-${stamp}.csv`)
  const jsonPath = resolve(getArg("--json") || `${outDir}/acc-link-manual-review-${stamp}.json`)

  const rows = await prisma.accRequest.findMany({
    where: {
      OR: [{ residentState: "unknown" }, { matchConfidence: "low" }],
    },
    orderBy: [{ submittedAt: "desc" }, { sourceEntryId: "desc" }],
    select: {
      id: true,
      sourceEntryId: true,
      permitNumber: true,
      submittedAt: true,
      ownerName: true,
      authorizedRepName: true,
      ownerEmail: true,
      ownerPhone: true,
      addressRaw: true,
      addressCanonical: true,
      addressKey: true,
      householdId: true,
      residencyId: true,
      clerkUserId: true,
      residentState: true,
      matchConfidence: true,
      matchMethod: true,
      household: {
        select: {
          addressCanonical: true,
          residencies: {
            select: {
              id: true,
              residentType: true,
              clerkUserId: true,
              isCurrent: true,
              residentProfiles: {
                select: {
                  id: true,
                  householdMembers: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  const reportRows = rows.map((row) => {
    const currentCandidates: CandidateResidency[] = (row.household?.residencies || [])
      .filter((r) => r.isCurrent)
      .map((r) => {
        const names = new Set<string>()
        for (const rp of r.residentProfiles) {
          for (const m of rp.householdMembers) {
            const full = nameFromParts(m.firstName, m.lastName)
            if (full) names.add(full)
          }
        }
        return {
          residencyId: r.id,
          residentType: r.residentType,
          clerkUserId: r.clerkUserId || "",
          names: Array.from(names.values()),
        }
      })

    const recommendation = recommendationFor({
      householdId: row.householdId || "",
      residencyId: row.residencyId || "",
      matchConfidence: row.matchConfidence,
      candidateCurrentCount: currentCandidates.length,
    })

    return {
      id: row.id,
      sourceEntryId: row.sourceEntryId,
      permitNumber: row.permitNumber || "",
      submittedAt: row.submittedAt ? row.submittedAt.toISOString() : "",
      ownerName: row.ownerName || "",
      authorizedRepName: row.authorizedRepName || "",
      ownerEmail: row.ownerEmail || "",
      ownerPhone: row.ownerPhone || "",
      addressRaw: row.addressRaw || "",
      addressCanonical: row.addressCanonical || row.household?.addressCanonical || "",
      addressKey: row.addressKey || "",
      householdId: row.householdId || "",
      residencyId: row.residencyId || "",
      clerkUserId: row.clerkUserId || "",
      residentState: row.residentState,
      matchConfidence: row.matchConfidence,
      matchMethod: row.matchMethod || "",
      candidateCurrentCount: currentCandidates.length,
      candidateCurrentResidencies: currentCandidates.map((c) => c.residencyId).join("|"),
      candidateCurrentClerkUsers: currentCandidates.map((c) => c.clerkUserId).filter(Boolean).join("|"),
      candidateCurrentNames: currentCandidates.flatMap((c) => c.names).join(" | "),
      recommendation,
    }
  })

  await mkdir(dirname(csvPath), { recursive: true })
  await mkdir(dirname(jsonPath), { recursive: true })

  const csvHeader = [
    "accId",
    "sourceEntryId",
    "permitNumber",
    "submittedAt",
    "ownerName",
    "authorizedRepName",
    "ownerEmail",
    "ownerPhone",
    "addressRaw",
    "addressCanonical",
    "addressKey",
    "householdId",
    "residencyId",
    "clerkUserId",
    "residentState",
    "matchConfidence",
    "matchMethod",
    "candidateCurrentCount",
    "candidateCurrentResidencies",
    "candidateCurrentClerkUsers",
    "candidateCurrentNames",
    "recommendation",
    "reviewAction",
    "reviewResidencyId",
    "reviewClerkUserId",
    "reviewResidentState",
    "reviewMatchConfidence",
    "reviewNotes",
  ]

  const csvLines = [csvHeader.map(csvEscape).join(",")]
  for (const row of reportRows) {
    csvLines.push(
      [
        row.id,
        row.sourceEntryId,
        row.permitNumber,
        row.submittedAt,
        row.ownerName,
        row.authorizedRepName,
        row.ownerEmail,
        row.ownerPhone,
        row.addressRaw,
        row.addressCanonical,
        row.addressKey,
        row.householdId,
        row.residencyId,
        row.clerkUserId,
        row.residentState,
        row.matchConfidence,
        row.matchMethod,
        row.candidateCurrentCount,
        row.candidateCurrentResidencies,
        row.candidateCurrentClerkUsers,
        row.candidateCurrentNames,
        row.recommendation,
        "",
        "",
        "",
        "",
        "",
        "",
      ]
        .map(csvEscape)
        .join(","),
    )
  }

  await writeFile(csvPath, `${csvLines.join("\n")}\n`, "utf8")
  await writeFile(
    jsonPath,
    JSON.stringify(
      {
        reportType: "acc-link-manual-review",
        generatedAt: new Date().toISOString(),
        totalRows: reportRows.length,
        rows: reportRows,
      },
      null,
      2,
    ),
    "utf8",
  )

  console.log(
    JSON.stringify(
      {
        reportType: "acc-link-manual-review",
        totalRows: reportRows.length,
        csvPath,
        jsonPath,
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

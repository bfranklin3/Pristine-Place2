import "dotenv/config"
import fs from "node:fs/promises"
import path from "node:path"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

type ProfileCandidate = {
  residentProfileId: string
  primaryUserId: string
  addressFull: string | null
  residentCategory: string | null
}

function parseArgs() {
  const format = process.argv.includes("--json") ? "json" : "text"
  return { format }
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

function scoreCandidateSets(input: {
  residencyCandidates: ProfileCandidate[]
  householdCandidates: ProfileCandidate[]
}) {
  const residencyUsers = uniqueStrings(input.residencyCandidates.map((row) => row.primaryUserId))
  const householdUsers = uniqueStrings(input.householdCandidates.map((row) => row.primaryUserId))

  if (residencyUsers.length === 1) {
    return {
      confidence: "high" as const,
      recommendedClerkUserId: residencyUsers[0],
      reason: "Exactly one primaryUserId found on resident profiles already linked to this residency.",
    }
  }

  if (residencyUsers.length > 1) {
    return {
      confidence: "ambiguous" as const,
      recommendedClerkUserId: null,
      reason: "Multiple different primaryUserIds found on resident profiles linked to this residency.",
    }
  }

  if (householdUsers.length === 1) {
    return {
      confidence: "medium" as const,
      recommendedClerkUserId: householdUsers[0],
      reason: "No residency-linked profile had a primaryUserId, but the household has exactly one primaryUserId.",
    }
  }

  if (householdUsers.length > 1) {
    return {
      confidence: "ambiguous" as const,
      recommendedClerkUserId: null,
      reason: "Multiple different primaryUserIds found on resident profiles in this household.",
    }
  }

  return {
    confidence: "none" as const,
    recommendedClerkUserId: null,
    reason: "No resident profile with a primaryUserId was found for this residency or household.",
  }
}

async function main() {
  const { format } = parseArgs()

  const rows = await prisma.residency.findMany({
    where: {
      isCurrent: true,
      clerkUserId: null,
    },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    include: {
      household: {
        select: {
          id: true,
          addressCanonical: true,
          addressRaw: true,
          residentProfiles: {
            select: {
              id: true,
              primaryUserId: true,
              addressFull: true,
              residentCategory: true,
              residencyId: true,
            },
            orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
          },
        },
      },
      residentProfiles: {
        select: {
          id: true,
          primaryUserId: true,
          addressFull: true,
          residentCategory: true,
        },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      },
    },
  })

  const reportRows = rows.map((row) => {
    const residencyCandidates = row.residentProfiles
      .filter((profile): profile is typeof profile & { primaryUserId: string } => Boolean(profile.primaryUserId))
      .map((profile) => ({
        residentProfileId: profile.id,
        primaryUserId: profile.primaryUserId,
        addressFull: profile.addressFull,
        residentCategory: profile.residentCategory,
      }))

    const householdCandidates = (row.household?.residentProfiles || [])
      .filter((profile): profile is typeof profile & { primaryUserId: string } => Boolean(profile.primaryUserId))
      .map((profile) => ({
        residentProfileId: profile.id,
        primaryUserId: profile.primaryUserId,
        addressFull: profile.addressFull,
        residentCategory: profile.residentCategory,
      }))

    const scored = scoreCandidateSets({
      residencyCandidates,
      householdCandidates,
    })

    return {
      residencyId: row.id,
      householdId: row.householdId,
      addressCanonical: row.household?.addressCanonical || null,
      addressRaw: row.household?.addressRaw || null,
      residencyCandidateCount: residencyCandidates.length,
      householdCandidateCount: householdCandidates.length,
      residencyCandidateUserIds: uniqueStrings(residencyCandidates.map((profile) => profile.primaryUserId)),
      householdCandidateUserIds: uniqueStrings(householdCandidates.map((profile) => profile.primaryUserId)),
      confidence: scored.confidence,
      recommendedClerkUserId: scored.recommendedClerkUserId,
      reason: scored.reason,
      residencyCandidates,
      householdCandidates,
    }
  })

  const summary = {
    totalCurrentResidenciesMissingClerkUserId: reportRows.length,
    highConfidence: reportRows.filter((row) => row.confidence === "high").length,
    mediumConfidence: reportRows.filter((row) => row.confidence === "medium").length,
    ambiguous: reportRows.filter((row) => row.confidence === "ambiguous").length,
    noCandidate: reportRows.filter((row) => row.confidence === "none").length,
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    summary,
    rows: reportRows,
  }

  const reportsDir = path.join(process.cwd(), "reports")
  await fs.mkdir(reportsDir, { recursive: true })
  const outputPath = path.join(reportsDir, `missing-residency-clerk-links-${Date.now()}.json`)
  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2))

  if (format === "json") {
    console.log(JSON.stringify({ reportPath: outputPath, ...payload }, null, 2))
  } else {
    console.log(`Report written to ${outputPath}`)
    console.log(JSON.stringify(summary, null, 2))
    const sample = reportRows.slice(0, 15).map((row) => ({
      residencyId: row.residencyId,
      householdId: row.householdId,
      addressCanonical: row.addressCanonical,
      confidence: row.confidence,
      recommendedClerkUserId: row.recommendedClerkUserId,
      reason: row.reason,
    }))
    console.table(sample)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

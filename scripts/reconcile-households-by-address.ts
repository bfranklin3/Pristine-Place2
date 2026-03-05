import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

type HouseholdRow = {
  id: string
  addressRaw: string | null
  addressCanonical: string
  addressKey: string
  lotNumber: string | null
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  return idx >= 0 ? process.argv[idx + 1] : undefined
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function normalizeAddressBase(input: string | null): {
  number: string
  streetBase: string
  suffix: string
  unit: string
  key: string
} | null {
  if (!input) return null
  const cleaned = normalizeSpace(input.toUpperCase().replace(/[.,]/g, ""))
  const unitMatch = cleaned.match(/\b(?:APT|UNIT|STE|SUITE|#)\s*([A-Z0-9-]+)\b/)
  const withoutUnit = normalizeSpace(
    cleaned.replace(/\b(?:APT|UNIT|STE|SUITE|#)\s*[A-Z0-9-]+\b/g, " ").trim(),
  )
  const parts = withoutUnit.split(" ").filter(Boolean)
  if (!parts.length) return null
  const number = /^\d+[A-Z]?$/.test(parts[0]) ? parts[0] : ""
  if (!number) return null
  const suffixMap: Record<string, string> = {
    AVE: "AVE",
    AVENUE: "AVE",
    ST: "ST",
    STREET: "ST",
    BLVD: "BLVD",
    BOULEVARD: "BLVD",
    CT: "CT",
    COURT: "CT",
    LN: "LN",
    LANE: "LN",
    LOOP: "LOOP",
    DR: "DR",
    DRIVE: "DR",
    RD: "RD",
    ROAD: "RD",
    PL: "PL",
    PLACE: "PL",
    CIR: "CIR",
    CIRCLE: "CIR",
    TER: "TER",
    TERRACE: "TER",
    PKWY: "PKWY",
    PARKWAY: "PKWY",
    WAY: "WAY",
    TRL: "TRL",
    TRAIL: "TRL",
  }
  const suffixSet = new Set(Object.keys(suffixMap))
  let detectedSuffix = ""
  const streetParts = parts.slice(1).filter((p, index, arr) => {
    const isLast = index === arr.length - 1
    if (!isLast) return true
    if (!suffixSet.has(p)) return true
    detectedSuffix = suffixMap[p] || p
    return false
  })
  if (!streetParts.length) return null
  const streetBase = streetParts.join(" ")
  const unit = unitMatch?.[1] || ""
  return {
    number,
    streetBase,
    suffix: detectedSuffix,
    unit,
    key: `${number}|${streetBase}|${unit}`,
  }
}

function lotKey(value: string | null): string {
  return (value || "").trim().toUpperCase()
}

type GroupCandidate = {
  household: HouseholdRow
  suffix: string
  refs: {
    residencies: number
    residentProfiles: number
    accRequests: number
  }
}

async function main() {
  const execute = hasFlag("--execute")
  const actor = getArg("--actor") || "script:reconcile-households-by-address"
  const maxGroups = Number.parseInt(getArg("--max-groups") || "0", 10) || 0

  const households = (await prisma.household.findMany({
    select: {
      id: true,
      addressRaw: true,
      addressCanonical: true,
      addressKey: true,
      lotNumber: true,
      _count: {
        select: {
          residencies: true,
          residentProfiles: true,
          accRequests: true,
        },
      },
    },
    orderBy: [{ addressCanonical: "asc" }],
  })) as Array<HouseholdRow & { _count: { residencies: number; residentProfiles: number; accRequests: number } }>

  const grouped = new Map<string, GroupCandidate[]>()
  for (const h of households) {
    const norm = normalizeAddressBase(h.addressCanonical || h.addressRaw)
    if (!norm) continue
    const groupKey = `${norm.key}|LOT:${lotKey(h.lotNumber)}`
    const list = grouped.get(groupKey) || []
    list.push({
      household: {
        id: h.id,
        addressRaw: h.addressRaw,
        addressCanonical: h.addressCanonical,
        addressKey: h.addressKey,
        lotNumber: h.lotNumber,
      },
      suffix: norm.suffix,
      refs: h._count,
    })
    grouped.set(groupKey, list)
  }

  const rawGroups = Array.from(grouped.entries()).filter(([, list]) => list.length > 1)
  const mergeGroups: Array<[string, GroupCandidate[]]> = []
  const skippedConflictingSuffixGroups: Array<{ groupKey: string; suffixes: string[]; householdIds: string[] }> = []
  for (const [groupKey, list] of rawGroups) {
    const knownSuffixes = Array.from(new Set(list.map((x) => x.suffix).filter(Boolean)))
    if (knownSuffixes.length <= 1) {
      mergeGroups.push([groupKey, list])
      continue
    }
    skippedConflictingSuffixGroups.push({
      groupKey,
      suffixes: knownSuffixes,
      householdIds: list.map((x) => x.household.id),
    })
  }
  const limitedMergeGroups = mergeGroups.slice(0, maxGroups > 0 ? maxGroups : undefined)

  const groupsFound = limitedMergeGroups.length
  let groupsMerged = 0
  let householdsDeleted = 0
  let profilesRepointed = 0
  let residenciesRepointed = 0
  let accRepointed = 0
  let auditRows = 0

  const preview: Array<{
    groupKey: string
    keepHouseholdId: string
    mergedHouseholdIds: string[]
    keepAddress: string
    mergedAddresses: string[]
  }> = []

  for (const [groupKey, list] of limitedMergeGroups) {
    const sorted = [...list].sort((a, b) => {
      const aScore = a.refs.residencies * 100 + a.refs.residentProfiles * 10 + a.refs.accRequests
      const bScore = b.refs.residencies * 100 + b.refs.residentProfiles * 10 + b.refs.accRequests
      if (aScore !== bScore) return bScore - aScore
      return (b.household.addressCanonical || "").length - (a.household.addressCanonical || "").length
    })
    const keep = sorted[0]
    const mergeFrom = sorted.slice(1)
    if (!mergeFrom.length) continue

    preview.push({
      groupKey,
      keepHouseholdId: keep.household.id,
      mergedHouseholdIds: mergeFrom.map((x) => x.household.id),
      keepAddress: keep.household.addressCanonical,
      mergedAddresses: mergeFrom.map((x) => x.household.addressCanonical),
    })

    if (!execute) continue

    for (const from of mergeFrom) {
      const fromId = from.household.id
      const toId = keep.household.id

      const [profiles, residencies, accRows] = await Promise.all([
        prisma.residentProfile.findMany({
          where: { householdId: fromId },
          select: { id: true, householdId: true, residencyId: true },
        }),
        prisma.residency.findMany({
          where: { householdId: fromId },
          select: { id: true, householdId: true },
        }),
        prisma.accRequest.findMany({
          where: { householdId: fromId },
          select: { id: true, householdId: true, residencyId: true },
        }),
      ])

      if (profiles.length) {
        await prisma.residentProfile.updateMany({
          where: { householdId: fromId },
          data: { householdId: toId },
        })
        profilesRepointed += profiles.length
      }

      if (residencies.length) {
        await prisma.residency.updateMany({
          where: { householdId: fromId },
          data: { householdId: toId },
        })
        residenciesRepointed += residencies.length
      }

      if (accRows.length) {
        await prisma.accRequest.updateMany({
          where: { householdId: fromId },
          data: { householdId: toId },
        })
        accRepointed += accRows.length
      }

      for (const p of profiles) {
        await prisma.linkAudit.create({
          data: {
            entityType: "access_record",
            entityId: p.id,
            previousHouseholdId: fromId,
            newHouseholdId: toId,
            previousResidencyId: p.residencyId,
            newResidencyId: p.residencyId,
            reason: "Household reconciliation: merged duplicate household by normalized address base.",
            actorUserId: actor,
          },
        })
        auditRows += 1
      }
      for (const r of residencies) {
        await prisma.linkAudit.create({
          data: {
            entityType: "residency",
            entityId: r.id,
            previousHouseholdId: fromId,
            newHouseholdId: toId,
            previousResidencyId: r.id,
            newResidencyId: r.id,
            reason: "Household reconciliation: merged duplicate household by normalized address base.",
            actorUserId: actor,
          },
        })
        auditRows += 1
      }
      for (const a of accRows) {
        await prisma.linkAudit.create({
          data: {
            entityType: "acc_request",
            entityId: a.id,
            previousHouseholdId: fromId,
            newHouseholdId: toId,
            previousResidencyId: a.residencyId,
            newResidencyId: a.residencyId,
            reason: "Household reconciliation: merged duplicate household by normalized address base.",
            actorUserId: actor,
          },
        })
        auditRows += 1
      }

      await prisma.household.delete({ where: { id: fromId } })
      householdsDeleted += 1
    }

    groupsMerged += 1
  }

  console.log(
    JSON.stringify(
      {
        mode: execute ? "execute" : "dry-run",
        actor,
        groupsWithPotentialDuplicates: rawGroups.length,
        groupsFound,
        skippedConflictingSuffixGroups: skippedConflictingSuffixGroups.length,
        groupsMerged,
        householdsDeleted,
        repointed: {
          residentProfiles: profilesRepointed,
          residencies: residenciesRepointed,
          accRequests: accRepointed,
        },
        linkAuditsCreated: auditRows,
        skippedConflictingSuffixPreview: skippedConflictingSuffixGroups.slice(0, 25),
        preview: preview.slice(0, 25),
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

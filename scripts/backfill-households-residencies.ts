import "dotenv/config"
import crypto from "node:crypto"
import { PrismaClient } from "@prisma/client"
import { canonicalizeAddressParts, normalizeSpace } from "../lib/address-normalization"

const prisma = new PrismaClient()

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  return idx >= 0 ? process.argv[idx + 1] : undefined
}

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  return s.length ? s : null
}

function normalizeAddress(raw: string | null): {
  addressRaw: string | null
  addressCanonical: string | null
  addressKey: string | null
  lotNumber: string | null
} {
  if (!raw) return { addressRaw: null, addressCanonical: null, addressKey: null, lotNumber: null }

  const cleaned = normalizeSpace(raw).replace(/[.,]/g, "")
  const upper = cleaned.toUpperCase()
  const unitMatch = upper.match(/\b(?:APT|UNIT|STE|SUITE|#)\s*([A-Z0-9-]+)\b/)
  const lotMatch = upper.match(/\bLOT\s*([A-Z0-9-]+)\b/)

  const noUnit = upper.replace(/\b(?:APT|UNIT|STE|SUITE|#)\s*[A-Z0-9-]+\b/g, "").trim()
  const parsed = canonicalizeAddressParts(noUnit)
  const canonicalStreet = parsed.canonical

  const canonical = unitMatch ? `${canonicalStreet} UNIT ${unitMatch[1]}` : canonicalStreet
  const keySource = `${canonical}|LOT:${lotMatch?.[1] || ""}`
  const addressKey = crypto.createHash("sha1").update(keySource).digest("hex")

  return {
    addressRaw: cleaned,
    addressCanonical: canonical || null,
    addressKey: canonical ? addressKey : null,
    lotNumber: lotMatch?.[1] || null,
  }
}

function stableId(prefix: string, input: string): string {
  return `${prefix}_${crypto.createHash("sha1").update(input).digest("hex").slice(0, 24)}`
}

function normalizePersonName(value: string | null): string {
  if (!value) return ""
  return normalizeSpace(value).toUpperCase().replace(/[^A-Z0-9 ]/g, "")
}

function pickResidentType(value: string | null): "owner" | "tenant" | "authorized_occupant" | "unknown" {
  const v = (value || "").toLowerCase()
  if (v.includes("owner")) return "owner"
  if (v.includes("tenant") || v.includes("renter")) return "tenant"
  if (v.includes("authorized")) return "authorized_occupant"
  return "unknown"
}

type ProfileSource = {
  id: string
  primaryUserId: string | null
  residentCategory: string | null
  phase: string | null
  addressFull: string | null
  addressKey: string | null
  householdId: string | null
  residencyId: string | null
}

type AccSource = {
  id: string
  addressRaw: string | null
  addressCanonical: string | null
  addressKey: string | null
  ownerName: string | null
  authorizedRepName: string | null
  householdId: string | null
  residencyId: string | null
  clerkUserId: string | null
}

async function main() {
  const execute = hasFlag("--execute")
  const limitProfiles = Number.parseInt(getArg("--limit-profiles") || "0", 10) || 0
  const limitAcc = Number.parseInt(getArg("--limit-acc") || "0", 10) || 0
  const actor = getArg("--actor") || "script:backfill-households-residencies"
  const nowIso = new Date().toISOString()

  const profilesRaw = await prisma.residentProfile.findMany({
    select: {
      id: true,
      primaryUserId: true,
      residentCategory: true,
      phase: true,
      addressFull: true,
      addressKey: true,
      householdId: true,
      residencyId: true,
    },
    ...(limitProfiles > 0 ? { take: limitProfiles } : {}),
  })
  const profiles = profilesRaw as ProfileSource[]

  const accRaw = await prisma.accRequest.findMany({
    select: {
      id: true,
      addressRaw: true,
      addressCanonical: true,
      addressKey: true,
      ownerName: true,
      authorizedRepName: true,
      householdId: true,
      residencyId: true,
      clerkUserId: true,
    },
    ...(limitAcc > 0 ? { take: limitAcc } : {}),
  })
  const accRows = accRaw as AccSource[]

  const householdCandidates = new Map<
    string,
    { id: string; addressRaw: string; addressCanonical: string; lotNumber: string | null; phase: string | null }
  >()

  for (const row of profiles) {
    const normalized = normalizeAddress(row.addressFull)
    if (!normalized.addressKey || !normalized.addressCanonical || !normalized.addressRaw) continue
    if (!householdCandidates.has(normalized.addressKey)) {
      householdCandidates.set(normalized.addressKey, {
        id: stableId("hh", normalized.addressKey),
        addressRaw: normalized.addressRaw,
        addressCanonical: normalized.addressCanonical,
        lotNumber: normalized.lotNumber,
        phase: row.phase,
      })
    }
  }
  for (const row of accRows) {
    const normalized = normalizeAddress(row.addressCanonical || row.addressRaw)
    if (!normalized.addressKey || !normalized.addressCanonical || !normalized.addressRaw) continue
    if (!householdCandidates.has(normalized.addressKey)) {
      householdCandidates.set(normalized.addressKey, {
        id: stableId("hh", normalized.addressKey),
        addressRaw: normalized.addressRaw,
        addressCanonical: normalized.addressCanonical,
        lotNumber: normalized.lotNumber,
        phase: null,
      })
    }
  }

  const existingHouseholds = await prisma.household.findMany({
    select: { id: true, addressKey: true, addressCanonical: true, addressRaw: true, lotNumber: true, phase: true },
  })
  const existingByKey = new Map(existingHouseholds.map((h) => [h.addressKey, h]))

  let householdsCreated = 0
  let householdsUpdated = 0
  for (const [addressKey, candidate] of householdCandidates.entries()) {
    const existing = existingByKey.get(addressKey)
    if (!existing) {
      householdsCreated += 1
      if (execute) {
        await prisma.household.create({
          data: {
            id: candidate.id,
            addressRaw: candidate.addressRaw,
            addressCanonical: candidate.addressCanonical,
            addressKey,
            lotNumber: candidate.lotNumber,
            phase: candidate.phase,
          },
        })
      }
      continue
    }

    const shouldUpdate =
      (existing.addressRaw || "") !== candidate.addressRaw ||
      (existing.addressCanonical || "") !== candidate.addressCanonical ||
      (existing.lotNumber || "") !== (candidate.lotNumber || "") ||
      (existing.phase || "") !== (candidate.phase || "")
    if (shouldUpdate) {
      householdsUpdated += 1
      if (execute) {
        await prisma.household.update({
          where: { id: existing.id },
          data: {
            addressRaw: candidate.addressRaw,
            addressCanonical: candidate.addressCanonical,
            lotNumber: candidate.lotNumber,
            phase: candidate.phase,
          },
        })
      }
    }
  }

  const households = execute
    ? await prisma.household.findMany({ select: { id: true, addressKey: true } })
    : existingHouseholds
        .map((h) => ({ id: h.id, addressKey: h.addressKey }))
        .concat(
          Array.from(householdCandidates.entries())
            .filter(([key]) => !existingByKey.has(key))
            .map(([key, value]) => ({ id: value.id, addressKey: key })),
        )
  const householdByKey = new Map(households.map((h) => [h.addressKey, h]))

  let profilesLinked = 0
  let profilesUnresolved = 0
  let residenciesCreated = 0
  let residenciesUpdated = 0
  let profileLinkAudits = 0

  const residencyByProfileId = new Map<
    string,
    { id: string; householdId: string; clerkUserId: string | null; isCurrent: boolean; names: string[] }
  >()

  const members = await prisma.householdMember.findMany({
    select: { residentProfileId: true, firstName: true, lastName: true },
  })
  const namesByProfile = new Map<string, string[]>()
  for (const m of members) {
    const full = normalizePersonName(
      [asString(m.firstName), asString(m.lastName)].filter(Boolean).join(" "),
    )
    if (!full) continue
    const list = namesByProfile.get(m.residentProfileId) || []
    if (!list.includes(full)) list.push(full)
    namesByProfile.set(m.residentProfileId, list)
  }

  for (const row of profiles) {
    const normalized = normalizeAddress(row.addressFull)
    const household = normalized.addressKey ? householdByKey.get(normalized.addressKey) : null
    if (!household || !normalized.addressKey) {
      profilesUnresolved += 1
      continue
    }

    profilesLinked += 1
    const residencyId = stableId("res", row.id)
    const residentType = pickResidentType(row.residentCategory)
    const names = namesByProfile.get(row.id) || []
    residencyByProfileId.set(row.id, {
      id: residencyId,
      householdId: household.id,
      clerkUserId: row.primaryUserId,
      isCurrent: true,
      names,
    })

    const currentState = "current" as const
    const profileNeedsUpdate =
      row.addressKey !== normalized.addressKey || row.householdId !== household.id || row.residencyId !== residencyId

    if (execute) {
      const existingResidency = await prisma.residency.findUnique({ where: { id: residencyId } })
      if (!existingResidency) {
        residenciesCreated += 1
        await prisma.residency.create({
          data: {
            id: residencyId,
            householdId: household.id,
            clerkUserId: row.primaryUserId,
            residentType,
            isCurrent: true,
            sourceSystem: "resident_profile",
            sourceRecordId: row.id,
          },
        })
      } else {
        const needsResidencyUpdate =
          existingResidency.householdId !== household.id ||
          (existingResidency.clerkUserId || "") !== (row.primaryUserId || "") ||
          existingResidency.residentType !== residentType ||
          existingResidency.isCurrent !== true
        if (needsResidencyUpdate) {
          residenciesUpdated += 1
          await prisma.residency.update({
            where: { id: residencyId },
            data: {
              householdId: household.id,
              clerkUserId: row.primaryUserId,
              residentType,
              isCurrent: true,
              sourceSystem: "resident_profile",
              sourceRecordId: row.id,
            },
          })
        }
      }

      if (profileNeedsUpdate) {
        await prisma.residentProfile.update({
          where: { id: row.id },
          data: {
            addressKey: normalized.addressKey,
            householdId: household.id,
            residencyId,
            residentState: currentState,
            matchConfidence: "high",
            matchMethod: "backfill_address_profile",
            matchedAt: new Date(nowIso),
            matchedBy: actor,
          },
        })
        await prisma.linkAudit.create({
          data: {
            entityType: "access_record",
            entityId: row.id,
            previousHouseholdId: row.householdId,
            newHouseholdId: household.id,
            previousResidencyId: row.residencyId,
            newResidencyId: residencyId,
            reason: "Backfill household/residency link from resident profile address.",
            actorUserId: actor,
          },
        })
        profileLinkAudits += 1
      }
    } else {
      if (profileNeedsUpdate) {
        residenciesCreated += 1
      }
    }
  }

  const residencies = execute
    ? (
        await prisma.residency.findMany({
          select: { id: true, householdId: true, clerkUserId: true, isCurrent: true, sourceRecordId: true },
        })
      ).map((r) => ({
        id: r.id,
        householdId: r.householdId,
        clerkUserId: r.clerkUserId,
        isCurrent: r.isCurrent,
        profileNames: r.sourceRecordId ? namesByProfile.get(r.sourceRecordId) || [] : [],
      }))
    : Array.from(residencyByProfileId.values()).map((r) => ({
        id: r.id,
        householdId: r.householdId,
        clerkUserId: r.clerkUserId,
        isCurrent: r.isCurrent,
        profileNames: r.names,
      }))

  const residencyByHousehold = new Map<string, Array<{ id: string; clerkUserId: string | null; isCurrent: boolean; profileNames: string[] }>>()
  for (const r of residencies) {
    const list = residencyByHousehold.get(r.householdId) || []
    list.push({
      id: r.id,
      clerkUserId: r.clerkUserId,
      isCurrent: r.isCurrent,
      profileNames: r.profileNames,
    })
    residencyByHousehold.set(r.householdId, list)
  }

  let accLinked = 0
  let accUnresolved = 0
  let accHouseholdOnly = 0
  let accLinkAudits = 0

  for (const row of accRows) {
    const normalized = normalizeAddress(row.addressCanonical || row.addressRaw)
    const household = normalized.addressKey ? householdByKey.get(normalized.addressKey) : null
    const personName = normalizePersonName(row.ownerName || row.authorizedRepName)

    let nextResidencyId: string | null = null
    let nextClerkUserId: string | null = null
    let nextResidentState: "current" | "past" | "unknown" = "unknown"
    let nextMatchConfidence: "high" | "medium" | "low" | "unresolved" = "unresolved"
    let nextMatchMethod = "backfill_unresolved"
    let nextHouseholdId: string | null = null

    if (household) {
      nextHouseholdId = household.id
      const candidates = residencyByHousehold.get(household.id) || []
      if (personName) {
        const exact = candidates.find((candidate) => candidate.profileNames.includes(personName))
        if (exact) {
          nextResidencyId = exact.id
          nextClerkUserId = exact.clerkUserId
          nextResidentState = exact.isCurrent ? "current" : "past"
          nextMatchConfidence = "high"
          nextMatchMethod = "backfill_address_name"
        }
      }

      if (!nextResidencyId) {
        const currentCandidates = candidates.filter((candidate) => candidate.isCurrent)
        if (currentCandidates.length === 1) {
          const only = currentCandidates[0]
          nextResidencyId = only.id
          nextClerkUserId = only.clerkUserId
          nextResidentState = "current"
          nextMatchConfidence = "medium"
          nextMatchMethod = "backfill_address_single_current"
        } else {
          nextMatchConfidence = "low"
          nextMatchMethod = "backfill_address_only"
          accHouseholdOnly += 1
        }
      }
      accLinked += 1
    } else {
      accUnresolved += 1
    }

    const accNeedsUpdate =
      row.addressKey !== (normalized.addressKey || null) ||
      row.householdId !== nextHouseholdId ||
      row.residencyId !== nextResidencyId ||
      (row.clerkUserId || null) !== nextClerkUserId

    if (!accNeedsUpdate) continue

    if (execute) {
      await prisma.accRequest.update({
        where: { id: row.id },
        data: {
          addressKey: normalized.addressKey,
          householdId: nextHouseholdId,
          residencyId: nextResidencyId,
          clerkUserId: nextClerkUserId,
          residentState: nextResidentState,
          matchConfidence: nextMatchConfidence,
          matchMethod: nextMatchMethod,
          matchedAt: new Date(nowIso),
          matchedBy: actor,
        },
      })
      await prisma.linkAudit.create({
        data: {
          entityType: "acc_request",
          entityId: row.id,
          previousHouseholdId: row.householdId,
          newHouseholdId: nextHouseholdId,
          previousResidencyId: row.residencyId,
          newResidencyId: nextResidencyId,
          reason: "Backfill household/residency link from ACC address/name matching.",
          actorUserId: actor,
        },
      })
      accLinkAudits += 1
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: execute ? "execute" : "dry-run",
        actor,
        nowIso,
        sourceCounts: {
          residentProfiles: profiles.length,
          accRequests: accRows.length,
        },
        households: {
          candidates: householdCandidates.size,
          create: householdsCreated,
          update: householdsUpdated,
        },
        residencies: {
          create: residenciesCreated,
          update: residenciesUpdated,
        },
        residentProfileLinking: {
          linked: profilesLinked,
          unresolved: profilesUnresolved,
          linkAudits: profileLinkAudits,
        },
        accLinking: {
          linkedToHousehold: accLinked,
          unresolved: accUnresolved,
          householdOnlyLowConfidence: accHouseholdOnly,
          linkAudits: accLinkAudits,
        },
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

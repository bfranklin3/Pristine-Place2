import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { canonicalizeAddressParts, normalizeSpace } from "../lib/address-normalization"

const prisma = new PrismaClient()

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  return idx >= 0 ? process.argv[idx + 1] : undefined
}

function normalizeName(value: string | null | undefined): string {
  return normalizeSpace((value || "").toUpperCase().replace(/[^A-Z0-9 ]/g, ""))
}

function firstName(value: string | null | undefined): string {
  const n = normalizeName(value)
  if (!n) return ""
  const firstChunk = n.split(/&|\/|,/)[0]?.trim() ?? n
  const parts = firstChunk.split(" ").filter(Boolean)
  return parts[0] || ""
}

function lastName(value: string | null | undefined): string {
  const n = normalizeName(value)
  if (!n) return ""
  const firstChunk = n.split(/&|\/|,/)[0]?.trim() ?? n
  const parts = firstChunk.split(" ").filter(Boolean)
  return parts.length ? parts[parts.length - 1] : ""
}

function addressBase(canonical: string): string {
  const parsed = canonicalizeAddressParts(canonical)
  if (!parsed.number || !parsed.street) return ""
  const parts = parsed.street.split(" ").filter(Boolean)
  const suffixes = new Set(["AVE", "ST", "BLVD", "CT", "LN", "LOOP", "DR", "RD", "PL", "CIR", "TER", "PKWY", "TRL", "WAY"])
  const stripped = parts.filter((part, index) => !(index === parts.length - 1 && suffixes.has(part)))
  return `${parsed.number}|${stripped.join(" ")}`
}

type Hint = {
  residencyId: string
  householdId: string
  names: string[]
  address: string
  reason: string
  score: number
}

async function main() {
  const limit = Number.parseInt(getArg("--limit") || "0", 10) || 0

  const unresolvedRows = await prisma.accRequest.findMany({
    where: {
      OR: [{ residentState: "unknown" }, { matchConfidence: "low" }],
      residencyId: null,
    },
    select: {
      id: true,
      sourceEntryId: true,
      permitNumber: true,
      ownerName: true,
      authorizedRepName: true,
      addressRaw: true,
      addressCanonical: true,
      householdId: true,
      household: {
        select: {
          id: true,
          addressCanonical: true,
          residencies: {
            where: { isCurrent: true },
            select: {
              id: true,
              residentType: true,
              residentProfiles: {
                select: {
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
    orderBy: [{ submittedAt: "desc" }, { sourceEntryId: "desc" }],
    ...(limit > 0 ? { take: limit } : {}),
  })

  const currentResidencyProfiles = await prisma.residentProfile.findMany({
    where: { residency: { isCurrent: true } },
    select: {
      residencyId: true,
      householdId: true,
      addressFull: true,
      addressNumber: true,
      streetName: true,
      household: { select: { addressCanonical: true } },
      householdMembers: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  const residencyPool = currentResidencyProfiles
    .filter((row) => Boolean(row.residencyId))
    .map((row) => {
      const names = Array.from(
        new Set(
          row.householdMembers
            .map((m) => normalizeSpace([m.firstName || "", m.lastName || ""].join(" ")))
            .filter(Boolean),
        ).values(),
      )
      const canonicalAddress =
        row.household?.addressCanonical ||
        canonicalizeAddressParts(row.addressFull || `${row.addressNumber || ""} ${row.streetName || ""}`).canonical
      return {
        residencyId: row.residencyId!,
        householdId: row.householdId || "",
        address: canonicalAddress || "",
        addressBase: addressBase(canonicalAddress || ""),
        names,
        namesNorm: names.map((n) => normalizeName(n)),
      }
    })

  const byAddressBase = new Map<string, typeof residencyPool>()
  for (const row of residencyPool) {
    if (!row.addressBase) continue
    const list = byAddressBase.get(row.addressBase) || []
    list.push(row)
    byAddressBase.set(row.addressBase, list)
  }

  const report = unresolvedRows.map((row) => {
    const ownerSeed = row.ownerName || row.authorizedRepName || ""
    const ownerFirst = firstName(ownerSeed)
    const ownerLast = lastName(ownerSeed)
    const accCanonical = canonicalizeAddressParts(row.addressCanonical || row.addressRaw || "").canonical
    const accBase = addressBase(accCanonical)

    const hintMap = new Map<string, Hint>()
    const upsertHint = (hint: Hint) => {
      const existing = hintMap.get(hint.residencyId)
      if (!existing || hint.score > existing.score) {
        hintMap.set(hint.residencyId, hint)
      }
    }

    for (const res of row.household?.residencies || []) {
      const names = Array.from(
        new Set(
          res.residentProfiles
            .flatMap((rp) => rp.householdMembers)
            .map((m) => normalizeSpace([m.firstName || "", m.lastName || ""].join(" ")))
            .filter(Boolean),
        ).values(),
      )
      upsertHint({
        residencyId: res.id,
        householdId: row.household?.id || "",
        names,
        address: row.household?.addressCanonical || "",
        reason: "same_household_current",
        score: 100,
      })
    }

    if (accBase) {
      for (const candidate of byAddressBase.get(accBase) || []) {
        let score = 70
        if (ownerLast && candidate.namesNorm.some((n) => n.split(" ").filter(Boolean).slice(-1)[0] === ownerLast)) {
          score += 15
        }
        if (ownerFirst && candidate.namesNorm.some((n) => n.split(" ").filter(Boolean)[0] === ownerFirst)) {
          score += 8
        }
        upsertHint({
          residencyId: candidate.residencyId,
          householdId: candidate.householdId,
          names: candidate.names,
          address: candidate.address,
          reason: "address_base_match",
          score,
        })
      }
    }

    if (ownerLast) {
      for (const candidate of residencyPool) {
        if (!candidate.namesNorm.some((n) => n.split(" ").filter(Boolean).slice(-1)[0] === ownerLast)) continue
        let score = 35
        if (accCanonical && candidate.address.includes(accCanonical.split(" ")[0] || "")) score += 8
        upsertHint({
          residencyId: candidate.residencyId,
          householdId: candidate.householdId,
          names: candidate.names,
          address: candidate.address,
          reason: "last_name_match",
          score,
        })
      }
    }

    const hints = Array.from(hintMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    return {
      sourceEntryId: row.sourceEntryId,
      permitNumber: row.permitNumber || "",
      ownerName: row.ownerName || "",
      addressRaw: row.addressRaw || "",
      addressCanonical: row.addressCanonical || "",
      householdAddress: row.household?.addressCanonical || "",
      hints,
    }
  })

  console.log(JSON.stringify({ total: report.length, rows: report }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  return idx >= 0 ? process.argv[idx + 1] : undefined
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function normalizeStreetSuffix(street: string): string {
  const map: Record<string, string> = {
    AVENUE: "AVE",
    STREET: "ST",
    BOULEVARD: "BLVD",
    COURT: "CT",
    LANE: "LN",
    LOOP: "LOOP",
    DRIVE: "DR",
    ROAD: "RD",
    PLACE: "PL",
    CIRCLE: "CIR",
    TERRACE: "TER",
  }
  return street
    .split(" ")
    .map((part) => map[part] ?? part)
    .join(" ")
}

function canonicalizeAddress(raw: string | null | undefined): string {
  const cleaned = normalizeSpace((raw || "").toUpperCase().replace(/[.,]/g, ""))
  const m = cleaned.match(/^(\d+)\s+(.+)$/)
  if (!m) return cleaned
  const number = m[1]
  const street = normalizeStreetSuffix(normalizeSpace(m[2]))
  return `${number} ${street}`.trim()
}

async function main() {
  const limitArg = Number.parseInt(getArg("--limit") || "100", 10)
  const limit = Number.isFinite(limitArg) ? Math.max(1, limitArg) : 100

  const [requests, residents] = await Promise.all([
    prisma.accRequest.findMany({
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        sourceEntryId: true,
        permitNumber: true,
        submittedAt: true,
        ownerName: true,
        addressRaw: true,
        addressCanonical: true,
        matches: {
          select: { status: true },
        },
      },
    }),
    prisma.residentProfile.findMany({
      select: {
        id: true,
        addressFull: true,
        addressNumber: true,
        streetName: true,
      },
    }),
  ])

  const residentByCanonical = new Map<string, Array<{ id: string; address: string }>>()
  for (const rp of residents) {
    const address = rp.addressFull || `${rp.addressNumber || ""} ${rp.streetName || ""}`.trim()
    const canonical = canonicalizeAddress(address)
    if (!canonical) continue
    const arr = residentByCanonical.get(canonical) || []
    arr.push({ id: rp.id, address })
    residentByCanonical.set(canonical, arr)
  }

  const unresolved: Array<{
    sourceEntryId: string
    permitNumber: string | null
    submittedAt: Date | null
    ownerName: string | null
    addressRaw: string | null
    addressCanonical: string
    candidateResidents: Array<{ id: string; address: string }>
    currentMatchStatuses: string[]
  }> = []

  for (const req of requests) {
    const currentMatchStatuses = req.matches.map((m) => m.status)
    if (currentMatchStatuses.includes("confirmed")) continue

    const canonical = canonicalizeAddress(req.addressCanonical || req.addressRaw)
    if (!canonical) continue

    const candidates = residentByCanonical.get(canonical) || []
    if (!candidates.length) continue

    unresolved.push({
      sourceEntryId: req.sourceEntryId,
      permitNumber: req.permitNumber,
      submittedAt: req.submittedAt,
      ownerName: req.ownerName,
      addressRaw: req.addressRaw,
      addressCanonical: canonical,
      candidateResidents: candidates,
      currentMatchStatuses,
    })
  }

  console.log(
    JSON.stringify(
      {
        reportType: "acc-address-exact-unconfirmed",
        totalRequests: requests.length,
        unresolvedCount: unresolved.length,
        sample: unresolved.slice(0, limit),
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


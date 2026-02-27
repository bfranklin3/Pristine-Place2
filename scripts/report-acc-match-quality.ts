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

function normalizeName(value: string | null | undefined): string {
  if (!value) return ""
  return normalizeSpace(value)
    .toUpperCase()
    .replace(/[^A-Z0-9&/\s-]/g, "")
}

function normalizePhone(value: string | null | undefined): string {
  return (value || "").replace(/\D/g, "")
}

function normalizeEmail(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase()
}

function extractPrimaryLastName(ownerName: string | null | undefined): string {
  const n = normalizeName(ownerName)
  if (!n) return ""
  const first = n.split(/&|\/|,/)[0]?.trim() ?? n
  const parts = first.split(" ").filter(Boolean)
  return parts.length ? parts[parts.length - 1] : ""
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

function canonicalizeAddress(raw: string | null | undefined): {
  number: string
  street: string
  canonical: string
} {
  const cleaned = normalizeSpace((raw || "").toUpperCase().replace(/[.,]/g, ""))
  const m = cleaned.match(/^(\d+)\s+(.+)$/)
  if (!m) return { number: "", street: "", canonical: cleaned }
  const number = m[1]
  const street = normalizeStreetSuffix(normalizeSpace(m[2]))
  return { number, street, canonical: `${number} ${street}`.trim() }
}

function bigramSimilarity(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1

  function bigrams(v: string): string[] {
    if (v.length < 2) return [v]
    const out: string[] = []
    for (let i = 0; i < v.length - 1; i += 1) out.push(v.slice(i, i + 2))
    return out
  }

  const A = bigrams(a)
  const B = bigrams(b)
  const bCount = new Map<string, number>()
  for (const x of B) bCount.set(x, (bCount.get(x) || 0) + 1)

  let overlap = 0
  for (const x of A) {
    const c = bCount.get(x) || 0
    if (c > 0) {
      overlap += 1
      bCount.set(x, c - 1)
    }
  }
  return (2 * overlap) / (A.length + B.length)
}

function computeScore(input: {
  accAddress: { number: string; street: string; canonical: string }
  rpAddress: { number: string; street: string; canonical: string }
  accLastName: string
  rpPrimaryLast: string
  rpSecondaryLast: string
  accOwnerPhone: string
  rpPrimaryPhone: string
  rpSecondaryPhone: string
  accOwnerEmail: string
  rpPrimaryEmail: string
  rpSecondaryEmail: string
}) {
  let score = 0
  const signals: Record<string, unknown> = {}

  if (input.accAddress.canonical && input.rpAddress.canonical && input.accAddress.canonical === input.rpAddress.canonical) {
    score += 60
    signals.addressExact = true
  } else if (input.accAddress.number && input.rpAddress.number && input.accAddress.number === input.rpAddress.number) {
    const sim = bigramSimilarity(input.accAddress.street, input.rpAddress.street)
    if (sim >= 0.9) {
      score += 45
      signals.addressNumberStreetHighSimilarity = sim
    } else if (sim >= 0.75) {
      score += 30
      signals.addressNumberStreetMediumSimilarity = sim
    }
  }

  if (input.accLastName) {
    if (input.accLastName === input.rpPrimaryLast || input.accLastName === input.rpSecondaryLast) {
      score += 20
      signals.lastNameExact = true
    } else {
      const sim = Math.max(
        bigramSimilarity(input.accLastName, input.rpPrimaryLast),
        bigramSimilarity(input.accLastName, input.rpSecondaryLast),
      )
      if (sim >= 0.92) {
        score += 12
        signals.lastNameFuzzy = sim
      }
    }
  }

  if (input.accOwnerEmail && (input.accOwnerEmail === input.rpPrimaryEmail || input.accOwnerEmail === input.rpSecondaryEmail)) {
    score += 20
    signals.emailExact = true
  }

  if (input.accOwnerPhone && (input.accOwnerPhone === input.rpPrimaryPhone || input.accOwnerPhone === input.rpSecondaryPhone)) {
    score += 15
    signals.phoneExact = true
  }

  if (input.accAddress.number && input.rpAddress.number && input.accAddress.number !== input.rpAddress.number) {
    score -= 40
    signals.addressNumberMismatch = true
  }
  if (
    input.accAddress.street &&
    input.rpAddress.street &&
    input.accAddress.street !== input.rpAddress.street &&
    bigramSimilarity(input.accAddress.street, input.rpAddress.street) < 0.4
  ) {
    score -= 25
    signals.streetMismatch = true
  }

  return { score: Math.max(0, Math.min(100, score)), signals }
}

async function main() {
  const limitArg = getArg("--limit")
  const minScoreArg = Number.parseInt(getArg("--min-score") ?? "70", 10)
  const minScore = Number.isFinite(minScoreArg) ? minScoreArg : 70
  const maxCandidatesArg = Number.parseInt(getArg("--max-candidates") ?? "10", 10)
  const maxCandidates = Number.isFinite(maxCandidatesArg) ? Math.max(1, maxCandidatesArg) : 10
  const topAmbiguousArg = Number.parseInt(getArg("--top-ambiguous") ?? "10", 10)
  const topAmbiguous = Number.isFinite(topAmbiguousArg) ? Math.max(1, topAmbiguousArg) : 10
  const csvPathArg = getArg("--csv")

  const requests = await prisma.accRequest.findMany({
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    take: limitArg ? Math.max(1, Number.parseInt(limitArg, 10) || 0) : undefined,
  })
  const residents = await prisma.residentProfile.findMany({ include: { householdMembers: true } })

  let noCandidate = 0
  let topAuto = 0
  let topNeedsReview = 0
  let topBelowThreshold = 0
  let addressExactTop = 0
  let nameExactTop = 0
  let emailExactTop = 0
  let phoneExactTop = 0

  const scoreBuckets = { gte90: 0, b85_89: 0, b70_84: 0, lt70: 0 }
  const ambiguous: Array<{
    accEntryId: string
    ownerName: string | null
    address: string | null
    top1: { residentId: string; score: number }
    top2: { residentId: string; score: number } | null
    deltaTop2: number | null
  }> = []

  for (const req of requests) {
    const accAddress = canonicalizeAddress(req.addressCanonical || req.addressRaw)
    const accLast = extractPrimaryLastName(req.ownerName)
    const accPhone = normalizePhone(req.ownerPhone)
    const accEmail = normalizeEmail(req.ownerEmail)

    const candidates: Array<{ residentId: string; score: number; signals: Record<string, unknown> }> = []

    for (const rp of residents) {
      const primary = rp.householdMembers.find((m) => m.role === "primary") || null
      const secondary = rp.householdMembers.find((m) => m.role === "secondary") || null
      const rpAddress = canonicalizeAddress(rp.addressFull || `${rp.addressNumber || ""} ${rp.streetName || ""}`.trim())

      const { score, signals } = computeScore({
        accAddress,
        rpAddress,
        accLastName: accLast,
        rpPrimaryLast: normalizeName(primary?.lastName || ""),
        rpSecondaryLast: normalizeName(secondary?.lastName || ""),
        accOwnerPhone: accPhone,
        rpPrimaryPhone: normalizePhone(primary?.phone),
        rpSecondaryPhone: normalizePhone(secondary?.phone),
        accOwnerEmail: accEmail,
        rpPrimaryEmail: normalizeEmail(primary?.email),
        rpSecondaryEmail: normalizeEmail(secondary?.email),
      })

      if (score >= minScore) candidates.push({ residentId: rp.id, score, signals })
    }

    candidates.sort((a, b) => b.score - a.score)
    const top = candidates.slice(0, maxCandidates)
    const first = top[0]
    const second = top[1]

    if (!first) {
      noCandidate += 1
      continue
    }

    if (first.score >= 90) scoreBuckets.gte90 += 1
    else if (first.score >= 85) scoreBuckets.b85_89 += 1
    else if (first.score >= 70) scoreBuckets.b70_84 += 1
    else scoreBuckets.lt70 += 1

    if (first.score >= 85) topAuto += 1
    else if (first.score >= 70) topNeedsReview += 1
    else topBelowThreshold += 1

    if (first.signals.addressExact) addressExactTop += 1
    if (first.signals.lastNameExact) nameExactTop += 1
    if (first.signals.emailExact) emailExactTop += 1
    if (first.signals.phoneExact) phoneExactTop += 1

    const delta = second ? first.score - second.score : null
    if (second && delta !== null && delta <= 5) {
      ambiguous.push({
        accEntryId: req.sourceEntryId,
        ownerName: req.ownerName,
        address: req.addressRaw,
        top1: { residentId: first.residentId, score: first.score },
        top2: { residentId: second.residentId, score: second.score },
        deltaTop2: delta,
      })
    }
  }

  ambiguous.sort((a, b) => (a.deltaTop2 ?? 99) - (b.deltaTop2 ?? 99))
  const ambiguousTop = ambiguous.slice(0, topAmbiguous)

  if (csvPathArg) {
    const csvPath = resolve(csvPathArg)
    await mkdir(dirname(csvPath), { recursive: true })

    const rows = [
      [
        "accEntryId",
        "ownerName",
        "address",
        "top1ResidentId",
        "top1Score",
        "top2ResidentId",
        "top2Score",
        "deltaTop2",
      ],
      ...ambiguousTop.map((item) => [
        item.accEntryId,
        item.ownerName ?? "",
        item.address ?? "",
        item.top1.residentId,
        String(item.top1.score),
        item.top2?.residentId ?? "",
        item.top2 ? String(item.top2.score) : "",
        item.deltaTop2 === null ? "" : String(item.deltaTop2),
      ]),
    ]

    const csv = `${rows
      .map((row) =>
        row
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n")}\n`

    await writeFile(csvPath, csv, "utf8")
  }

  console.log(
    JSON.stringify(
      {
        reportType: "acc-match-quality",
        requestsAnalyzed: requests.length,
        minScore,
        maxCandidates,
        summary: {
          topAuto,
          topNeedsReview,
          topBelowThreshold,
          noCandidate,
        },
        scoreBucketsTop1: scoreBuckets,
        topSignals: {
          addressExactTop,
          nameExactTop,
          emailExactTop,
          phoneExactTop,
        },
        ambiguousCount: ambiguous.length,
        ambiguousTop,
        csvPath: csvPathArg ? resolve(csvPathArg) : null,
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

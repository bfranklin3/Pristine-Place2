import "dotenv/config"
import { PrismaClient, Prisma } from "@prisma/client"

const prisma = new PrismaClient()

type MatchStatus = "auto" | "needs_review" | "confirmed" | "rejected"
type MatchMethod = "auto_exact" | "auto_scored" | "manual_confirmed" | "manual_rejected"
type MatchSignals = Prisma.InputJsonObject
type AutoRule = "none" | "strict_name_address"

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  return idx >= 0 ? process.argv[idx + 1] : undefined
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
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
  if (!value) return ""
  return value.replace(/\D/g, "")
}

function normalizeEmail(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase()
}

function extractPrimaryLastName(ownerName: string | null | undefined): string {
  const n = normalizeName(ownerName)
  if (!n) return ""
  // If multiple names joined by "&", "/" or ",", use first part.
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
    const n = v.length
    if (n < 2) return [v]
    const out: string[] = []
    for (let i = 0; i < n - 1; i += 1) out.push(v.slice(i, i + 2))
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

  // Address scoring
  if (input.accAddress.canonical && input.rpAddress.canonical && input.accAddress.canonical === input.rpAddress.canonical) {
    score += 60
    signals.addressExact = true
  } else {
    if (
      input.accAddress.number &&
      input.rpAddress.number &&
      input.accAddress.number === input.rpAddress.number
    ) {
      const sim = bigramSimilarity(input.accAddress.street, input.rpAddress.street)
      if (sim >= 0.9) {
        score += 45
        signals.addressNumberStreetHighSimilarity = sim
      } else if (sim >= 0.75) {
        score += 30
        signals.addressNumberStreetMediumSimilarity = sim
      }
    }
  }

  // Name scoring
  if (input.accLastName) {
    if (input.accLastName === input.rpPrimaryLast || input.accLastName === input.rpSecondaryLast) {
      score += 20
      signals.lastNameExact = true
    } else {
      const simPrimary = bigramSimilarity(input.accLastName, input.rpPrimaryLast)
      const simSecondary = bigramSimilarity(input.accLastName, input.rpSecondaryLast)
      const sim = Math.max(simPrimary, simSecondary)
      if (sim >= 0.92) {
        score += 12
        signals.lastNameFuzzy = sim
      }
    }
  }

  // Email scoring
  if (input.accOwnerEmail) {
    if (input.accOwnerEmail === input.rpPrimaryEmail || input.accOwnerEmail === input.rpSecondaryEmail) {
      score += 20
      signals.emailExact = true
    }
  }

  // Phone scoring
  if (input.accOwnerPhone) {
    if (input.accOwnerPhone === input.rpPrimaryPhone || input.accOwnerPhone === input.rpSecondaryPhone) {
      score += 15
      signals.phoneExact = true
    }
  }

  // Penalties
  if (
    input.accAddress.number &&
    input.rpAddress.number &&
    input.accAddress.number !== input.rpAddress.number
  ) {
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

  if (score < 0) score = 0
  if (score > 100) score = 100
  return { score, signals }
}

function classify(score: number): { status: MatchStatus; method: MatchMethod } | null {
  if (score >= 85) return { status: "auto", method: "auto_scored" }
  if (score >= 70) return { status: "needs_review", method: "auto_scored" }
  return null
}

function shouldStrictAutoConfirm(signals: MatchSignals): boolean {
  return signals.addressExact === true && signals.lastNameExact === true
}

async function main() {
  const dryRun = hasFlag("--dry-run")
  const previewCountOnly = hasFlag("--preview-count")
  const limitArg = getArg("--limit")
  const minScoreArg = Number.parseInt(getArg("--min-score") ?? "70", 10)
  const minScore = Number.isFinite(minScoreArg) ? minScoreArg : 70
  const maxCandidatesArg = Number.parseInt(getArg("--max-candidates") ?? "10", 10)
  const maxCandidates = Number.isFinite(maxCandidatesArg) ? Math.max(1, maxCandidatesArg) : 10
  const autoRuleArg = getArg("--auto-rule")
  const autoRule: AutoRule = autoRuleArg === "strict_name_address" ? "strict_name_address" : "none"

  const requests = await prisma.accRequest.findMany({
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    take: limitArg ? Math.max(1, Number.parseInt(limitArg, 10) || 0) : undefined,
  })

  const residents = await prisma.residentProfile.findMany({
    include: {
      householdMembers: true,
    },
  })

  let processed = 0
  let createdOrUpdated = 0
  let autoCount = 0
  let reviewCount = 0
  let noMatchCount = 0
  let strictRuleEligibleCount = 0
  let strictRulePromotedCount = 0
  let addressExactLowScoreIncludedCount = 0
  const sampleTop: Array<{
    accEntry: string
    residentId: string
    score: number
    status: string
    strictEligible: boolean
    addressExact: boolean
  }> = []

  for (const req of requests) {
    processed += 1
    const accAddress = canonicalizeAddress(req.addressCanonical || req.addressRaw)
    const accLast = extractPrimaryLastName(req.ownerName)
    const accPhone = normalizePhone(req.ownerPhone)
    const accEmail = normalizeEmail(req.ownerEmail)

    type Candidate = {
      residentId: string
      score: number
      status: MatchStatus
      method: MatchMethod
      signals: MatchSignals
    }

    const scored: Candidate[] = []

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

      const isAddressExact = signals.addressExact === true
      const klass = classify(score)

      // Global guard:
      // - normally require score >= minScore and valid classification
      // - exception: keep exact-address matches even below minScore (needs manual review)
      if (score < minScore && !isAddressExact) continue

      const resolved =
        klass ||
        (isAddressExact
          ? ({ status: "needs_review", method: "auto_scored" } as const)
          : null)
      if (!resolved) continue

      if (isAddressExact && score < minScore) {
        addressExactLowScoreIncludedCount += 1
      }

      scored.push({
        residentId: rp.id,
        score,
        status: resolved.status,
        method: resolved.method,
        signals: signals as MatchSignals,
      })
    }

    scored.sort((a, b) => b.score - a.score)
    const top = scored.slice(0, maxCandidates)

    if (!top.length) {
      noMatchCount += 1
      continue
    }

    for (const c of top) {
      const strictEligible = shouldStrictAutoConfirm(c.signals)
      if (strictEligible) strictRuleEligibleCount += 1

      if (autoRule === "strict_name_address" && strictEligible) {
        c.status = "confirmed"
        c.method = "auto_exact"
        strictRulePromotedCount += 1
      }

      if (c.status === "auto") autoCount += 1
      if (c.status === "needs_review") reviewCount += 1

      if (sampleTop.length < 12) {
        sampleTop.push({
          accEntry: req.sourceEntryId,
          residentId: c.residentId,
          score: c.score,
          status: c.status,
          strictEligible,
          addressExact: c.signals.addressExact === true,
        })
      }

      if (dryRun || previewCountOnly) continue

      const existing = await prisma.residentAccMatch.findUnique({
        where: {
          residentProfileId_accRequestId: {
            residentProfileId: c.residentId,
            accRequestId: req.id,
          },
        },
        select: { id: true, status: true, matchMethod: true },
      })

      if (!existing) {
        await prisma.residentAccMatch.create({
          data: {
            residentProfileId: c.residentId,
            accRequestId: req.id,
            matchScore: c.score,
            matchMethod: c.method,
            status: c.status,
            signalsJson: c.signals,
          },
        })
      } else {
        const isManualDecision =
          existing.status === "confirmed" ||
          existing.status === "rejected" ||
          existing.matchMethod === "manual_confirmed" ||
          existing.matchMethod === "manual_rejected"

        if (!isManualDecision) {
          await prisma.residentAccMatch.update({
            where: { id: existing.id },
            data: {
              matchScore: c.score,
              matchMethod: c.method,
              status: c.status,
              signalsJson: c.signals,
            },
          })
        }
      }
      createdOrUpdated += 1
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: previewCountOnly ? "preview-count" : dryRun ? "dry-run" : "apply",
        requestsProcessed: processed,
        candidatesCreatedOrUpdated: createdOrUpdated,
        autoCount,
        reviewCount,
        noMatchCount,
        autoRule,
        strictRuleEligibleCount,
        strictRulePromotedCount,
        addressExactLowScoreIncludedCount,
        minScore,
        maxCandidates,
        sampleTop,
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

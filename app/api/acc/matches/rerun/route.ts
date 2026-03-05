import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireManagementApiAccess } from "@/lib/auth/portal-management-api"
import { canonicalizeAddressParts, normalizeSpace } from "@/lib/address-normalization"

type MatchStatus = "auto" | "needs_review" | "confirmed" | "rejected"
type MatchMethod = "auto_exact" | "auto_scored" | "manual_confirmed" | "manual_rejected"

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
  const first = n.split(/&|\/|,/)[0]?.trim() ?? n
  const parts = first.split(" ").filter(Boolean)
  return parts.length ? parts[parts.length - 1] : ""
}

function canonicalizeAddress(raw: string | null | undefined): {
  number: string
  street: string
  canonical: string
} {
  return canonicalizeAddressParts(raw)
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

  if (input.accOwnerEmail) {
    if (input.accOwnerEmail === input.rpPrimaryEmail || input.accOwnerEmail === input.rpSecondaryEmail) {
      score += 20
      signals.emailExact = true
    }
  }

  if (input.accOwnerPhone) {
    if (input.accOwnerPhone === input.rpPrimaryPhone || input.accOwnerPhone === input.rpSecondaryPhone) {
      score += 15
      signals.phoneExact = true
    }
  }

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

function shouldStrictAutoConfirm(signals: Record<string, unknown>): boolean {
  return signals.addressExact === true && signals.lastNameExact === true
}

export async function POST(req: NextRequest) {
  const access = await requireManagementApiAccess(["admin"])
  if (!access.ok) return access.response

  const payload = (await req.json().catch(() => ({}))) as {
    minScore?: number
    maxCandidates?: number
    autoRule?: "none" | "strict_name_address"
    limit?: number
  }

  const minScore = Number.isFinite(payload.minScore) ? Math.max(0, Math.min(100, Number(payload.minScore))) : 70
  const maxCandidates = Number.isFinite(payload.maxCandidates)
    ? Math.max(1, Math.min(25, Number(payload.maxCandidates)))
    : 10
  const autoRule = payload.autoRule === "strict_name_address" ? "strict_name_address" : "none"
  const limit = Number.isFinite(payload.limit) ? Math.max(1, Number(payload.limit)) : undefined
  const startedAt = new Date()
  const run = await prisma.accImportRun.create({
    data: {
      sourceSystem: "wordpress_gf",
      sourceFormId: "acc_match_rerun",
      mode: "delta",
      startedAt,
      triggeredBy: access.identity.userId,
      errorsJson: {
        params: {
          autoRule,
          minScore,
          maxCandidates,
          limit: limit ?? null,
        },
      },
    },
  })

  try {
    const requests = await prisma.accRequest.findMany({
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      take: limit,
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

    for (const reqRow of requests) {
      processed += 1
      const accAddress = canonicalizeAddress(reqRow.addressCanonical || reqRow.addressRaw)
      const accLast = extractPrimaryLastName(reqRow.ownerName)
      const accPhone = normalizePhone(reqRow.ownerPhone)
      const accEmail = normalizeEmail(reqRow.ownerEmail)

      const scored: Array<{
        residentId: string
        score: number
        status: MatchStatus
        method: MatchMethod
        signals: Record<string, unknown>
      }> = []

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
        if (score < minScore && !isAddressExact) continue

        const resolved =
          klass ||
          (isAddressExact
            ? ({ status: "needs_review", method: "auto_scored" } as const)
            : null)
        if (!resolved) continue

        if (isAddressExact && score < minScore) addressExactLowScoreIncludedCount += 1

        scored.push({
          residentId: rp.id,
          score,
          status: resolved.status,
          method: resolved.method,
          signals,
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

        const existing = await prisma.residentAccMatch.findUnique({
          where: {
            residentProfileId_accRequestId: {
              residentProfileId: c.residentId,
              accRequestId: reqRow.id,
            },
          },
          select: { id: true, status: true, matchMethod: true },
        })

        if (!existing) {
          await prisma.residentAccMatch.create({
            data: {
              residentProfileId: c.residentId,
              accRequestId: reqRow.id,
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

    const resultPayload = {
      ok: true,
      mode: "apply",
      runId: run.id,
      triggeredBy: access.identity.userId,
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
    }

    await prisma.accImportRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        rowsRead: processed,
        rowsUpserted: createdOrUpdated,
        rowsUnchanged: 0,
        attachmentsUpserted: 0,
        errorsJson: {
          params: {
            autoRule,
            minScore,
            maxCandidates,
            limit: limit ?? null,
          },
          result: {
            requestsProcessed: processed,
            candidatesCreatedOrUpdated: createdOrUpdated,
            autoCount,
            reviewCount,
            noMatchCount,
            strictRuleEligibleCount,
            strictRulePromotedCount,
            addressExactLowScoreIncludedCount,
          },
        },
      },
    })

    return NextResponse.json(resultPayload)
  } catch (error) {
    console.error("ACC match rerun failed:", error)
    const detail = error instanceof Error ? error.message : "unknown error"
    await prisma.accImportRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        errorsJson: {
          params: {
            autoRule,
            minScore,
            maxCandidates,
            limit: limit ?? null,
          },
          error: detail,
        },
      },
    })
    return NextResponse.json({ error: "Failed to re-run ACC matching", detail }, { status: 500 })
  }
}

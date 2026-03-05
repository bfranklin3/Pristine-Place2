import { NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"
import { prisma } from "@/lib/db/prisma"
import { requireManagementApiAccess } from "@/lib/auth/portal-management-api"
import { canonicalizeAddressParts, normalizeSpace, normalizeStreetSuffix } from "@/lib/address-normalization"

type ReviewAction = "link" | "unresolved"
type ResidentState = "current" | "past" | "unknown"
type MatchConfidence = "high" | "medium" | "low" | "unresolved"

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function nameFromParts(first: string | null | undefined, last: string | null | undefined): string {
  return normalizeSpace([first || "", last || ""].join(" ")).trim()
}

function normalizeName(value: string | null | undefined): string {
  return normalizeSpace((value || "").toUpperCase().replace(/[^A-Z0-9 ]/g, ""))
}

function primaryLastName(value: string | null | undefined): string {
  const n = normalizeName(value)
  if (!n) return ""
  const firstChunk = n.split(/&|\/|,/)[0]?.trim() ?? n
  const parts = firstChunk.split(" ").filter(Boolean)
  return parts.length ? parts[parts.length - 1] : ""
}

function primaryFirstName(value: string | null | undefined): string {
  const n = normalizeName(value)
  if (!n) return ""
  const firstChunk = n.split(/&|\/|,/)[0]?.trim() ?? n
  const parts = firstChunk.split(" ").filter(Boolean)
  return parts.length ? parts[0] : ""
}

function normalizeAddressCorrection(raw: string | null): {
  addressRaw: string | null
  addressCanonical: string | null
  addressKey: string | null
} {
  if (!raw) return { addressRaw: null, addressCanonical: null, addressKey: null }
  const cleaned = normalizeSpace(raw).replace(/[.,]/g, "")
  const upper = cleaned.toUpperCase()
  const unitMatch = upper.match(/\b(?:APT|UNIT|STE|SUITE|#)\s*([A-Z0-9-]+)\b/)
  const noUnit = upper.replace(/\b(?:APT|UNIT|STE|SUITE|#)\s*[A-Z0-9-]+\b/g, "").trim()
  const parsed = canonicalizeAddressParts(noUnit)
  const canonicalStreet = parsed.canonical ? normalizeStreetSuffix(parsed.canonical) : ""
  const canonical = unitMatch ? `${canonicalStreet} UNIT ${unitMatch[1]}` : canonicalStreet
  if (!canonical) return { addressRaw: cleaned, addressCanonical: null, addressKey: null }
  const keySource = `${canonical}|LOT:`
  const addressKey = crypto.createHash("sha1").update(keySource).digest("hex")
  return {
    addressRaw: cleaned,
    addressCanonical: canonical,
    addressKey,
  }
}

function recommendationFor(input: {
  householdId: string
  residencyId: string
  matchConfidence: string
  candidateCurrentCount: number
}): string {
  if (!input.householdId) {
    return "ADDRESS_UNRESOLVED"
  }
  if (!input.residencyId && input.candidateCurrentCount === 1) {
    return "LINK_SINGLE_CURRENT"
  }
  if (!input.residencyId && input.candidateCurrentCount > 1) {
    return "SELECT_CURRENT_RESIDENT"
  }
  if (input.matchConfidence === "low") {
    return "VERIFY_NAME_MATCH"
  }
  return "REVIEW_REQUIRED"
}

export async function GET(req: NextRequest) {
  try {
    const access = await requireManagementApiAccess(["admin", "acc", "access_control", "board_of_directors"])
    if (!access.ok) return access.response

    const resolveResidencyId = (req.nextUrl.searchParams.get("resolveResidencyId") || "").trim()
    if (resolveResidencyId) {
      const residency = await prisma.residency.findUnique({
        where: { id: resolveResidencyId },
        select: { id: true, householdId: true, clerkUserId: true },
      })
      if (!residency) {
        return NextResponse.json({ error: "Residency not found." }, { status: 404 })
      }
      return NextResponse.json({ residency })
    }

    const q = (req.nextUrl.searchParams.get("q") || "").trim()

    const rows = await prisma.accRequest.findMany({
      where: {
        AND: [
          {
            OR: [{ residentState: "unknown" }, { matchConfidence: "low" }],
          },
          q
            ? {
                OR: [
                  { sourceEntryId: { contains: q, mode: "insensitive" } },
                  { permitNumber: { contains: q, mode: "insensitive" } },
                  { ownerName: { contains: q, mode: "insensitive" } },
                  { authorizedRepName: { contains: q, mode: "insensitive" } },
                  { addressRaw: { contains: q, mode: "insensitive" } },
                  { addressCanonical: { contains: q, mode: "insensitive" } },
                ],
              }
            : {},
        ],
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
              where: { isCurrent: true },
              select: {
                id: true,
                householdId: true,
                residentType: true,
                clerkUserId: true,
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
    })

    const items = rows.map((row) => {
      const candidates = (row.household?.residencies || []).map((r) => {
        const names = new Set<string>()
        for (const rp of r.residentProfiles) {
          for (const m of rp.householdMembers) {
            const full = nameFromParts(m.firstName, m.lastName)
            if (full) names.add(full)
          }
        }
        return {
          residencyId: r.id,
          householdId: r.householdId,
          residentType: r.residentType,
          clerkUserId: r.clerkUserId || "",
          names: Array.from(names.values()),
          namesSignature: Array.from(names.values())
            .map((n) => normalizeName(n))
            .filter(Boolean)
            .sort()
            .join("|"),
        }
      })

      const recommendation = recommendationFor({
        householdId: row.householdId || "",
        residencyId: row.residencyId || "",
        matchConfidence: row.matchConfidence,
        candidateCurrentCount: candidates.length,
      })

      const ownerSeedName = row.ownerName || row.authorizedRepName || ""
      const ownerLast = primaryLastName(ownerSeedName)
      const ownerFirst = primaryFirstName(ownerSeedName)

      let suggestedResidencyId: string | null = null
      let suggestedClerkUserId: string | null = null
      let suggestedReason: string | null = null

      if (!row.residencyId && candidates.length === 1) {
        suggestedResidencyId = candidates[0].residencyId
        suggestedClerkUserId = candidates[0].clerkUserId || null
        suggestedReason = "Single current residency candidate at this household."
      } else if (!row.residencyId && candidates.length > 1 && ownerLast) {
        const lastNameMatches = candidates.filter((candidate) =>
          candidate.names.some((name) => {
            const parts = normalizeName(name).split(" ").filter(Boolean)
            return parts.length > 0 && parts[parts.length - 1] === ownerLast
          }),
        )
        if (lastNameMatches.length === 1) {
          suggestedResidencyId = lastNameMatches[0].residencyId
          suggestedClerkUserId = lastNameMatches[0].clerkUserId || null
          suggestedReason = "Unique candidate matched by owner last name."
        } else if (lastNameMatches.length > 1 && ownerFirst) {
          const firstLastMatches = lastNameMatches.filter((candidate) =>
            candidate.names.some((name) => {
              const parts = normalizeName(name).split(" ").filter(Boolean)
              return parts.length > 1 && parts[0] === ownerFirst && parts[parts.length - 1] === ownerLast
            }),
          )
          if (firstLastMatches.length >= 1) {
            suggestedResidencyId = firstLastMatches[0].residencyId
            suggestedClerkUserId = firstLastMatches[0].clerkUserId || null
            suggestedReason = "Candidate matched by owner first + last name."
          }
        }
      }

      const flagReasons: string[] = []
      if (row.residentState === "unknown") flagReasons.push("Resident state is unknown.")
      if (row.matchConfidence === "low") flagReasons.push("Match confidence is low.")
      if (!row.residencyId && row.householdId) flagReasons.push("Household matched but residency is not linked.")
      if (!row.householdId) flagReasons.push("No household match yet.")
      if (row.addressCanonical && row.household?.addressCanonical && row.addressCanonical !== row.household.addressCanonical) {
        flagReasons.push(
          `Address normalized from "${row.addressCanonical}" to household "${row.household.addressCanonical}".`,
        )
      }

      const signatureCounts = new Map<string, number>()
      for (const candidate of candidates) {
        if (!candidate.namesSignature) continue
        signatureCounts.set(candidate.namesSignature, (signatureCounts.get(candidate.namesSignature) || 0) + 1)
      }

      return {
        ...row,
        candidates: candidates.map((candidate) => ({
          ...candidate,
          isEquivalentDuplicate:
            Boolean(candidate.namesSignature) && (signatureCounts.get(candidate.namesSignature || "") || 0) > 1,
        })),
        recommendation,
        flagReason: flagReasons.join(" "),
        suggestedResidencyId,
        suggestedClerkUserId,
        suggestedReason,
      }
    })

    return NextResponse.json({
      items,
      summary: {
        total: items.length,
        unresolved: items.filter((item) => item.residentState === "unknown").length,
        low: items.filter((item) => item.matchConfidence === "low").length,
      },
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error."
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const access = await requireManagementApiAccess(["admin", "acc", "access_control", "board_of_directors"])
  if (!access.ok) return access.response

  const payload = (await req.json()) as {
    accId?: string
    action?: ReviewAction
    reviewResidencyId?: string
    reviewClerkUserId?: string
    reviewResidentState?: ResidentState
    reviewMatchConfidence?: MatchConfidence
    reviewNotes?: string
    reviewAddress?: string
  }

  const accId = (payload.accId || "").trim()
  const action = payload.action
  if (!accId || !action) {
    return NextResponse.json({ success: false, error: "accId and action are required." }, { status: 400 })
  }
  if (action !== "link" && action !== "unresolved") {
    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 })
  }

  const acc = await prisma.accRequest.findUnique({
    where: { id: accId },
    select: {
      id: true,
      householdId: true,
      residencyId: true,
      clerkUserId: true,
    },
  })
  if (!acc) {
    return NextResponse.json({ success: false, error: "ACC request not found." }, { status: 404 })
  }

  const notes = (payload.reviewNotes || "").trim()
  const reviewAddressInput = (payload.reviewAddress || "").trim()
  const normalizedCorrection = normalizeAddressCorrection(reviewAddressInput || null)
  let correctedHouseholdId: string | null = null
  if (normalizedCorrection.addressKey) {
    const existingHousehold = await prisma.household.findUnique({
      where: { addressKey: normalizedCorrection.addressKey },
      select: { id: true },
    })
    correctedHouseholdId = existingHousehold?.id || null
    if (!correctedHouseholdId) {
      const created = await prisma.household.create({
        data: {
          addressRaw: normalizedCorrection.addressRaw,
          addressCanonical: normalizedCorrection.addressCanonical || reviewAddressInput.toUpperCase(),
          addressKey: normalizedCorrection.addressKey,
        },
        select: { id: true },
      })
      correctedHouseholdId = created.id
    }
  }
  const actor = access.identity.userId

  if (action === "unresolved") {
    await prisma.$transaction(async (tx) => {
      await tx.accRequest.update({
        where: { id: accId },
        data: {
          ...(normalizedCorrection.addressRaw ? { addressRaw: normalizedCorrection.addressRaw } : {}),
          ...(normalizedCorrection.addressCanonical ? { addressCanonical: normalizedCorrection.addressCanonical } : {}),
          ...(normalizedCorrection.addressKey ? { addressKey: normalizedCorrection.addressKey } : {}),
          householdId: correctedHouseholdId || acc.householdId || null,
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
        reason: notes || "Manual review marked unresolved.",
          actorUserId: actor,
        },
      })
    })
    return NextResponse.json({ success: true })
  }

  const reviewResidencyId = (payload.reviewResidencyId || "").trim()
  if (!reviewResidencyId) {
    return NextResponse.json(
      { success: false, error: "reviewResidencyId is required when action=link." },
      { status: 400 },
    )
  }

  const residency = await prisma.residency.findUnique({
    where: { id: reviewResidencyId },
    select: { id: true, householdId: true, clerkUserId: true },
  })
  if (!residency) {
    return NextResponse.json({ success: false, error: "Residency not found." }, { status: 404 })
  }
  const nextClerkUserId = (payload.reviewClerkUserId || "").trim() || residency.clerkUserId || null
  const nextState = payload.reviewResidentState || "current"
  const nextConfidence = payload.reviewMatchConfidence || "medium"
  const crossedHouseholdBoundary = Boolean(acc.householdId && acc.householdId !== residency.householdId)

  await prisma.$transaction(async (tx) => {
    await tx.accRequest.update({
      where: { id: accId },
      data: {
        ...(normalizedCorrection.addressRaw ? { addressRaw: normalizedCorrection.addressRaw } : {}),
        ...(normalizedCorrection.addressCanonical ? { addressCanonical: normalizedCorrection.addressCanonical } : {}),
        ...(normalizedCorrection.addressKey ? { addressKey: normalizedCorrection.addressKey } : {}),
        householdId: residency.householdId,
        residencyId: residency.id,
        clerkUserId: nextClerkUserId,
        residentState: nextState,
        matchConfidence: nextConfidence,
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
        newResidencyId: residency.id,
        reason:
          notes ||
          (crossedHouseholdBoundary
            ? "Manual review linked ACC request to residency and corrected split household assignment."
            : "Manual review linked ACC request to residency."),
        actorUserId: actor,
      },
    })
  })

  return NextResponse.json({ success: true })
}

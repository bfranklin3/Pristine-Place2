import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireManagementApiAccess } from "@/lib/auth/portal-management-api"

type CleanupMode = "report" | "dry-run"

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function holderDisplayName(input: { firstName: string | null; lastName: string | null; organizationName: string | null }): string {
  if (input.organizationName && input.organizationName.trim()) return input.organizationName.trim()
  return normalizeSpace([input.firstName || "", input.lastName || ""].join(" ")) || "—"
}

export async function GET(req: NextRequest) {
  const access = await requireManagementApiAccess(["admin"])
  if (!access.ok) return access.response

  const mode = ((req.nextUrl.searchParams.get("mode") || "report").toLowerCase() as CleanupMode)
  const includeUnassigned = req.nextUrl.searchParams.get("includeUnassigned") === "true"
  const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase()

  if (mode !== "report" && mode !== "dry-run") {
    return NextResponse.json({ error: "Invalid mode." }, { status: 400 })
  }

  const rows = await prisma.gateCredential.findMany({
    where: {
      status: "active",
      OR: [
        {
          householdMember: {
            holderState: { in: ["past", "unknown"] },
          },
        },
        ...(includeUnassigned ? [{ householdMemberId: null }] : []),
      ],
    },
    include: {
      householdMember: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          organizationName: true,
          role: true,
          holderCategory: true,
          holderState: true,
        },
      },
      residentProfile: {
        select: {
          id: true,
          addressFull: true,
          householdMembers: {
            select: {
              id: true,
              role: true,
              holderCategory: true,
              holderState: true,
              firstName: true,
              lastName: true,
              organizationName: true,
            },
          },
        },
      },
    },
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
  })

  const items = rows
    .map((row) => {
      const holder = row.householdMember
      const profile = row.residentProfile
      const currentOwnerTenantHolders = profile.householdMembers.filter(
        (m) =>
          m.holderState === "current" &&
          (m.holderCategory === "owner_occupant" || m.holderCategory === "owner_non_occupant" || m.holderCategory === "tenant"),
      )
      const hasCurrentOwnerOrTenant = currentOwnerTenantHolders.length > 0
      const isUnassigned = !holder
      const replacementCandidates = profile.householdMembers.filter((m) => m.holderState === "current")

      const flags: string[] = []
      if (!hasCurrentOwnerOrTenant) flags.push("No current owner/tenant holder at this address.")
      if (isUnassigned) flags.push("Credential is not assigned to a holder.")
      if (row.credentialType === "directory_code" && row.credentialLabel === "A" && !replacementCandidates.find((m) => m.role === "primary")) {
        flags.push("DIR_A has no current primary holder candidate.")
      }
      if (row.credentialType === "directory_code" && row.credentialLabel === "B" && !replacementCandidates.find((m) => m.role === "secondary")) {
        flags.push("DIR_B has no current secondary holder candidate.")
      }

      const safeToRevoke = !isUnassigned && Boolean(holder) && (holder.holderState === "past" || holder.holderState === "unknown")
      const blocked = !safeToRevoke || !hasCurrentOwnerOrTenant
      const risk = blocked ? "review" : "safe"

      return {
        credentialId: row.id,
        residentProfileId: profile.id,
        addressFull: profile.addressFull || "—",
        credentialType: row.credentialType,
        credentialLabel: row.credentialLabel || null,
        credentialValueMasked: `***${row.credentialValue.slice(-3)}`,
        holderId: holder?.id || null,
        holderName: holder
          ? holderDisplayName({
              firstName: holder.firstName,
              lastName: holder.lastName,
              organizationName: holder.organizationName,
            })
          : "—",
        holderRole: holder?.role || null,
        holderCategory: holder?.holderCategory || null,
        holderState: holder?.holderState || null,
        hasCurrentOwnerOrTenant,
        replacementCandidateCount: replacementCandidates.length,
        safeToRevoke,
        blocked,
        risk,
        flags,
      }
    })
    .filter((item) => {
      if (!q) return true
      return (
        item.addressFull.toLowerCase().includes(q) ||
        item.holderName.toLowerCase().includes(q) ||
        item.credentialId.toLowerCase().includes(q) ||
        (item.credentialLabel || "").toLowerCase().includes(q)
      )
    })

  const summary = {
    total: items.length,
    safe: items.filter((i) => i.safeToRevoke && !i.blocked).length,
    review: items.filter((i) => i.blocked).length,
    unassigned: items.filter((i) => !i.holderId).length,
  }

  const dryRun = mode === "dry-run"
    ? items.map((item) => ({
        credentialId: item.credentialId,
        action: item.safeToRevoke && !item.blocked ? "would_revoke" : "would_skip",
        reason:
          item.safeToRevoke && !item.blocked
            ? "Holder state is past/unknown and record passed safety rules."
            : item.flags.join(" ") || "Not eligible by policy.",
      }))
    : undefined

  return NextResponse.json({
    mode,
    summary,
    items,
    dryRun,
  })
}


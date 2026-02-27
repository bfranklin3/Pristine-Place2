import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireManagementApiAccess } from "@/lib/auth/portal-management-api"

export async function POST(req: NextRequest) {
  const access = await requireManagementApiAccess(["admin"])
  if (!access.ok) return access.response

  const payload = (await req.json().catch(() => ({}))) as {
    ids?: unknown
    minScore?: unknown
  }

  const ids = Array.isArray(payload.ids)
    ? payload.ids.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : []
  const minScoreRaw = typeof payload.minScore === "number" ? payload.minScore : 95
  const minScore = Math.max(0, Math.min(100, Math.floor(minScoreRaw)))

  if (!ids.length) {
    return NextResponse.json({ error: "No match ids provided." }, { status: 400 })
  }

  try {
    const candidates = await prisma.residentAccMatch.findMany({
      where: {
        id: { in: ids },
        status: "needs_review",
        matchScore: { gte: minScore },
      },
      select: { id: true },
    })

    const candidateIds = candidates.map((c) => c.id)
    if (!candidateIds.length) {
      return NextResponse.json({
        ok: true,
        requested: ids.length,
        eligible: 0,
        updated: 0,
        minScore,
      })
    }

    const now = new Date()
    const updated = await prisma.residentAccMatch.updateMany({
      where: { id: { in: candidateIds } },
      data: {
        status: "confirmed",
        matchMethod: "manual_confirmed",
        reviewedAt: now,
        reviewedBy: access.identity.userId,
      },
    })

    return NextResponse.json({
      ok: true,
      requested: ids.length,
      eligible: candidateIds.length,
      updated: updated.count,
      minScore,
    })
  } catch (error) {
    console.error("ACC bulk confirm failed:", error)
    return NextResponse.json({ error: "Failed to bulk confirm matches" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireManagementApiAccess } from "@/lib/auth/portal-management-api"

export async function POST(req: NextRequest) {
  const access = await requireManagementApiAccess(["admin"])
  if (!access.ok) return access.response

  const payload = (await req.json().catch(() => ({}))) as {
    ids?: unknown
    maxScore?: unknown
  }

  const ids = Array.isArray(payload.ids)
    ? payload.ids.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : []
  const maxScoreRaw = typeof payload.maxScore === "number" ? payload.maxScore : 40
  const maxScore = Math.max(0, Math.min(100, Math.floor(maxScoreRaw)))

  if (!ids.length) {
    return NextResponse.json({ error: "No match ids provided." }, { status: 400 })
  }

  try {
    const candidates = await prisma.residentAccMatch.findMany({
      where: {
        id: { in: ids },
        status: "needs_review",
        matchScore: { lte: maxScore },
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
        maxScore,
      })
    }

    const now = new Date()
    const updated = await prisma.residentAccMatch.updateMany({
      where: { id: { in: candidateIds } },
      data: {
        status: "rejected",
        matchMethod: "manual_rejected",
        reviewedAt: now,
        reviewedBy: access.identity.userId,
      },
    })

    return NextResponse.json({
      ok: true,
      requested: ids.length,
      eligible: candidateIds.length,
      updated: updated.count,
      maxScore,
    })
  } catch (error) {
    console.error("ACC bulk reject failed:", error)
    return NextResponse.json({ error: "Failed to bulk reject matches" }, { status: 500 })
  }
}

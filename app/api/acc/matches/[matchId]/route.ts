import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireManagementApiAccess } from "@/lib/auth/portal-management-api"

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ matchId: string }> },
) {
  const access = await requireManagementApiAccess(["admin"])
  if (!access.ok) return access.response

  const { matchId } = await context.params
  if (!matchId) {
    return NextResponse.json({ error: "Missing matchId" }, { status: 400 })
  }

  const payload = (await req.json().catch(() => ({}))) as { action?: "confirm" | "reject" }
  if (payload.action !== "confirm" && payload.action !== "reject") {
    return NextResponse.json({ error: "Invalid action. Use confirm or reject." }, { status: 400 })
  }

  try {
    const updated = await prisma.residentAccMatch.update({
      where: { id: matchId },
      data: {
        status: payload.action === "confirm" ? "confirmed" : "rejected",
        matchMethod: payload.action === "confirm" ? "manual_confirmed" : "manual_rejected",
        reviewedAt: new Date(),
        reviewedBy: access.identity.userId,
      },
      select: {
        id: true,
        status: true,
        matchMethod: true,
        reviewedAt: true,
        reviewedBy: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ ok: true, item: updated })
  } catch (error) {
    console.error("ACC match review update failed:", error)
    return NextResponse.json({ error: "Failed to update ACC match status" }, { status: 500 })
  }
}

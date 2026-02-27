import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireManagementApiAccess } from "@/lib/auth/portal-management-api"

export async function GET(req: NextRequest) {
  const access = await requireManagementApiAccess(["admin", "acc", "access_control", "board_of_directors"])
  if (!access.ok) return access.response

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") || "").trim()
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1)
  const pageSizeRaw = Number.parseInt(searchParams.get("pageSize") || "25", 10) || 25
  const pageSize = Math.max(5, Math.min(100, pageSizeRaw))

  const where = q
    ? {
        OR: [
          { addressFull: { contains: q, mode: "insensitive" as const } },
          { addressNumber: { contains: q, mode: "insensitive" as const } },
          { streetName: { contains: q, mode: "insensitive" as const } },
          {
            householdMembers: {
              some: {
                OR: [
                  { firstName: { contains: q, mode: "insensitive" as const } },
                  { lastName: { contains: q, mode: "insensitive" as const } },
                  { email: { contains: q, mode: "insensitive" as const } },
                  { phone: { contains: q, mode: "insensitive" as const } },
                ],
              },
            },
          },
          {
            accMatches: {
              some: {
                status: "confirmed" as const,
                accRequest: {
                  OR: [
                    { permitNumber: { contains: q, mode: "insensitive" as const } },
                    { ownerName: { contains: q, mode: "insensitive" as const } },
                    { addressRaw: { contains: q, mode: "insensitive" as const } },
                    { workType: { contains: q, mode: "insensitive" as const } },
                  ],
                },
              },
            },
          },
        ],
      }
    : {}

  try {
    const [total, rows] = await Promise.all([
      prisma.residentProfile.count({ where }),
      prisma.residentProfile.findMany({
        where,
        orderBy: [{ addressNumber: "asc" }, { streetName: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          householdMembers: true,
          credentials: {
            where: { status: "active" },
            orderBy: { createdAt: "asc" },
          },
          accMatches: {
            where: { status: "confirmed" },
            include: { accRequest: true },
          },
        },
      }),
    ])

    const items = rows.map((row) => {
      const primary = row.householdMembers.find((m) => m.role === "primary") || null
      const secondary = row.householdMembers.find((m) => m.role === "secondary") || null
      return {
        id: row.id,
        address:
          row.addressFull || `${row.addressNumber || ""} ${row.streetName || ""}`.trim() || "—",
        category: row.residentCategory || "—",
        primaryName: primary ? `${primary.firstName || ""} ${primary.lastName || ""}`.trim() || "—" : "—",
        secondaryName: secondary ? `${secondary.firstName || ""} ${secondary.lastName || ""}`.trim() || "—" : "—",
        entryCode: row.entryCode || "",
        activeCredentialCount: row.credentials.length,
        confirmedAccCount: row.accMatches.length,
        latestAccSubmittedAt:
          row.accMatches
            .map((m) => m.accRequest.submittedAt)
            .filter((d): d is Date => Boolean(d))
            .sort((a, b) => b.getTime() - a.getTime())[0] || null,
      }
    })

    return NextResponse.json({
      items,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    })
  } catch (error) {
    console.error("Resident 360 list failed:", error)
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to load resident lookup list", detail }, { status: 500 })
  }
}


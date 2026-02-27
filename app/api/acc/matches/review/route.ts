import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db/prisma"
import { requireManagementApiAccess } from "@/lib/auth/portal-management-api"

const ALLOWED_STATUSES = ["auto", "needs_review", "confirmed", "rejected"] as const
type AllowedStatus = (typeof ALLOWED_STATUSES)[number]

function toAllowedStatus(value: string | null): AllowedStatus | "all" {
  if (!value) return "needs_review"
  if (value === "all") return "all"
  return ALLOWED_STATUSES.includes(value as AllowedStatus) ? (value as AllowedStatus) : "needs_review"
}

export async function GET(req: NextRequest) {
  const access = await requireManagementApiAccess(["admin"])
  if (!access.ok) return access.response

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") || "").trim()
  const status = toAllowedStatus(searchParams.get("status"))
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1)
  const pageSizeRaw = Number.parseInt(searchParams.get("pageSize") || "25", 10) || 25
  const pageSize = Math.max(5, Math.min(100, pageSizeRaw))

  const where: Prisma.ResidentAccMatchWhereInput = {}
  if (status !== "all") where.status = status
  if (q) {
    where.OR = [
      {
        accRequest: {
          OR: [
            { ownerName: { contains: q, mode: "insensitive" } },
            { addressRaw: { contains: q, mode: "insensitive" } },
            { permitNumber: { contains: q, mode: "insensitive" } },
            { workType: { contains: q, mode: "insensitive" } },
          ],
        },
      },
      {
        residentProfile: {
          OR: [
            { addressFull: { contains: q, mode: "insensitive" } },
            { streetName: { contains: q, mode: "insensitive" } },
          ],
        },
      },
    ]
  }

  try {
    const [total, rows, autoCount, reviewCount, confirmedCount, rejectedCount] = await Promise.all([
      prisma.residentAccMatch.count({ where }),
      prisma.residentAccMatch.findMany({
        where,
        orderBy: [{ matchScore: "desc" }, { updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          accRequest: true,
          residentProfile: {
            include: {
              householdMembers: true,
            },
          },
        },
      }),
      prisma.residentAccMatch.count({ where: { status: "auto" } }),
      prisma.residentAccMatch.count({ where: { status: "needs_review" } }),
      prisma.residentAccMatch.count({ where: { status: "confirmed" } }),
      prisma.residentAccMatch.count({ where: { status: "rejected" } }),
    ])

    const counts = { auto: autoCount, needs_review: reviewCount, confirmed: confirmedCount, rejected: rejectedCount }

    const items = rows.map((row) => {
      const primary = row.residentProfile.householdMembers.find((m) => m.role === "primary") || null
      const secondary = row.residentProfile.householdMembers.find((m) => m.role === "secondary") || null
      return {
        id: row.id,
        status: row.status,
        matchMethod: row.matchMethod,
        matchScore: row.matchScore,
        reviewedAt: row.reviewedAt,
        reviewedBy: row.reviewedBy,
        updatedAt: row.updatedAt,
        accRequest: {
          id: row.accRequest.id,
          sourceEntryId: row.accRequest.sourceEntryId,
          submittedAt: row.accRequest.submittedAt,
          disposition: row.accRequest.disposition,
          permitNumber: row.accRequest.permitNumber,
          ownerName: row.accRequest.ownerName,
          ownerPhone: row.accRequest.ownerPhone,
          ownerEmail: row.accRequest.ownerEmail,
          addressRaw: row.accRequest.addressRaw,
          workType: row.accRequest.workType,
          description: row.accRequest.description,
          notes: row.accRequest.notes,
        },
        residentProfile: {
          id: row.residentProfile.id,
          category: row.residentProfile.residentCategory,
          addressFull:
            row.residentProfile.addressFull ||
            `${row.residentProfile.addressNumber || ""} ${row.residentProfile.streetName || ""}`.trim(),
          entryCode: row.residentProfile.entryCode,
          primary: primary
            ? {
                firstName: primary.firstName,
                lastName: primary.lastName,
                phone: primary.phone,
                email: primary.email,
              }
            : null,
          secondary: secondary
            ? {
                firstName: secondary.firstName,
                lastName: secondary.lastName,
                phone: secondary.phone,
                email: secondary.email,
              }
            : null,
        },
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
      counts,
    })
  } catch (error) {
    console.error("ACC match review list failed:", error)
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to load ACC match review list", detail }, { status: 500 })
  }
}

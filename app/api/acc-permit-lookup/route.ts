import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireManagementApiAccess } from "@/lib/auth/portal-management-api"
import {
  buildNativeAccRequestWhere,
  dedupeNativeAccRequests,
  matchesNativeAccAnchor,
} from "@/lib/resident-360/native-acc"

export async function GET(req: NextRequest) {
  const access = await requireManagementApiAccess(["admin", "board_of_directors"])
  if (!access.ok) return access.response

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") || "").trim()
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1)
  const pageSizeRaw = Number.parseInt(searchParams.get("pageSize") || "25", 10) || 25
  const pageSize = Math.max(5, Math.min(100, pageSizeRaw))

  try {
    const matchingNativeRequests = q
      ? await prisma.accWorkflowRequest.findMany({
          where: {
            OR: [
              { requestNumber: { contains: q, mode: "insensitive" } },
              { permitNumber: { contains: q, mode: "insensitive" } },
              { residentNameSnapshot: { contains: q, mode: "insensitive" } },
              { workType: { contains: q, mode: "insensitive" } },
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { residentAddressSnapshot: { contains: q, mode: "insensitive" } },
            ],
          },
          select: {
            householdId: true,
            residencyId: true,
            addressCanonical: true,
          },
          take: 100,
        })
      : []

    const nativeResidencyIds = Array.from(
      new Set(matchingNativeRequests.map((row) => row.residencyId).filter((value): value is string => Boolean(value))),
    )
    const nativeHouseholdIds = Array.from(
      new Set(matchingNativeRequests.map((row) => row.householdId).filter((value): value is string => Boolean(value))),
    )
    const nativeAddressCanonicals = Array.from(
      new Set(matchingNativeRequests.map((row) => row.addressCanonical).filter((value): value is string => Boolean(value))),
    )

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
                      { sourceEntryId: { contains: q, mode: "insensitive" as const } },
                      { permitNumber: { contains: q, mode: "insensitive" as const } },
                      { ownerName: { contains: q, mode: "insensitive" as const } },
                      { addressRaw: { contains: q, mode: "insensitive" as const } },
                      { workType: { contains: q, mode: "insensitive" as const } },
                      { description: { contains: q, mode: "insensitive" as const } },
                    ],
                  },
                },
              },
            },
            {
              residency: {
                is: {
                  accWorkflowRequests: {
                    some: {
                      OR: [
                        { requestNumber: { contains: q, mode: "insensitive" as const } },
                        { permitNumber: { contains: q, mode: "insensitive" as const } },
                        { residentNameSnapshot: { contains: q, mode: "insensitive" as const } },
                        { workType: { contains: q, mode: "insensitive" as const } },
                        { title: { contains: q, mode: "insensitive" as const } },
                        { description: { contains: q, mode: "insensitive" as const } },
                        { residentAddressSnapshot: { contains: q, mode: "insensitive" as const } },
                      ],
                    },
                  },
                },
              },
            },
            {
              household: {
                is: {
                  accWorkflowRequests: {
                    some: {
                      OR: [
                        { requestNumber: { contains: q, mode: "insensitive" as const } },
                        { permitNumber: { contains: q, mode: "insensitive" as const } },
                        { residentNameSnapshot: { contains: q, mode: "insensitive" as const } },
                        { workType: { contains: q, mode: "insensitive" as const } },
                        { title: { contains: q, mode: "insensitive" as const } },
                        { description: { contains: q, mode: "insensitive" as const } },
                        { residentAddressSnapshot: { contains: q, mode: "insensitive" as const } },
                      ],
                    },
                  },
                },
              },
            },
            ...(nativeResidencyIds.length
              ? [
                  {
                    residency: {
                      is: {
                        id: {
                          in: nativeResidencyIds,
                        },
                      },
                    },
                  },
                ]
              : []),
            ...(nativeHouseholdIds.length || nativeAddressCanonicals.length
              ? [
                  {
                    household: {
                      is: {
                        OR: [
                          ...(nativeHouseholdIds.length
                            ? [
                                {
                                  id: {
                                    in: nativeHouseholdIds,
                                  },
                                },
                              ]
                            : []),
                          ...(nativeAddressCanonicals.length
                            ? [
                                {
                                  addressCanonical: {
                                    in: nativeAddressCanonicals,
                                  },
                                },
                              ]
                            : []),
                        ],
                      },
                    },
                  },
                ]
              : []),
          ],
        }
      : {}

    const [total, rows] = await Promise.all([
      prisma.residentProfile.count({ where }),
      prisma.residentProfile.findMany({
        where,
        orderBy: [{ addressNumber: "asc" }, { streetName: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          household: {
            select: {
              id: true,
              addressCanonical: true,
            },
          },
          residency: {
            select: {
              id: true,
            },
          },
          accMatches: {
            where: { status: "confirmed" },
            include: { accRequest: true },
          },
        },
      }),
    ])

    const nativeWhere = rows.length
      ? {
          OR: rows
            .map((row) =>
              buildNativeAccRequestWhere({
                residencyId: row.residency?.id || null,
                householdId: row.household?.id || null,
                addressCanonical: row.household?.addressCanonical || null,
              }),
            )
            .filter((clause): clause is NonNullable<typeof clause> => Boolean(clause)),
        }
      : null

    const nativeRequests = nativeWhere
      ? await prisma.accWorkflowRequest.findMany({
          where: nativeWhere,
          select: {
            id: true,
            submittedAt: true,
            householdId: true,
            residencyId: true,
            addressCanonical: true,
          },
        })
      : []

    const items = rows.map((row) => {
      const residentNativeRequests = dedupeNativeAccRequests(
        nativeRequests.filter((request) =>
          matchesNativeAccAnchor(request, {
            residencyId: row.residency?.id || null,
            householdId: row.household?.id || null,
            addressCanonical: row.household?.addressCanonical || null,
          }),
        ),
      )
      const combinedSubmittedAt = [
        ...row.accMatches.map((match) => match.accRequest.submittedAt),
        ...residentNativeRequests.map((request) => request.submittedAt),
      ]
        .filter((value): value is Date => Boolean(value))
        .sort((a, b) => b.getTime() - a.getTime())

      return {
        id: row.id,
        address:
          row.addressFull || `${row.addressNumber || ""} ${row.streetName || ""}`.trim() || "—",
        accHistoryCount: row.accMatches.length + residentNativeRequests.length,
        latestAccSubmittedAt: combinedSubmittedAt[0] || null,
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
    console.error("ACC permit lookup list failed:", error)
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to load ACC permit lookup list", detail }, { status: 500 })
  }
}

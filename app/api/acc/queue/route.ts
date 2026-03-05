import { NextRequest, NextResponse } from "next/server"
import type { Prisma, AccDisposition } from "@prisma/client"
import { prisma } from "@/lib/db/prisma"
import { requireManagementCapabilityAccess } from "@/lib/auth/portal-management-api"

type QueueDispositionFilter = "all" | "pending" | "approved" | "rejected" | "conditional" | "duplicate" | "canceled"

function toFilter(input: string | null): QueueDispositionFilter {
  if (
    input === "pending" ||
    input === "approved" ||
    input === "rejected" ||
    input === "conditional" ||
    input === "duplicate" ||
    input === "canceled"
  ) {
    return input
  }
  return "all"
}

function parseYmd(value: string | null): Date | null {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function addOneDay(date: Date): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + 1)
  return d
}

function toDbDisposition(filter: Exclude<QueueDispositionFilter, "all">): AccDisposition {
  if (filter === "pending") return "unknown"
  if (filter === "rejected") return "denied"
  return filter
}

function toUiDisposition(value: AccDisposition): Exclude<QueueDispositionFilter, "all"> {
  if (value === "unknown") return "pending"
  if (value === "denied") return "rejected"
  return value
}

export async function GET(req: NextRequest) {
  const access = await requireManagementCapabilityAccess(["acc.view"])
  if (!access.ok) return access.response

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") || "").trim()
  const disposition = toFilter(searchParams.get("disposition"))
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1)
  const perPageRaw = Number.parseInt(searchParams.get("per_page") || "25", 10) || 25
  const perPage = Math.max(5, Math.min(100, perPageRaw))
  const startDate = parseYmd(searchParams.get("startDate"))
  const endDate = parseYmd(searchParams.get("endDate"))

  if ((searchParams.get("startDate") && !startDate) || (searchParams.get("endDate") && !endDate)) {
    return NextResponse.json({ error: "Invalid date filter format. Use YYYY-MM-DD." }, { status: 400 })
  }

  if (startDate && endDate && endDate < startDate) {
    return NextResponse.json({ error: "End date cannot be before start date." }, { status: 400 })
  }

  const where: Prisma.AccRequestWhereInput = {
    ...(disposition !== "all" ? { disposition: toDbDisposition(disposition) } : {}),
    ...(q
      ? {
          OR: [
            { sourceEntryId: { contains: q, mode: "insensitive" } },
            { permitNumber: { contains: q, mode: "insensitive" } },
            { ownerName: { contains: q, mode: "insensitive" } },
            { ownerPhone: { contains: q, mode: "insensitive" } },
            { ownerEmail: { contains: q, mode: "insensitive" } },
            { addressRaw: { contains: q, mode: "insensitive" } },
            { workType: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { notes: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(startDate || endDate
      ? {
          submittedAt: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lt: addOneDay(endDate) } : {}),
          },
        }
      : {}),
  }

  try {
    const [rows, total] = await Promise.all([
      prisma.accRequest.findMany({
        where,
        select: {
          id: true,
          sourceEntryId: true,
          permitNumber: true,
          submittedAt: true,
          processDate: true,
          disposition: true,
          ownerName: true,
          ownerPhone: true,
          ownerEmail: true,
          addressRaw: true,
          workType: true,
          description: true,
          notes: true,
          updatedAt: true,
        },
        orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.accRequest.count({ where }),
    ])

    const counts = await prisma.accRequest.groupBy({
      by: ["disposition"],
      _count: { _all: true },
    })

    const countMap: Record<string, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
      conditional: 0,
      duplicate: 0,
      canceled: 0,
    }

    for (const c of counts) {
      const key = toUiDisposition(c.disposition)
      countMap[key] += c._count._all
    }

    return NextResponse.json({
      entries: rows.map((row) => ({
        id: row.id,
        sourceEntryId: row.sourceEntryId,
        permitNumber: row.permitNumber,
        submittedAt: row.submittedAt?.toISOString() || null,
        processDate: row.processDate?.toISOString() || null,
        disposition: toUiDisposition(row.disposition),
        ownerName: row.ownerName,
        ownerPhone: row.ownerPhone,
        ownerEmail: row.ownerEmail,
        addressRaw: row.addressRaw,
        workType: row.workType,
        description: row.description,
        notes: row.notes,
        updatedAt: row.updatedAt.toISOString(),
      })),
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      page,
      perPage,
      counts: {
        all: Object.values(countMap).reduce((sum, n) => sum + n, 0),
        ...countMap,
      },
    })
  } catch (error) {
    console.error("ACC queue (Neon) list failed:", error)
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to load ACC queue", detail }, { status: 500 })
  }
}

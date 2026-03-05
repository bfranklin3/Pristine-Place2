import { NextRequest, NextResponse } from "next/server"
import type { AccDisposition } from "@prisma/client"
import { prisma } from "@/lib/db/prisma"
import { requireManagementCapabilityAccess } from "@/lib/auth/portal-management-api"

type UiDisposition = "pending" | "approved" | "rejected" | "conditional" | "duplicate" | "canceled"

function toUiDisposition(value: AccDisposition): UiDisposition {
  if (value === "unknown") return "pending"
  if (value === "denied") return "rejected"
  return value
}

function toDbDisposition(value: UiDisposition): AccDisposition {
  if (value === "pending") return "unknown"
  if (value === "rejected") return "denied"
  return value
}

function parseYmd(value: string | null | undefined): Date | null {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireManagementCapabilityAccess(["acc.view"])
  if (!access.ok) return access.response

  const { id } = await ctx.params

  try {
    const row = await prisma.accRequest.findUnique({
      where: { id },
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
        authorizedRepName: true,
        addressRaw: true,
        workType: true,
        description: true,
        notes: true,
        phase: true,
        lot: true,
        updatedAt: true,
      },
    })

    if (!row) return NextResponse.json({ error: "Entry not found" }, { status: 404 })

    return NextResponse.json({
      entry: {
        id: row.id,
        sourceEntryId: row.sourceEntryId,
        permitNumber: row.permitNumber,
        submittedAt: row.submittedAt?.toISOString() || null,
        processDate: row.processDate?.toISOString() || null,
        disposition: toUiDisposition(row.disposition),
        ownerName: row.ownerName,
        ownerPhone: row.ownerPhone,
        ownerEmail: row.ownerEmail,
        authorizedRepName: row.authorizedRepName,
        addressRaw: row.addressRaw,
        workType: row.workType,
        description: row.description,
        notes: row.notes,
        phase: row.phase,
        lot: row.lot,
        updatedAt: row.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("ACC queue detail failed:", error)
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to load ACC queue entry", detail }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireManagementCapabilityAccess(["acc.edit"])
  if (!access.ok) return access.response

  const { id } = await ctx.params
  const body = await req.json().catch(() => ({})) as {
    permitNumber?: string | null
    disposition?: UiDisposition
    processDate?: string | null
    notes?: string | null
    description?: string | null
  }

  const nextDisposition = body.disposition
  if (nextDisposition && !["pending", "approved", "rejected", "conditional", "duplicate", "canceled"].includes(nextDisposition)) {
    return NextResponse.json({ error: "Invalid disposition." }, { status: 400 })
  }

  const parsedProcessDate = body.processDate === "" ? null : parseYmd(body.processDate)
  if (body.processDate && body.processDate !== "" && !parsedProcessDate) {
    return NextResponse.json({ error: "Invalid process date. Use YYYY-MM-DD." }, { status: 400 })
  }

  if (nextDisposition && nextDisposition !== "pending" && body.processDate === "") {
    return NextResponse.json({ error: "Process date is required when disposition is set." }, { status: 400 })
  }

  if (nextDisposition === "pending" && parsedProcessDate) {
    return NextResponse.json({ error: "Clear process date when disposition is Pending." }, { status: 400 })
  }

  try {
    const updated = await prisma.accRequest.update({
      where: { id },
      data: {
        ...(Object.prototype.hasOwnProperty.call(body, "permitNumber")
          ? { permitNumber: (body.permitNumber || "").trim() || null }
          : {}),
        ...(nextDisposition ? { disposition: toDbDisposition(nextDisposition) } : {}),
        ...(Object.prototype.hasOwnProperty.call(body, "processDate")
          ? { processDate: parsedProcessDate }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(body, "notes")
          ? { notes: (body.notes || "").trim() || null }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(body, "description")
          ? { description: (body.description || "").trim() || null }
          : {}),
      },
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
        authorizedRepName: true,
        addressRaw: true,
        workType: true,
        description: true,
        notes: true,
        phase: true,
        lot: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      entry: {
        id: updated.id,
        sourceEntryId: updated.sourceEntryId,
        permitNumber: updated.permitNumber,
        submittedAt: updated.submittedAt?.toISOString() || null,
        processDate: updated.processDate?.toISOString() || null,
        disposition: toUiDisposition(updated.disposition),
        ownerName: updated.ownerName,
        ownerPhone: updated.ownerPhone,
        ownerEmail: updated.ownerEmail,
        authorizedRepName: updated.authorizedRepName,
        addressRaw: updated.addressRaw,
        workType: updated.workType,
        description: updated.description,
        notes: updated.notes,
        phase: updated.phase,
        lot: updated.lot,
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("ACC queue update failed:", error)
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to update ACC queue entry", detail }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { listAuditPrisma } from "@/lib/access/repository-prisma"
import { requireManagementCapabilityAccess } from "@/lib/auth/portal-management-api"
import type { AccessAuditEntityType } from "@/lib/access/types"

export async function GET(req: NextRequest) {
  const access = await requireManagementCapabilityAccess(["access.view"])
  if (!access.ok) return access.response

  const { searchParams } = new URL(req.url)
  const entityTypeRaw = searchParams.get("entityType") || undefined
  const entityId = searchParams.get("entityId") || undefined
  const limit = Number.parseInt(searchParams.get("limit") || "50", 10)

  const allowedTypes: AccessAuditEntityType[] = [
    "resident_profile",
    "household_member",
    "gate_credential",
  ]
  const entityType = allowedTypes.includes(entityTypeRaw as AccessAuditEntityType)
    ? (entityTypeRaw as AccessAuditEntityType)
    : undefined

  try {
    const items = await listAuditPrisma({ entityType, entityId, limit })
    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    console.error("Prisma audit list failed:", error)
    return NextResponse.json({ error: "Failed to load access audit log" }, { status: 500 })
  }
}

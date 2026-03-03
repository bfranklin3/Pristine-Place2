import { NextRequest, NextResponse } from "next/server"
import { listResidentsPrisma } from "@/lib/access/repository-prisma"
import { requireManagementCapabilityAccess } from "@/lib/auth/portal-management-api"
import type { AccessCredentialStatus } from "@/lib/access/types"

export async function GET(req: NextRequest) {
  const access = await requireManagementCapabilityAccess(["access.view"])
  if (!access.ok) return access.response

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") || undefined
  const phase = searchParams.get("phase") || undefined
  const category = searchParams.get("category") || undefined
  const statusRaw = searchParams.get("status") || undefined
  const page = Number.parseInt(searchParams.get("page") || "1", 10)
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "25", 10)

  const allowedStatuses: AccessCredentialStatus[] = ["active", "disabled", "lost", "revoked"]
  const status = allowedStatuses.includes(statusRaw as AccessCredentialStatus)
    ? (statusRaw as AccessCredentialStatus)
    : undefined

  try {
    const result = await listResidentsPrisma({ q, phase, category, status, page, pageSize })
    return NextResponse.json(result)
  } catch (error) {
    console.error("Prisma residents list failed:", error)
    return NextResponse.json({ error: "Failed to load resident access report" }, { status: 500 })
  }
}

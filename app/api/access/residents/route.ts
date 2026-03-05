import { NextRequest, NextResponse } from "next/server"
import { createResidentPrisma, listResidentsPrisma } from "@/lib/access/repository-prisma"
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

export async function POST(req: NextRequest) {
  const access = await requireManagementCapabilityAccess(["access.edit"])
  if (!access.ok) return access.response

  const body = await req.json().catch(() => ({}))
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key)
  const reason = typeof body.reason === "string" ? body.reason : null

  try {
    const created = await createResidentPrisma(
      {
        primaryUserId: has("primaryUserId") ? body.primaryUserId : undefined,
        residentCategory: has("residentCategory") ? body.residentCategory : undefined,
        includeInDirectory: has("includeInDirectory") && typeof body.includeInDirectory === "boolean"
          ? body.includeInDirectory
          : undefined,
        confidentialPhone: has("confidentialPhone") && typeof body.confidentialPhone === "boolean"
          ? body.confidentialPhone
          : undefined,
        phase: has("phase") ? body.phase : undefined,
        addressNumber: has("addressNumber") ? body.addressNumber : undefined,
        streetName: has("streetName") ? body.streetName : undefined,
        addressFull: has("addressFull") ? body.addressFull : undefined,
        entryCode: has("entryCode") ? body.entryCode : undefined,
        comments: has("comments") ? body.comments : undefined,
      },
      access.identity.userId,
      reason || "Created resident profile from Access Management",
    )
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("Prisma resident create failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create failed" },
      { status: 500 },
    )
  }
}

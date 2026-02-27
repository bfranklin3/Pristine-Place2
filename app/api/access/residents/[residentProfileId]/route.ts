import { NextRequest, NextResponse } from "next/server"
import { getResidentDetailPrisma, patchResidentPrisma } from "@/lib/access/repository-prisma"
import { requireManagementApiAccess } from "@/lib/auth/portal-management-api"

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ residentProfileId: string }> },
) {
  const access = await requireManagementApiAccess(["admin", "access_control"])
  if (!access.ok) return access.response

  const { residentProfileId } = await context.params
  try {
    const detail = await getResidentDetailPrisma(residentProfileId)
    if (detail) return NextResponse.json(detail)
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (error) {
    console.error("Prisma resident detail failed:", error)
    return NextResponse.json({ error: "Failed to load resident profile" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ residentProfileId: string }> },
) {
  const access = await requireManagementApiAccess(["admin", "access_control"])
  if (!access.ok) return access.response

  const { residentProfileId } = await context.params
  const body = await req.json().catch(() => ({}))
  const reason = typeof body.reason === "string" ? body.reason : null

  try {
    const detail = await patchResidentPrisma(
      residentProfileId,
      {
        residentCategory: body.residentCategory ?? undefined,
        includeInDirectory: typeof body.includeInDirectory === "boolean" ? body.includeInDirectory : undefined,
        confidentialPhone: typeof body.confidentialPhone === "boolean" ? body.confidentialPhone : undefined,
        phase: body.phase ?? undefined,
        addressNumber: body.addressNumber ?? undefined,
        streetName: body.streetName ?? undefined,
        addressFull: body.addressFull ?? undefined,
        entryCode: body.entryCode ?? undefined,
        comments: body.comments ?? undefined,
      },
      access.identity.userId,
      reason,
    )
    if (detail) return NextResponse.json(detail)
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (error) {
    console.error("Prisma resident patch failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 },
    )
  }
}

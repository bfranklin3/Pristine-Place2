import { NextRequest, NextResponse } from "next/server"
import { getResidentDetailPrisma, patchResidentPrisma } from "@/lib/access/repository-prisma"
import { requireManagementCapabilityAccess } from "@/lib/auth/portal-management-api"

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ residentProfileId: string }> },
) {
  const access = await requireManagementCapabilityAccess(["access.view"])
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
  const access = await requireManagementCapabilityAccess(["access.edit"])
  if (!access.ok) return access.response

  const { residentProfileId } = await context.params
  const body = await req.json().catch(() => ({}))
  const reason = typeof body.reason === "string" ? body.reason : null
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key)

  try {
    const detail = await patchResidentPrisma(
      residentProfileId,
      {
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

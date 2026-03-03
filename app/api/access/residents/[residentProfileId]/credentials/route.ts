import { NextRequest, NextResponse } from "next/server"
import { addCredentialPrisma } from "@/lib/access/repository-prisma"
import { requireManagementCapabilityAccess } from "@/lib/auth/portal-management-api"
import type { AccessCredentialType } from "@/lib/access/types"

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ residentProfileId: string }> },
) {
  const access = await requireManagementCapabilityAccess(["access.edit"])
  if (!access.ok) return access.response

  const { residentProfileId } = await context.params
  const body = await req.json().catch(() => ({}))
  const credentialType = body.credentialType as AccessCredentialType

  const allowedTypes: AccessCredentialType[] = ["directory_code", "barcode", "fob", "temp_code"]
  if (!allowedTypes.includes(credentialType)) {
    return NextResponse.json({ error: "Invalid credential type" }, { status: 400 })
  }

  if (typeof body.credentialValue !== "string" || !body.credentialValue.trim()) {
    return NextResponse.json({ error: "credentialValue is required" }, { status: 400 })
  }

  try {
    const credential = await addCredentialPrisma(
      residentProfileId,
      {
        credentialType,
        credentialLabel: typeof body.credentialLabel === "string" ? body.credentialLabel : null,
        credentialValue: body.credentialValue.trim(),
        notes: typeof body.notes === "string" ? body.notes : null,
      },
      access.identity.userId,
      typeof body.reason === "string" ? body.reason : null,
    )
    if (credential) return NextResponse.json(credential, { status: 201 })
    return NextResponse.json({ error: "Resident profile not found" }, { status: 404 })
  } catch (error) {
    console.error("Prisma credential create failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create failed" },
      { status: 500 },
    )
  }
}

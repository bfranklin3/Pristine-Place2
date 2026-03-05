import { NextRequest, NextResponse } from "next/server"
import { patchCredentialPrisma } from "@/lib/access/repository-prisma"
import { requireManagementCapabilityAccess } from "@/lib/auth/portal-management-api"
import type { AccessCredentialStatus } from "@/lib/access/types"

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const access = await requireManagementCapabilityAccess(["access.edit"])
  if (!access.ok) return access.response

  const { id } = await context.params
  const body = await req.json().catch(() => ({}))
  const status = body.status as AccessCredentialStatus | undefined
  const credentialValue =
    typeof body.credentialValue === "string" && body.credentialValue.trim()
      ? body.credentialValue.trim()
      : undefined

  if (status) {
    const allowedStatuses: AccessCredentialStatus[] = ["active", "disabled", "lost", "revoked"]
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid credential status" }, { status: 400 })
    }
  }

  try {
    const credential = await patchCredentialPrisma(
      id,
      {
        status,
        notes: typeof body.notes === "string" ? body.notes : undefined,
        credentialLabel: typeof body.credentialLabel === "string" ? body.credentialLabel : undefined,
        credentialValue,
        householdMemberId:
          typeof body.householdMemberId === "string"
            ? body.householdMemberId
            : body.householdMemberId === null
              ? null
              : undefined,
      },
      access.identity.userId,
      typeof body.reason === "string" ? body.reason : null,
    )
    if (credential) return NextResponse.json(credential)
    return NextResponse.json({ error: "Credential not found" }, { status: 404 })
  } catch (error) {
    console.error("Prisma credential patch failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 },
    )
  }
}

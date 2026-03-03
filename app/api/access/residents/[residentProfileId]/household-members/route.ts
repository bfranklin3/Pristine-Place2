import { NextRequest, NextResponse } from "next/server"
import { addHouseholdMemberPrisma } from "@/lib/access/repository-prisma"
import { requireManagementCapabilityAccess } from "@/lib/auth/portal-management-api"
import type { HouseholdRole } from "@/lib/access/types"

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ residentProfileId: string }> },
) {
  const access = await requireManagementCapabilityAccess(["access.edit"])
  if (!access.ok) return access.response

  const { residentProfileId } = await context.params
  const body = await req.json().catch(() => ({}))
  const role = body.role as HouseholdRole

  const allowedRoles: HouseholdRole[] = ["primary", "secondary", "tertiary", "company_contact"]
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid household role" }, { status: 400 })
  }

  try {
    const member = await addHouseholdMemberPrisma(
      residentProfileId,
      {
        role,
        firstName: body.firstName ?? null,
        lastName: body.lastName ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        isPrimaryContact: Boolean(body.isPrimaryContact),
      },
      access.identity.userId,
      typeof body.reason === "string" ? body.reason : null,
    )
    if (member) return NextResponse.json(member, { status: 201 })
    return NextResponse.json({ error: "Resident profile not found" }, { status: 404 })
  } catch (error) {
    console.error("Prisma household-member create failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create failed" },
      { status: 500 },
    )
  }
}

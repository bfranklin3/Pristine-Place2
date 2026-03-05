import { NextRequest, NextResponse } from "next/server"
import { addHouseholdMemberPrisma } from "@/lib/access/repository-prisma"
import { requireManagementCapabilityAccess } from "@/lib/auth/portal-management-api"
import type { AccessHolderCategory, AccessHolderState, HouseholdRole } from "@/lib/access/types"

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ residentProfileId: string }> },
) {
  const access = await requireManagementCapabilityAccess(["access.edit"])
  if (!access.ok) return access.response

  const { residentProfileId } = await context.params
  const body = await req.json().catch(() => ({}))
  const role = body.role as HouseholdRole
  const holderCategory = body.holderCategory as AccessHolderCategory | undefined
  const holderState = body.holderState as AccessHolderState | undefined

  const allowedRoles: HouseholdRole[] = ["primary", "secondary", "tertiary", "company_contact"]
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid household role" }, { status: 400 })
  }
  const allowedHolderCategories: AccessHolderCategory[] = [
    "owner_occupant",
    "owner_non_occupant",
    "tenant",
    "household_member",
    "trustee_or_owner_rep",
    "guardian",
    "vendor",
    "property_manager",
    "unspecified",
  ]
  const allowedHolderStates: AccessHolderState[] = ["current", "past", "unknown"]
  if (holderCategory && !allowedHolderCategories.includes(holderCategory)) {
    return NextResponse.json({ error: "Invalid holder category" }, { status: 400 })
  }
  if (holderState && !allowedHolderStates.includes(holderState)) {
    return NextResponse.json({ error: "Invalid holder state" }, { status: 400 })
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
        holderCategory: holderCategory ?? "unspecified",
        holderState: holderState ?? "unknown",
        organizationName: body.organizationName ?? null,
        startDate: typeof body.startDate === "string" ? body.startDate : null,
        endDate: typeof body.endDate === "string" ? body.endDate : null,
        notes: body.notes ?? null,
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

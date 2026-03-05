import { NextRequest, NextResponse } from "next/server"
import {
  deleteHouseholdMemberPrisma,
  patchHouseholdMemberPrisma,
} from "@/lib/access/repository-prisma"
import { requireManagementCapabilityAccess } from "@/lib/auth/portal-management-api"
import type { AccessHolderCategory, AccessHolderState, HouseholdRole } from "@/lib/access/types"

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const access = await requireManagementCapabilityAccess(["access.edit"])
  if (!access.ok) return access.response

  const { id } = await context.params
  const body = await req.json().catch(() => ({}))
  const role = body.role as HouseholdRole | undefined
  const holderCategory = body.holderCategory as AccessHolderCategory | undefined
  const holderState = body.holderState as AccessHolderState | undefined

  if (role) {
    const allowedRoles: HouseholdRole[] = ["primary", "secondary", "tertiary", "company_contact"]
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid household role" }, { status: 400 })
    }
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
    const member = await patchHouseholdMemberPrisma(
      id,
      {
        role,
        firstName: body.firstName ?? undefined,
        lastName: body.lastName ?? undefined,
        phone: body.phone ?? undefined,
        email: body.email ?? undefined,
        isPrimaryContact: typeof body.isPrimaryContact === "boolean" ? body.isPrimaryContact : undefined,
        holderCategory,
        holderState,
        organizationName: body.organizationName ?? undefined,
        startDate: typeof body.startDate === "string" ? body.startDate : body.startDate === null ? null : undefined,
        endDate: typeof body.endDate === "string" ? body.endDate : body.endDate === null ? null : undefined,
        notes: body.notes ?? undefined,
      },
      access.identity.userId,
      typeof body.reason === "string" ? body.reason : null,
    )
    if (member) return NextResponse.json(member)
    return NextResponse.json({ error: "Household member not found" }, { status: 404 })
  } catch (error) {
    console.error("Prisma household-member patch failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 },
    )
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const access = await requireManagementCapabilityAccess(["access.edit"])
  if (!access.ok) return access.response

  const { id } = await context.params
  const body = await req.json().catch(() => ({}))

  try {
    const ok = await deleteHouseholdMemberPrisma(
      id,
      access.identity.userId,
      typeof body.reason === "string" ? body.reason : null,
    )
    if (ok) return NextResponse.json({ ok: true })
    return NextResponse.json({ error: "Household member not found" }, { status: 404 })
  } catch (error) {
    console.error("Prisma household-member delete failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 },
    )
  }
}

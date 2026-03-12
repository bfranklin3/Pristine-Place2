import { NextRequest, NextResponse } from "next/server"
import { requireApprovedPortalApiAccess } from "@/lib/auth/portal-api"
import {
  getClubhouseRentalRequestForResident,
  updateClubhouseRentalRequestForResident,
} from "@/lib/clubhouse-rental/repository"
import {
  normalizeClubhouseRentalFormData,
  validateClubhouseRentalFormData,
} from "@/lib/clubhouse-rental/form"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const access = await requireApprovedPortalApiAccess()
  if (!access.ok) return access.response

  const { id } = await ctx.params

  try {
    const request = await getClubhouseRentalRequestForResident(access.identity.clerkUserId, id)
    if (!request) {
      return NextResponse.json({ error: "Clubhouse rental request not found." }, { status: 404 })
    }

    return NextResponse.json({ request })
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to load clubhouse rental request", detail }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const access = await requireApprovedPortalApiAccess()
  if (!access.ok) return access.response

  const { id } = await ctx.params
  const body = (await req.json().catch(() => ({}))) as { formData?: unknown }
  const formData = normalizeClubhouseRentalFormData(body.formData)
  const errors = validateClubhouseRentalFormData(formData)

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Invalid clubhouse rental request payload", validationErrors: errors },
      { status: 400 },
    )
  }

  try {
    const result = await updateClubhouseRentalRequestForResident({
      clerkUserId: access.identity.clerkUserId,
      requestId: id,
      formPatch: formData,
    })

    if (result.kind === "not_found") {
      return NextResponse.json({ error: "Clubhouse rental request not found." }, { status: 404 })
    }
    if (result.kind === "invalid_state") {
      return NextResponse.json(
        { error: "Clubhouse rental request cannot be updated in its current status.", status: result.status },
        { status: 409 },
      )
    }
    if (result.kind === "validation_error") {
      return NextResponse.json(
        { error: "Invalid clubhouse rental request payload", validationErrors: result.errors },
        { status: 400 },
      )
    }

    return NextResponse.json({ request: result.request })
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to update clubhouse rental request", detail }, { status: 500 })
  }
}

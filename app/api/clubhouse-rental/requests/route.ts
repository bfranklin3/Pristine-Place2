import { NextRequest, NextResponse } from "next/server"
import { requireApprovedPortalApiAccess } from "@/lib/auth/portal-api"
import {
  createClubhouseRentalRequestForResident,
  listClubhouseRentalRequestsForResident,
} from "@/lib/clubhouse-rental/repository"
import {
  normalizeClubhouseRentalFormData,
  validateClubhouseRentalFormData,
} from "@/lib/clubhouse-rental/form"
import { sendClubhouseRentalSubmittedNotifications } from "@/lib/email/clubhouse-rental-notifications"

export async function GET() {
  const access = await requireApprovedPortalApiAccess()
  if (!access.ok) return access.response

  try {
    const requests = await listClubhouseRentalRequestsForResident(access.identity.clerkUserId)
    return NextResponse.json({ requests })
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to load clubhouse rental requests", detail }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const access = await requireApprovedPortalApiAccess()
  if (!access.ok) return access.response

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
    const request = await createClubhouseRentalRequestForResident({
      clerkUserId: access.identity.clerkUserId,
      formData,
    })
    const notificationResult = await sendClubhouseRentalSubmittedNotifications({
      requestId: request.id,
      requestNumber: request.requestNumber,
      residentName: request.residentName,
      residentEmail: request.residentEmail,
      residentAddress: request.residentAddress,
      eventType: request.eventType,
      reservationDate: request.reservationDate,
      reservationStartLabel: request.reservationStartLabel,
      reservationEndLabel: request.reservationEndLabel,
    })
    return NextResponse.json({ request, notificationResult }, { status: 201 })
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to create clubhouse rental request", detail }, { status: 500 })
  }
}

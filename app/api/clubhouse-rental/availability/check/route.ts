import { NextRequest, NextResponse } from "next/server"
import { requireApprovedPortalApiAccess } from "@/lib/auth/portal-api"
import {
  normalizeClubhouseRentalFormData,
  validateClubhouseRentalFormData,
} from "@/lib/clubhouse-rental/form"
import { getClubhouseAvailabilityConflicts } from "@/lib/clubhouse-rental/availability"

export async function POST(req: NextRequest) {
  const access = await requireApprovedPortalApiAccess()
  if (!access.ok) return access.response

  const body = (await req.json().catch(() => ({}))) as {
    formData?: unknown
    excludeRequestId?: string | null
  }
  const formData = normalizeClubhouseRentalFormData(body.formData)
  const validationErrors = validateClubhouseRentalFormData(formData).filter((message) => {
    return (
      message === "Reservation date is required." ||
      message === "Start time is required." ||
      message === "End time is required."
    )
  })

  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: "Availability check requires reservation date and time.", validationErrors },
      { status: 400 },
    )
  }

  try {
    const conflicts = await getClubhouseAvailabilityConflicts({
      reservationDate: formData.reservationDate,
      startLabel: formData.startTime,
      endLabel: formData.endTime,
      requestedSpace: formData.requestedSpace,
      excludeRentalRequestId: body.excludeRequestId || null,
    })

    return NextResponse.json(conflicts)
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to check clubhouse availability", detail }, { status: 500 })
  }
}

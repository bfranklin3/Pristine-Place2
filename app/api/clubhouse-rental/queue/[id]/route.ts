import { NextRequest, NextResponse } from "next/server"
import { requireManagementApiAccess } from "@/lib/auth/portal-management-api"
import {
  approveClubhouseRentalRequest,
  getClubhouseRentalRequestForManagement,
  rejectClubhouseRentalRequest,
  requestMoreInfoForClubhouseRentalRequest,
} from "@/lib/clubhouse-rental/repository"
import { getClubhouseAvailabilityConflicts } from "@/lib/clubhouse-rental/availability"
import {
  sendClubhouseRentalFinalDecisionNotification,
  sendClubhouseRentalMoreInfoNotification,
} from "@/lib/email/clubhouse-rental-notifications"

type QueueAction = "request_more_info" | "approve" | "reject"

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireManagementApiAccess(["admin", "board_of_directors", "clubhouse_maintenance"])
  if (!access.ok) return access.response

  const { id } = await ctx.params

  try {
    const request = await getClubhouseRentalRequestForManagement(id)
    if (!request) {
      return NextResponse.json({ error: "Clubhouse rental request not found" }, { status: 404 })
    }
    const conflicts = await getClubhouseAvailabilityConflicts({
      reservationDate: request.formData.reservationDate,
      startLabel: request.formData.startTime,
      endLabel: request.formData.endTime,
      requestedSpace: request.formData.requestedSpace,
      excludeRentalRequestId: request.id,
    })
    return NextResponse.json({ request, conflicts })
  } catch (error) {
    console.error("Clubhouse rental queue detail failed:", error)
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to load clubhouse rental request", detail }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireManagementApiAccess(["admin", "board_of_directors", "clubhouse_maintenance"])
  if (!access.ok) return access.response

  const { id } = await ctx.params
  const body = (await req.json().catch(() => ({}))) as {
    action?: QueueAction
    note?: string
  }

  if (!body.action) {
    return NextResponse.json({ error: "action is required." }, { status: 400 })
  }

  try {
    let result:
      | Awaited<ReturnType<typeof requestMoreInfoForClubhouseRentalRequest>>
      | Awaited<ReturnType<typeof approveClubhouseRentalRequest>>
      | Awaited<ReturnType<typeof rejectClubhouseRentalRequest>>
    let notificationResult: unknown = undefined

    if (body.action === "request_more_info") {
      result = await requestMoreInfoForClubhouseRentalRequest({
        requestId: id,
        actorUserId: access.identity.clerkUserId,
        note: body.note || "",
      })
      if (result.kind === "ok") {
        notificationResult = await sendClubhouseRentalMoreInfoNotification({
          requestId: result.request.id,
          requestNumber: result.request.requestNumber,
          residentName: result.request.residentName,
          residentEmail: result.request.residentEmail,
          residentAddress: result.request.residentAddress,
          eventType: result.request.eventType,
          reservationDate: result.request.reservationDate,
          reservationStartLabel: result.request.reservationStartLabel,
          reservationEndLabel: result.request.reservationEndLabel,
          residentActionNote: result.request.residentActionNote,
        })
      }
    } else if (body.action === "approve") {
      result = await approveClubhouseRentalRequest({
        requestId: id,
        actorUserId: access.identity.clerkUserId,
        note: body.note,
      })
      if (result.kind === "ok") {
        notificationResult = await sendClubhouseRentalFinalDecisionNotification({
          requestId: result.request.id,
          requestNumber: result.request.requestNumber,
          residentName: result.request.residentName,
          residentEmail: result.request.residentEmail,
          residentAddress: result.request.residentAddress,
          eventType: result.request.eventType,
          reservationDate: result.request.reservationDate,
          reservationStartLabel: result.request.reservationStartLabel,
          reservationEndLabel: result.request.reservationEndLabel,
          decisionNote: result.request.decisionNote,
          decision: "approve",
        })
      }
    } else {
      result = await rejectClubhouseRentalRequest({
        requestId: id,
        actorUserId: access.identity.clerkUserId,
        note: body.note || "",
      })
      if (result.kind === "ok") {
        notificationResult = await sendClubhouseRentalFinalDecisionNotification({
          requestId: result.request.id,
          requestNumber: result.request.requestNumber,
          residentName: result.request.residentName,
          residentEmail: result.request.residentEmail,
          residentAddress: result.request.residentAddress,
          eventType: result.request.eventType,
          reservationDate: result.request.reservationDate,
          reservationStartLabel: result.request.reservationStartLabel,
          reservationEndLabel: result.request.reservationEndLabel,
          decisionNote: result.request.decisionNote,
          decision: "reject",
        })
      }
    }

    if (result.kind === "not_found") {
      return NextResponse.json({ error: "Clubhouse rental request not found." }, { status: 404 })
    }
    if (result.kind === "invalid_state") {
      return NextResponse.json(
        { error: "Clubhouse rental request cannot be updated from its current status.", status: result.status },
        { status: 409 },
      )
    }
    if (result.kind === "validation_error") {
      return NextResponse.json(
        { error: "Invalid clubhouse rental action.", validationErrors: result.errors },
        { status: 400 },
      )
    }

    return NextResponse.json({ request: result.request, notificationResult })
  } catch (error) {
    console.error("Clubhouse rental queue mutation failed:", error)
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to update clubhouse rental request", detail }, { status: 500 })
  }
}

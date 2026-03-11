import { NextRequest, NextResponse } from "next/server"
import { requireApprovedPortalApiAccess } from "@/lib/auth/portal-api"
import { resubmitWorkflowRequestForResident } from "@/lib/acc-workflow/repository"
import { sendAccWorkflowResubmittedNotification } from "@/lib/email/acc-workflow-notifications"

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireApprovedPortalApiAccess()
  if (!access.ok) return access.response

  const { id } = await ctx.params

  try {
    const result = await resubmitWorkflowRequestForResident({
      clerkUserId: access.identity.clerkUserId,
      requestId: id,
    })

    if (result.kind === "not_found") {
      return NextResponse.json({ error: "ACC request not found" }, { status: 404 })
    }

    if (result.kind === "invalid_state") {
      return NextResponse.json(
        { error: "ACC request cannot be resubmitted in its current status", status: result.status },
        { status: 409 },
      )
    }

    if (result.kind === "validation_error") {
      return NextResponse.json(
        { error: "ACC request is missing required information", validationErrors: result.errors },
        { status: 400 },
      )
    }

    const notificationResult = await sendAccWorkflowResubmittedNotification({
      requestId: result.request.id,
      requestNumber: result.request.requestNumber,
      title: result.request.title,
      residentName: result.request.residentName,
      residentEmail: result.request.residentEmail,
      residentAddress: result.request.residentAddress,
    })

    return NextResponse.json({ request: result.request, notificationResult })
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to resubmit ACC request", detail }, { status: 500 })
  }
}

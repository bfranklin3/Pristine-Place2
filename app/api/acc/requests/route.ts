import { NextRequest, NextResponse } from "next/server"
import { requireApprovedPortalApiAccess } from "@/lib/auth/portal-api"
import {
  createWorkflowRequestForResident,
  listWorkflowRequestsForResident,
  normalizeAccWorkflowFormData,
  validateAccWorkflowFormData,
} from "@/lib/acc-workflow/repository"
import { sendAccWorkflowSubmittedNotifications } from "@/lib/email/acc-workflow-notifications"

export async function GET() {
  const access = await requireApprovedPortalApiAccess()
  if (!access.ok) return access.response

  try {
    const requests = await listWorkflowRequestsForResident(access.identity.clerkUserId)
    return NextResponse.json({ requests })
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to load ACC requests", detail }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const access = await requireApprovedPortalApiAccess()
  if (!access.ok) return access.response

  const body = (await req.json().catch(() => ({}))) as { formData?: unknown }
  const formData = normalizeAccWorkflowFormData(body.formData)
  const errors = validateAccWorkflowFormData(formData)

  if (errors.length > 0) {
    return NextResponse.json({ error: "Invalid ACC request payload", validationErrors: errors }, { status: 400 })
  }

  try {
    const request = await createWorkflowRequestForResident({
      clerkUserId: access.identity.clerkUserId,
      formData,
    })
    const notificationResult = await sendAccWorkflowSubmittedNotifications({
      requestId: request.id,
      requestNumber: request.requestNumber,
      title: request.title,
      residentName: request.residentName,
      residentEmail: request.residentEmail,
      residentAddress: request.residentAddress,
    })

    return NextResponse.json({ request, notificationResult }, { status: 201 })
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to create ACC request", detail }, { status: 500 })
  }
}

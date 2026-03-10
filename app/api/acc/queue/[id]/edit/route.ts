import { NextRequest, NextResponse } from "next/server"
import { getAccWorkflowActorContext } from "@/lib/acc-workflow/actors"
import { updateWorkflowRequestForManagement } from "@/lib/acc-workflow/repository"
import { requireManagementCapabilityAccess } from "@/lib/auth/portal-management-api"
import { getPortalSession } from "@/lib/auth/portal-session"

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireManagementCapabilityAccess(["acc.view"])
  if (!access.ok) return access.response

  const { user } = await getPortalSession()
  const actor = getAccWorkflowActorContext(user)
  if (!actor.canControlWorkflow) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await ctx.params
  const body = (await req.json().catch(() => ({}))) as { formData?: unknown }

  try {
    const result = await updateWorkflowRequestForManagement({
      requestId: id,
      actorUserId: access.identity.clerkUserId,
      actorRole: actor.actorRole,
      formPatch: body.formData && typeof body.formData === "object" ? (body.formData as Record<string, unknown>) : {},
    })

    if (result.kind === "not_found") {
      return NextResponse.json({ error: "ACC request not found." }, { status: 404 })
    }
    if (result.kind === "invalid_state") {
      return NextResponse.json({ error: "ACC request is not editable in the current status.", status: result.status }, { status: 409 })
    }
    if (result.kind === "validation_error") {
      return NextResponse.json({ error: "Invalid ACC request payload.", validationErrors: result.errors }, { status: 400 })
    }

    return NextResponse.json({ request: result.request })
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to update ACC request", detail }, { status: 500 })
  }
}

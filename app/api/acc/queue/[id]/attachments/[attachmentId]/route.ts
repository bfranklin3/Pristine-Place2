import { NextRequest, NextResponse } from "next/server"
import { getAccWorkflowActorContext } from "@/lib/acc-workflow/actors"
import { deleteWorkflowAttachmentForManagement } from "@/lib/acc-workflow/repository"
import { requireManagementCapabilityAccess } from "@/lib/auth/portal-management-api"
import { getPortalSession } from "@/lib/auth/portal-session"

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const access = await requireManagementCapabilityAccess(["acc.view"])
  if (!access.ok) return access.response

  const { user } = await getPortalSession()
  const actor = getAccWorkflowActorContext(user)
  if (!actor.canControlWorkflow) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id, attachmentId } = await ctx.params

  try {
    const result = await deleteWorkflowAttachmentForManagement({
      requestId: id,
      attachmentId,
      actorUserId: access.identity.clerkUserId,
      actorRole: actor.actorRole,
    })

    if (result.kind === "not_found") {
      return NextResponse.json({ error: "Attachment not found." }, { status: 404 })
    }
    if (result.kind === "invalid_state") {
      return NextResponse.json({ error: "Attachments cannot be updated in the current request status.", status: result.status }, { status: 409 })
    }

    return NextResponse.json({ request: result.request })
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to delete ACC attachment", detail }, { status: 500 })
  }
}

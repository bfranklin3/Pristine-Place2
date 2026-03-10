import { NextRequest, NextResponse } from "next/server"
import { requireApprovedPortalApiAccess } from "@/lib/auth/portal-api"
import { deleteWorkflowAttachmentForResident } from "@/lib/acc-workflow/repository"

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const access = await requireApprovedPortalApiAccess()
  if (!access.ok) return access.response

  const { id, attachmentId } = await ctx.params

  try {
    const result = await deleteWorkflowAttachmentForResident({
      requestId: id,
      attachmentId,
      clerkUserId: access.identity.clerkUserId,
    })

    if (result.kind === "not_found") {
      return NextResponse.json({ error: "Attachment not found." }, { status: 404 })
    }
    if (result.kind === "not_allowed") {
      return NextResponse.json({ error: "This attachment cannot be removed by the resident." }, { status: 403 })
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

import { NextRequest, NextResponse } from "next/server"
import { getAccWorkflowActorContext } from "@/lib/acc-workflow/actors"
import { uploadAccWorkflowFileToWordPress, validateAccWorkflowUploadFiles } from "@/lib/acc-workflow/attachment-storage"
import { addAttachmentsToWorkflowRequestForManagement } from "@/lib/acc-workflow/repository"
import { requireManagementCapabilityAccess } from "@/lib/auth/portal-management-api"
import { getPortalSession } from "@/lib/auth/portal-session"

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireManagementCapabilityAccess(["acc.view"])
  if (!access.ok) return access.response

  const { user } = await getPortalSession()
  const actor = getAccWorkflowActorContext(user)
  if (!actor.canControlWorkflow) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await ctx.params

  try {
    const form = await req.formData()
    const files = form.getAll("files").filter((value): value is File => value instanceof File && value.size > 0)
    const scopeRaw = String(form.get("scope") || "internal").trim().toLowerCase()
    const scope = scopeRaw === "resident" ? "resident" : "internal"

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 })
    }

    const validationErrors = validateAccWorkflowUploadFiles(files)
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: "Invalid attachment payload.", validationErrors }, { status: 400 })
    }

    const uploaded = []
    for (const file of files) {
      uploaded.push(await uploadAccWorkflowFileToWordPress(file))
    }

    const result = await addAttachmentsToWorkflowRequestForManagement({
      requestId: id,
      actorUserId: access.identity.clerkUserId,
      actorRole: actor.actorRole,
      attachments: uploaded,
      scope,
    })

    if (result.kind === "not_found") {
      return NextResponse.json({ error: "ACC request not found." }, { status: 404 })
    }
    if (result.kind === "invalid_state") {
      return NextResponse.json({ error: "Attachments cannot be updated in the current request status.", status: result.status }, { status: 409 })
    }
    if (result.kind === "validation_error") {
      return NextResponse.json({ error: "Invalid attachment payload.", validationErrors: result.errors }, { status: 400 })
    }

    return NextResponse.json({ request: result.request })
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to upload ACC attachments", detail }, { status: 500 })
  }
}

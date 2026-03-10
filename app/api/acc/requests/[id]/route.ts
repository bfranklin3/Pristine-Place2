import { NextRequest, NextResponse } from "next/server"
import { requireApprovedPortalApiAccess } from "@/lib/auth/portal-api"
import {
  getWorkflowRequestForResident,
  updateWorkflowRequestForResident,
} from "@/lib/acc-workflow/repository"

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireApprovedPortalApiAccess()
  if (!access.ok) return access.response

  const { id } = await ctx.params

  try {
    const request = await getWorkflowRequestForResident(access.identity.clerkUserId, id)
    if (!request) return NextResponse.json({ error: "ACC request not found" }, { status: 404 })
    return NextResponse.json({ request })
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to load ACC request", detail }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireApprovedPortalApiAccess()
  if (!access.ok) return access.response

  const { id } = await ctx.params
  const body = (await req.json().catch(() => ({}))) as { formData?: unknown }

  try {
    const result = await updateWorkflowRequestForResident({
      clerkUserId: access.identity.clerkUserId,
      requestId: id,
      formPatch: body.formData && typeof body.formData === "object" ? (body.formData as Record<string, unknown>) : {},
    })

    if (result.kind === "not_found") {
      return NextResponse.json({ error: "ACC request not found" }, { status: 404 })
    }

    if (result.kind === "invalid_state") {
      return NextResponse.json(
        { error: "ACC request is not editable in its current status", status: result.status },
        { status: 409 },
      )
    }

    if (result.kind === "validation_error") {
      return NextResponse.json(
        { error: "Invalid ACC request payload", validationErrors: result.errors },
        { status: 400 },
      )
    }

    return NextResponse.json({ request: result.request })
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to update ACC request", detail }, { status: 500 })
  }
}

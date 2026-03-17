import { NextRequest, NextResponse } from "next/server"
import { requireApprovedPortalApiAccess } from "@/lib/auth/portal-api"
import {
  type AccSubmissionNotifyKind,
  sendSubmissionNotificationsForResidentRequest,
} from "@/lib/acc-workflow/submission-notifications"

function parseKind(value: FormDataEntryValue | null): AccSubmissionNotifyKind {
  return value === "resubmitted" ? "resubmitted" : "submitted"
}

function buildRedirectUrl(req: NextRequest, requestId: string, params: Record<string, string>) {
  const url = new URL(`/resident-portal/acc/requests/${requestId}`, req.url)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return url
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireApprovedPortalApiAccess()
  if (!access.ok) return access.response

  const { id } = await ctx.params
  const formData = await req.formData().catch(() => new FormData())
  const kind = parseKind(formData.get("kind"))

  try {
    const result = await sendSubmissionNotificationsForResidentRequest({
      clerkUserId: access.identity.clerkUserId,
      requestId: id,
      kind,
    })

    if (result.kind === "not_found") {
      return NextResponse.redirect(buildRedirectUrl(req, id, { email: "issue", kind }), { status: 303 })
    }

    if (result.deliverySummary.residentDelivered && result.deliverySummary.staffDelivered) {
      return NextResponse.redirect(buildRedirectUrl(req, id, { email: "resent" }), { status: 303 })
    }

    return NextResponse.redirect(buildRedirectUrl(req, id, { email: "issue", kind }), { status: 303 })
  } catch (error) {
    console.error("ACC retry-email route failed:", error)
    return NextResponse.redirect(buildRedirectUrl(req, id, { email: "issue", kind }), { status: 303 })
  }
}

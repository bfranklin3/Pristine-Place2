import { NextRequest, NextResponse } from "next/server"
import { requireApprovedPortalApiAccess } from "@/lib/auth/portal-api"
import { sendSubmissionNotificationsForResidentRequest } from "@/lib/acc-workflow/submission-notifications"

type NotifyKind = "submitted" | "resubmitted"

function parseKind(value: unknown): NotifyKind | null {
  return value === "submitted" || value === "resubmitted" ? value : null
}

export const runtime = "nodejs"

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireApprovedPortalApiAccess()
  if (!access.ok) return access.response

  const { id } = await ctx.params
  const body = (await req.json().catch(() => ({}))) as { kind?: NotifyKind }
  const kind = parseKind(body.kind)

  if (!kind) {
    return NextResponse.json({ error: "kind must be submitted or resubmitted." }, { status: 400 })
  }

  try {
    const result = await sendSubmissionNotificationsForResidentRequest({
      clerkUserId: access.identity.clerkUserId,
      requestId: id,
      kind,
    })

    if (result.kind === "not_found") {
      return NextResponse.json({ error: "ACC request not found." }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      pdfAttached: Boolean(result.pdfAttachment?.length),
      pdfFilename: result.pdfAttachment?.[0]?.filename || null,
      deliverySummary: result.deliverySummary,
      notificationResult: result.notificationResult,
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to send ACC submission notification", detail }, { status: 500 })
  }
}

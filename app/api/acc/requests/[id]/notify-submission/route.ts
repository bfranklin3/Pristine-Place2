import { NextRequest, NextResponse } from "next/server"
import { getWorkflowRequestForResident } from "@/lib/acc-workflow/repository"
import { requireApprovedPortalApiAccess } from "@/lib/auth/portal-api"
import { generateAccSubmittedFormPdf } from "@/lib/acc-submitted-form-pdf"
import {
  sendAccWorkflowResubmittedNotification,
  sendAccWorkflowSubmittedNotifications,
} from "@/lib/email/acc-workflow-notifications"

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
    const request = await getWorkflowRequestForResident(access.identity.clerkUserId, id)
    if (!request) {
      return NextResponse.json({ error: "ACC request not found." }, { status: 404 })
    }

    let pdfAttachment: { filename: string; content: Buffer; contentType: string }[] | undefined
    try {
      const generated = await generateAccSubmittedFormPdf({
        source: "native",
        id: request.id,
        viewerUserId: access.identity.clerkUserId,
        viewMode: "full",
      })

      if (generated) {
        pdfAttachment = [
          {
            filename: generated.filename,
            content: generated.pdf,
            contentType: "application/pdf",
          },
        ]
      }
    } catch (error) {
      console.error("ACC submitted-form PDF attachment generation failed:", error)
    }

    const payload = {
      requestId: request.id,
      requestNumber: request.requestNumber,
      permitNumber: request.permitNumber,
      title: request.title,
      residentName: request.residentName,
      residentEmail: request.residentEmail,
      residentAddress: request.residentAddress,
    }

    const notificationResult =
      kind === "submitted"
        ? await sendAccWorkflowSubmittedNotifications(payload, { chairAttachments: pdfAttachment })
        : await sendAccWorkflowResubmittedNotification(payload, { attachments: pdfAttachment })

    return NextResponse.json({
      ok: true,
      pdfAttached: Boolean(pdfAttachment?.length),
      pdfFilename: pdfAttachment?.[0]?.filename || null,
      notificationResult,
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to send ACC submission notification", detail }, { status: 500 })
  }
}

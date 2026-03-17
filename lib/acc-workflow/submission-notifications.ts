import { generateAccSubmittedFormPdf } from "@/lib/acc-submitted-form-pdf"
import {
  sendAccWorkflowResubmittedNotification,
  sendAccWorkflowSubmittedNotifications,
} from "@/lib/email/acc-workflow-notifications"
import { getWorkflowRequestForResident } from "@/lib/acc-workflow/repository"

export type AccSubmissionNotifyKind = "submitted" | "resubmitted"

export async function sendSubmissionNotificationsForResidentRequest(input: {
  clerkUserId: string
  requestId: string
  kind: AccSubmissionNotifyKind
}) {
  const request = await getWorkflowRequestForResident(input.clerkUserId, input.requestId)
  if (!request) {
    return { kind: "not_found" as const }
  }

  let pdfAttachment: { filename: string; content: Buffer; contentType: string }[] | undefined
  try {
    const generated = await generateAccSubmittedFormPdf({
      source: "native",
      id: request.id,
      viewerUserId: input.clerkUserId,
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
    input.kind === "submitted"
      ? await sendAccWorkflowSubmittedNotifications(payload, { chairAttachments: pdfAttachment })
      : await sendAccWorkflowResubmittedNotification(payload, { attachments: pdfAttachment })

  const deliverySummary =
    input.kind === "submitted"
      ? {
          residentDelivered: Boolean(notificationResult.residentResult?.delivered),
          staffDelivered: Boolean(notificationResult.chairResult?.delivered),
        }
      : {
          residentDelivered: true,
          staffDelivered: Boolean(notificationResult.delivered),
        }

  return {
    kind: "ok" as const,
    request,
    pdfAttachment,
    deliverySummary,
    notificationResult,
  }
}

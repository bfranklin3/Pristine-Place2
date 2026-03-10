import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { siteConfig } from "@/lib/site-config"
import { requireApprovedPortalAccess } from "@/lib/auth/portal-access"
import { AccSubmitPageClient } from "@/components/portal/acc-submit-page-client"
import { getWorkflowRequestForResident } from "@/lib/acc-workflow/repository"
import { getPortalSession } from "@/lib/auth/portal-session"

export const metadata: Metadata = {
  title: `Update ACC Request | ${siteConfig.name} Resident Portal`,
  description: "Update and resubmit an ACC request after additional information has been requested.",
}

export default async function EditAccRequestPage({ params }: { params: Promise<{ id: string }> }) {
  await requireApprovedPortalAccess()
  const { userId } = await getPortalSession()
  const { id } = await params

  if (!userId) notFound()

  const request = await getWorkflowRequestForResident(userId, id)
  if (!request || !request.canEdit || !request.formData) notFound()

  return (
    <AccSubmitPageClient
      mode="edit"
      requestId={request.id}
      initialFormData={request.formData}
      residentActionNote={request.residentActionNote}
    />
  )
}

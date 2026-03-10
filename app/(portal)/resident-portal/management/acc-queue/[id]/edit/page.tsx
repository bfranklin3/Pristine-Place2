import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { siteConfig } from "@/lib/site-config"
import { AccSubmitPageClient } from "@/components/portal/acc-submit-page-client"
import { getWorkflowRequestForManagement } from "@/lib/acc-workflow/repository"
import { requirePortalCapabilityPageAccess } from "@/lib/auth/portal-admin"
import { getPortalSession } from "@/lib/auth/portal-session"

export const metadata: Metadata = {
  title: `Edit ACC Workflow Request | ${siteConfig.name} Resident Portal`,
  description: "Review and edit a native ACC workflow request during initial review.",
}

export default async function ManagementAccRequestEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePortalCapabilityPageAccess(["acc.workflow"], "/resident-portal/management/acc-queue")
  const { userId } = await getPortalSession()
  const { id } = await params

  if (!userId) notFound()

  const request = await getWorkflowRequestForManagement({
    requestId: id,
    viewerUserId: userId,
  })

  if (!request || request.status !== "initial_review") {
    notFound()
  }

  return (
    <AccSubmitPageClient
      mode="management-edit"
      requestId={request.id}
      initialFormData={request.formData}
      backHref="/resident-portal/management/acc-queue"
    />
  )
}

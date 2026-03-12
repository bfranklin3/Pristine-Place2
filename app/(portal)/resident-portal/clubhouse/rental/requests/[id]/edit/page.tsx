import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { siteConfig } from "@/lib/site-config"
import { requireApprovedPortalAccess } from "@/lib/auth/portal-access"
import { getPortalSession } from "@/lib/auth/portal-session"
import { ClubhouseRentalOnlineForm } from "@/components/portal/clubhouse-rental-online-form"
import { getClubhouseRentalRequestForResident } from "@/lib/clubhouse-rental/repository"

export const metadata: Metadata = {
  title: `Update Clubhouse Rental Request | ${siteConfig.name} Resident Portal`,
  description: "Update and resubmit a clubhouse rental request after additional information has been requested.",
}

export default async function EditClubhouseRentalRequestPage({ params }: { params: Promise<{ id: string }> }) {
  await requireApprovedPortalAccess()
  const { userId } = await getPortalSession()
  const { id } = await params

  if (!userId) notFound()

  const request = await getClubhouseRentalRequestForResident(userId, id)
  if (!request || !request.canEdit || !request.formData) notFound()

  return (
    <>
      <section className="hero-section" style={{ background: "var(--pp-navy-dark)" }}>
        <div
          className="hero-overlay"
          style={{ background: "linear-gradient(135deg, #1b2e1b 0%, #3A5A40 60%, #2c4a32 100%)" }}
        />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <h1 className="hero-title">Update Clubhouse Rental Request</h1>
          <p className="hero-subtitle" style={{ maxWidth: "54ch" }}>
            Update the requested information below and resubmit the same clubhouse rental request for review.
          </p>
        </div>
      </section>

      <ClubhouseRentalOnlineForm
        mode="edit"
        requestId={request.id}
        initialFormData={request.formData}
        residentActionNote={request.residentActionNote}
        existingAttachments={request.attachments}
      />
    </>
  )
}

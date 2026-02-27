import { normalizeCommitteeSlugs } from "@/lib/portal/committees"

export type PortalUserStatus = "not_submitted" | "pending" | "approved" | "rejected"

export interface PortalRegistrationMetadata {
  firstName?: string
  lastName?: string
  homeAddress?: string
  username?: string | null
  emailAddress?: string
  submittedAt?: string
  status?: "pending" | "approved" | "rejected"
  approvedAt?: string
  approvedBy?: string
  rejectedAt?: string
  rejectedBy?: string
}

export interface PortalUserRow {
  userId: string
  firstName: string
  lastName: string
  fullName: string
  homeAddress: string
  username: string
  emailAddress: string
  status: PortalUserStatus
  submittedAt: string
  reviewedAt: string
  reviewedBy: string
  portalAdmin: boolean
  committees: string[]
  committeesUpdatedAt: string
  committeesUpdatedBy: string
}

function getPrimaryEmail(user: any) {
  return (
    user.emailAddresses?.find((email: any) => email.id === user.primaryEmailAddressId)?.emailAddress || ""
  )
}

export function normalizePortalUserStatus(
  registration: PortalRegistrationMetadata,
  portalApproved: boolean,
  portalRegistrationSubmitted: boolean,
): PortalUserStatus {
  if (registration.status === "approved" || portalApproved) return "approved"
  if (registration.status === "rejected") return "rejected"
  if (registration.status === "pending" || portalRegistrationSubmitted) return "pending"
  return "not_submitted"
}

export function toPortalUserRow(user: any): PortalUserRow {
  const publicMetadata = (user.publicMetadata || {}) as Record<string, unknown>
  const unsafeMetadata = (user.unsafeMetadata || {}) as Record<string, unknown>
  const registration = (unsafeMetadata.portalRegistration || {}) as PortalRegistrationMetadata
  const status = normalizePortalUserStatus(
    registration,
    publicMetadata.portalApproved === true,
    publicMetadata.portalRegistrationSubmitted === true,
  )

  const firstName = registration.firstName || user.firstName || ""
  const lastName = registration.lastName || user.lastName || ""
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim()

  const committees = normalizeCommitteeSlugs(publicMetadata.committees)

  return {
    userId: user.id,
    firstName,
    lastName,
    fullName,
    homeAddress: registration.homeAddress || "",
    username: registration.username || user.username || "",
    emailAddress: registration.emailAddress || getPrimaryEmail(user),
    status,
    submittedAt: registration.submittedAt || "",
    reviewedAt: (publicMetadata.portalRegistrationReviewedAt as string) || "",
    reviewedBy: (publicMetadata.portalRegistrationReviewedBy as string) || "",
    portalAdmin: publicMetadata.portalAdmin === true,
    committees,
    committeesUpdatedAt: (publicMetadata.committeesUpdatedAt as string) || "",
    committeesUpdatedBy: (publicMetadata.committeesUpdatedBy as string) || "",
  }
}

export function sortPortalRows(rows: PortalUserRow[]) {
  return [...rows].sort((a, b) => {
    const aTime = a.submittedAt || ""
    const bTime = b.submittedAt || ""
    if (aTime && bTime) return aTime < bTime ? 1 : -1
    if (aTime) return -1
    if (bTime) return 1
    return a.fullName.localeCompare(b.fullName)
  })
}

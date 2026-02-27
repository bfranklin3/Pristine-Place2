import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { normalizeCommitteeSlugs, type CommitteeSlug } from "@/lib/portal/committees"

export interface PortalAdminIdentity {
  userId: string
  email: string
  username: string
}

function parseEmailList(value?: string) {
  return (value || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

function parseUsernameList(value?: string) {
  return (value || "")
    .split(",")
    .map((username) => username.trim().toLowerCase())
    .filter(Boolean)
}

function getPrimaryEmail(user: Awaited<ReturnType<typeof currentUser>>) {
  if (!user) return ""
  return (
    user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress?.toLowerCase() || ""
  )
}

export function isPortalAdmin(user: Awaited<ReturnType<typeof currentUser>>) {
  const userEmail = getPrimaryEmail(user)
  const userUsername = (user?.username || "").toLowerCase()
  const adminEmails = parseEmailList(process.env.PORTAL_ADMIN_EMAILS)
  const approverEmails = parseEmailList(process.env.PORTAL_APPROVER_EMAILS)
  const adminUsernames = parseUsernameList(process.env.PORTAL_ADMIN_USERNAMES)
  const metadataAdmin = user?.publicMetadata?.portalAdmin === true

  return (
    metadataAdmin ||
    adminEmails.includes(userEmail) ||
    approverEmails.includes(userEmail) ||
    adminUsernames.includes(userUsername)
  )
}

export function getUserCommittees(user: Awaited<ReturnType<typeof currentUser>>): CommitteeSlug[] {
  return normalizeCommitteeSlugs(user?.publicMetadata?.committees)
}

export function hasCommittee(
  user: Awaited<ReturnType<typeof currentUser>>,
  committee: CommitteeSlug | "admin",
) {
  if (committee === "admin") return isPortalAdmin(user)
  return getUserCommittees(user).includes(committee)
}

export function hasAnyCommittee(
  user: Awaited<ReturnType<typeof currentUser>>,
  committees: Array<CommitteeSlug | "admin">,
) {
  return committees.some((committee) => hasCommittee(user, committee))
}

export async function requirePortalAdminPageAccess(redirectPath = "/resident-portal/management/resident-approvals") {
  const { userId } = await auth()

  if (!userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(redirectPath)}`)
  }

  const user = await currentUser()
  const admin = isPortalAdmin(user)
  const approved = user?.publicMetadata?.portalApproved === true

  if (!admin && !approved) {
    redirect("/portal-registration")
  }

  if (!admin) {
    redirect("/resident-portal")
  }
}

export async function requirePortalRolePageAccess(
  allowed: Array<CommitteeSlug | "admin">,
  redirectPath = "/resident-portal",
) {
  const { userId } = await auth()

  if (!userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(redirectPath)}`)
  }

  const user = await currentUser()
  const admin = isPortalAdmin(user)
  const approved = user?.publicMetadata?.portalApproved === true

  if (!admin && !approved) {
    redirect("/portal-registration")
  }

  if (!hasAnyCommittee(user, allowed)) {
    redirect("/resident-portal")
  }
}

export async function getPortalAdminIdentity(): Promise<PortalAdminIdentity | null> {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  const user = await currentUser()
  if (!isPortalAdmin(user)) {
    return null
  }

  return {
    userId,
    email: getPrimaryEmail(user),
    username: (user?.username || "").toLowerCase(),
  }
}

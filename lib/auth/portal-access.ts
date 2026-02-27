import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { isPortalAdmin } from "@/lib/auth/portal-admin"

export const RESIDENT_PORTAL_PATH = "/resident-portal"
export const PORTAL_REGISTRATION_PATH = "/portal-registration"

export async function requireApprovedPortalAccess() {
  const { userId } = await auth()

  if (!userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(RESIDENT_PORTAL_PATH)}`)
  }

  const user = await currentUser()
  const admin = isPortalAdmin(user)
  const isApproved = user?.publicMetadata?.portalApproved === true

  if (!isApproved && !admin) {
    redirect(PORTAL_REGISTRATION_PATH)
  }
}

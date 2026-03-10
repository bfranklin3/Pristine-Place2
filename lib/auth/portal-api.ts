import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { isPortalAdmin } from "@/lib/auth/portal-admin"

export interface PortalApiIdentity {
  clerkUserId: string
  email: string
}

export async function requireApprovedPortalApiAccess():
  Promise<{ ok: true; identity: PortalApiIdentity } | { ok: false; response: NextResponse }> {
  const { userId } = await auth()
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const user = await currentUser()
  const admin = isPortalAdmin(user)
  const isApproved = user?.publicMetadata?.portalApproved === true

  if (!isApproved && !admin) {
    return { ok: false, response: NextResponse.json({ error: "Portal access not approved" }, { status: 403 }) }
  }

  const email =
    user?.emailAddresses.find((item) => item.id === user.primaryEmailAddressId)?.emailAddress?.toLowerCase() || ""

  return {
    ok: true,
    identity: {
      clerkUserId: userId,
      email,
    },
  }
}

import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { getUserCommittees, hasAnyCommittee } from "@/lib/auth/portal-admin"
import type { CommitteeSlug } from "@/lib/portal/committees"

export interface AccessApiIdentity {
  userId: string
  clerkUserId: string
}

export async function requireManagementApiAccess(
  allowedRoles: Array<CommitteeSlug | "admin">,
): Promise<{ ok: true; identity: AccessApiIdentity } | { ok: false; response: NextResponse }> {
  const { userId } = await auth()
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const user = await currentUser()
  const isApproved = user?.publicMetadata?.portalApproved === true

  if (!isApproved && !hasAnyCommittee(user, ["admin"])) {
    return { ok: false, response: NextResponse.json({ error: "Portal access not approved" }, { status: 403 }) }
  }

  const committees = getUserCommittees(user)
  const isAllowed = allowedRoles.some((role) =>
    role === "admin" ? hasAnyCommittee(user, ["admin"]) : committees.includes(role),
  )

  if (!isAllowed) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { ok: true, identity: { userId, clerkUserId: userId } }
}


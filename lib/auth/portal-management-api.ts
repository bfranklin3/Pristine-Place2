import { NextResponse } from "next/server"
import { getUserCommittees, hasAnyCommittee } from "@/lib/auth/portal-admin"
import type { CommitteeSlug } from "@/lib/portal/committees"
import { hasCapability, type CapabilityKey } from "@/lib/auth/permissions"
import { getPortalSession } from "@/lib/auth/portal-session"

export interface AccessApiIdentity {
  userId: string
  clerkUserId: string
}

export async function requireManagementApiAccess(
  allowedRoles: Array<CommitteeSlug | "admin">,
): Promise<{ ok: true; identity: AccessApiIdentity } | { ok: false; response: NextResponse }> {
  const { userId, user } = await getPortalSession()
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

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

export async function requireManagementCapabilityAccess(
  requiredCapabilities: CapabilityKey[],
  mode: "all" | "any" = "all",
): Promise<{ ok: true; identity: AccessApiIdentity } | { ok: false; response: NextResponse }> {
  const { userId, user } = await getPortalSession()
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const isApproved = user?.publicMetadata?.portalApproved === true

  if (!isApproved && !hasAnyCommittee(user, ["admin"])) {
    return { ok: false, response: NextResponse.json({ error: "Portal access not approved" }, { status: 403 }) }
  }

  const decisions = requiredCapabilities.map((capability) => hasCapability(user, capability))
  const allowed =
    mode === "all"
      ? decisions.every(Boolean)
      : decisions.some(Boolean)

  if (!allowed) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { ok: true, identity: { userId, clerkUserId: userId } }
}

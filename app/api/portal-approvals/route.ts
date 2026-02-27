import { NextResponse } from "next/server"
import { clerkClient } from "@clerk/nextjs/server"
import { getPortalAdminIdentity } from "@/lib/auth/portal-admin"
import { sendPortalRegistrationDecisionEmail } from "@/lib/email/portal-registration-notifications"
import {
  type PortalRegistrationMetadata,
  sortPortalRows,
  toPortalUserRow,
} from "@/lib/portal/users"

type ApprovalAction = "approve" | "reject"

interface PortalApprovalRow {
  userId: string
  firstName: string
  lastName: string
  homeAddress: string
  username: string
  emailAddress: string
  submittedAt: string
  status: "pending" | "approved" | "rejected"
}

async function fetchAllPortalUsers() {
  const client = await clerkClient()
  const pageSize = 100
  let offset = 0
  const users: any[] = []

  while (true) {
    const page = await client.users.getUserList({ limit: pageSize, offset })
    users.push(...page.data)
    if (page.data.length < pageSize) break
    offset += pageSize
    if (offset >= 1000) break
  }

  return users
}

export async function GET(req: Request) {
  const admin = await getPortalAdminIdentity()
  if (!admin) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(req.url)
  const statusFilter = (url.searchParams.get("status") || "pending").toLowerCase()

  const allUsers = await fetchAllPortalUsers()
  const rows = sortPortalRows(allUsers.map(toPortalUserRow))
    .filter((row) => row.status !== "not_submitted")
    .filter((row) => (statusFilter === "all" ? true : row.status === statusFilter))
    .map((row): PortalApprovalRow => ({
      userId: row.userId,
      firstName: row.firstName,
      lastName: row.lastName,
      homeAddress: row.homeAddress,
      username: row.username,
      emailAddress: row.emailAddress,
      submittedAt: row.submittedAt,
      status: row.status as "pending" | "approved" | "rejected",
    }))

  return NextResponse.json({ success: true, rows })
}

export async function PATCH(req: Request) {
  const admin = await getPortalAdminIdentity()
  if (!admin) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const payload = (await req.json()) as { userId?: string; action?: ApprovalAction }
  const userId = (payload.userId || "").trim()
  const action = payload.action

  if (!userId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json(
      { success: false, error: "userId and valid action are required." },
      { status: 400 },
    )
  }

  const client = await clerkClient()
  const targetUser = await client.users.getUser(userId)
  const nowIso = new Date().toISOString()

  const currentPublicMetadata = (targetUser.publicMetadata || {}) as Record<string, unknown>
  const currentUnsafeMetadata = (targetUser.unsafeMetadata || {}) as Record<string, unknown>
  const currentRegistration = (currentUnsafeMetadata.portalRegistration || {}) as PortalRegistrationMetadata

  const status = action === "approve" ? "approved" : "rejected"
  const updatedRegistration: PortalRegistrationMetadata = {
    ...currentRegistration,
    status,
  }

  if (action === "approve") {
    updatedRegistration.approvedAt = nowIso
    updatedRegistration.approvedBy = admin.email || admin.username || admin.userId
  } else {
    updatedRegistration.rejectedAt = nowIso
    updatedRegistration.rejectedBy = admin.email || admin.username || admin.userId
  }

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...currentPublicMetadata,
      portalApproved: action === "approve",
      portalRegistrationSubmitted: true,
      portalRegistrationReviewedAt: nowIso,
      portalRegistrationReviewedBy: admin.email || admin.username || admin.userId,
    },
    unsafeMetadata: {
      ...currentUnsafeMetadata,
      portalRegistration: updatedRegistration,
    },
  })

  const emailResult = await sendPortalRegistrationDecisionEmail(action, targetUser, updatedRegistration)

  return NextResponse.json({
    success: true,
    warning: emailResult.warning,
  })
}

import { NextResponse } from "next/server"
import { clerkClient } from "@clerk/nextjs/server"
import { getPortalAdminIdentity } from "@/lib/auth/portal-admin"
import { sendPortalRegistrationDecisionEmail } from "@/lib/email/portal-registration-notifications"
import {
  type PortalRegistrationMetadata,
  type PortalUserStatus,
  sortPortalRows,
  toPortalUserRow,
} from "@/lib/portal/users"
import { normalizeCommitteeSlugs } from "@/lib/portal/committees"

type DirectoryAction =
  | "approve"
  | "reject"
  | "set_admin"
  | "unset_admin"
  | "set_committees"
  | "delete_user"
  | "reset_by_email"

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function safelyDeleteClerkUser(userId: string, actingAdminUserId: string) {
  if (userId === actingAdminUserId) {
    return { deleted: false, skippedSelf: true }
  }

  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const originalPrimaryEmail = user.emailAddresses.find(
    (email) => email.id === user.primaryEmailAddressId,
  )

  // Release primary identifiers before deletion so test accounts can be re-created.
  if (originalPrimaryEmail?.emailAddress) {
    const replacementDomain = process.env.PORTAL_DELETE_PLACEHOLDER_DOMAIN || "example.com"
    const replacementEmail = `deleted+${user.id.slice(-8)}-${Date.now()}@${replacementDomain}`
    const replacement = await client.emailAddresses.createEmailAddress({
      userId,
      emailAddress: replacementEmail,
      verified: true,
      primary: true,
    })

    await client.emailAddresses.updateEmailAddress(replacement.id, {
      primary: true,
      verified: true,
    })

    await client.emailAddresses.deleteEmailAddress(originalPrimaryEmail.id)
  }

  if (user.username) {
    await client.users.updateUser(userId, {
      username: `deleted_${Date.now()}_${user.id.slice(-6)}`,
    })
  }

  await client.users.deleteUser(userId)
  return { deleted: true, skippedSelf: false }
}

async function fetchAllUsers() {
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
  const status = (url.searchParams.get("status") || "all").toLowerCase() as PortalUserStatus | "all"
  const query = (url.searchParams.get("q") || "").trim().toLowerCase()

  const rows = sortPortalRows((await fetchAllUsers()).map(toPortalUserRow))
    .filter((row) => (status === "all" ? true : row.status === status))
    .filter((row) => {
      if (!query) return true
      return (
        row.fullName.toLowerCase().includes(query) ||
        row.emailAddress.toLowerCase().includes(query) ||
        row.username.toLowerCase().includes(query) ||
        row.homeAddress.toLowerCase().includes(query)
      )
    })

  return NextResponse.json({ success: true, rows })
}

export async function PATCH(req: Request) {
  try {
    const admin = await getPortalAdminIdentity()
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const payload = (await req.json()) as {
      userId?: string
      action?: DirectoryAction
      committees?: unknown
      emailAddress?: string
    }
    const userId = (payload.userId || "").trim()
    const action = payload.action
    const emailAddress = (payload.emailAddress || "").trim().toLowerCase()

    if (!action) {
      return NextResponse.json({ success: false, error: "action is required." }, { status: 400 })
    }

    if (action !== "reset_by_email" && !userId) {
      return NextResponse.json({ success: false, error: "userId is required." }, { status: 400 })
    }

    const validActions: DirectoryAction[] = [
      "approve",
      "reject",
      "set_admin",
      "unset_admin",
      "set_committees",
      "delete_user",
      "reset_by_email",
    ]
    if (!validActions.includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 })
    }

    const client = await clerkClient()

    if (action === "reset_by_email") {
      if (!emailAddress || !isValidEmail(emailAddress)) {
        return NextResponse.json(
          { success: false, error: "Provide a valid email address to reset." },
          { status: 400 },
        )
      }

      const users = await client.users.getUserList({
        limit: 50,
        emailAddress: [emailAddress],
      })

      if (!users.data.length) {
        return NextResponse.json({
          success: true,
          result: {
            emailAddress,
            found: 0,
            deleted: 0,
            skippedSelf: 0,
          },
          warning: "No Clerk users found for that email. If signup is still blocked, wait for Clerk verification cooldown and retry.",
        })
      }

      let deleted = 0
      let skippedSelf = 0
      for (const matchedUser of users.data) {
        const result = await safelyDeleteClerkUser(matchedUser.id, admin.userId)
        if (result.deleted) deleted += 1
        if (result.skippedSelf) skippedSelf += 1
      }

      return NextResponse.json({
        success: true,
        result: {
          emailAddress,
          found: users.data.length,
          deleted,
          skippedSelf,
        },
      })
    }

    if (action === "delete_user") {
      const result = await safelyDeleteClerkUser(userId, admin.userId)
      if (result.skippedSelf) {
        return NextResponse.json(
          { success: false, error: "You cannot delete the account currently signed in." },
          { status: 400 },
        )
      }
      return NextResponse.json({ success: true })
    }

    const user = await client.users.getUser(userId)
    const nowIso = new Date().toISOString()
    const actor = admin.email || admin.username || admin.userId

    const publicMetadata = (user.publicMetadata || {}) as Record<string, unknown>
    const unsafeMetadata = (user.unsafeMetadata || {}) as Record<string, unknown>
    const registration = (unsafeMetadata.portalRegistration || {}) as PortalRegistrationMetadata

    if (action === "set_admin" || action === "unset_admin") {
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...publicMetadata,
          portalAdmin: action === "set_admin",
        },
      })

      return NextResponse.json({ success: true })
    }

    if (action === "set_committees") {
      const committees = normalizeCommitteeSlugs(payload.committees)

      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...publicMetadata,
          committees,
          committeesUpdatedAt: nowIso,
          committeesUpdatedBy: actor,
        },
      })

      return NextResponse.json({ success: true })
    }

    const status = action === "approve" ? "approved" : "rejected"
    const updatedRegistration: PortalRegistrationMetadata = {
      ...registration,
      status,
    }

    if (action === "approve") {
      updatedRegistration.approvedAt = nowIso
      updatedRegistration.approvedBy = actor
    } else {
      updatedRegistration.rejectedAt = nowIso
      updatedRegistration.rejectedBy = actor
    }

    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...publicMetadata,
        portalApproved: action === "approve",
        portalRegistrationSubmitted: true,
        portalRegistrationReviewedAt: nowIso,
        portalRegistrationReviewedBy: actor,
      },
      unsafeMetadata: {
        ...unsafeMetadata,
        portalRegistration: updatedRegistration,
      },
    })

    const emailResult = await sendPortalRegistrationDecisionEmail(action, user, updatedRegistration)

    return NextResponse.json({
      success: true,
      warning: emailResult.warning,
    })
  } catch (error) {
    console.error("Portal user action error:", error)
    const message = error instanceof Error ? error.message : "Failed to process request."
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

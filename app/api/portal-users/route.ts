import { NextResponse } from "next/server"
import { clerkClient } from "@clerk/nextjs/server"
import { getPortalAdminIdentity } from "@/lib/auth/portal-admin"
import { sendPortalRegistrationDecisionEmail } from "@/lib/email/portal-registration-notifications"
import { sendEmail } from "@/lib/email/service"
import { getPasswordResetEmailFromSanity } from "@/lib/email/templates/password-reset-sanity"
import {
  type PortalRegistrationMetadata,
  type PortalUserRow,
  type PortalUserStatus,
  sortPortalRows,
  toPortalUserRow,
} from "@/lib/portal/users"
import { normalizeCommitteeChairSlugs, normalizeCommitteeSlugs } from "@/lib/portal/committees"
import { CAPABILITY_KEYS, normalizeCapabilityOverrides } from "@/lib/auth/capabilities"

type DirectoryAction =
  | "approve"
  | "reject"
  | "set_admin"
  | "unset_admin"
  | "set_committees"
  | "set_profile_name"
  | "set_capability_overrides"
  | "send_password_reset"
  | "delete_user"
  | "reset_by_email"
  | "cleanup_inactive_preview"
  | "cleanup_inactive_execute"

type InactiveRow = PortalUserRow & { inactiveDays: number | null }

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function parseStatusFilter(raw: string | null): Set<PortalUserStatus> {
  return new Set(
    (raw || "all")
      .toLowerCase()
      .split(",")
      .map((value) => value.trim())
      .filter(
        (value): value is PortalUserStatus =>
          value === "not_submitted" || value === "pending" || value === "approved" || value === "rejected",
      ),
  )
}

function buildInactiveRows(
  allRows: PortalUserRow[],
  {
    inactiveDays,
    includeAdmins,
    includeNever,
    statusFilter,
    excludeUserId,
  }: {
    inactiveDays: number
    includeAdmins: boolean
    includeNever: boolean
    statusFilter: Set<PortalUserStatus>
    excludeUserId?: string
  },
): InactiveRow[] {
  const now = Date.now()
  const msPerDay = 1000 * 60 * 60 * 24
  return allRows
    .filter((row) => (excludeUserId ? row.userId !== excludeUserId : true))
    .filter((row) => (includeAdmins ? true : !row.portalAdmin))
    .filter((row) => (statusFilter.size === 0 ? true : statusFilter.has(row.status)))
    .filter((row) => {
      if (!row.lastActiveAt) return includeNever
      const lastActiveMs = Date.parse(row.lastActiveAt)
      if (Number.isNaN(lastActiveMs)) return includeNever
      const daysInactive = (now - lastActiveMs) / msPerDay
      return daysInactive >= inactiveDays
    })
    .map((row) => {
      if (!row.lastActiveAt) return { ...row, inactiveDays: null as number | null }
      const lastActiveMs = Date.parse(row.lastActiveAt)
      if (Number.isNaN(lastActiveMs)) return { ...row, inactiveDays: null as number | null }
      return { ...row, inactiveDays: Math.max(0, Math.floor((now - lastActiveMs) / msPerDay)) }
    })
    .sort((a, b) => {
      const aValue = a.inactiveDays ?? Number.MAX_SAFE_INTEGER
      const bValue = b.inactiveDays ?? Number.MAX_SAFE_INTEGER
      return bValue - aValue
    })
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
  const report = (url.searchParams.get("report") || "").toLowerCase()

  const allRows = sortPortalRows((await fetchAllUsers()).map(toPortalUserRow))

  if (report === "inactive") {
    const inactiveDays = Math.max(1, Math.min(3650, Number(url.searchParams.get("inactive_days") || "180") || 180))
    const includeAdmins = url.searchParams.get("include_admins") === "true"
    const includeNever = url.searchParams.get("include_never") !== "false"
    const statusFilter = parseStatusFilter(url.searchParams.get("status_filter"))
    const rows = buildInactiveRows(allRows, {
      inactiveDays,
      includeAdmins,
      includeNever,
      statusFilter,
    })

    return NextResponse.json({
      success: true,
      report: "inactive",
      inactiveDays,
      includeAdmins,
      includeNever,
      total: rows.length,
      rows,
    })
  }

  const queryMatchedRows = allRows.filter((row) => {
    if (!query) return true
    return (
      row.fullName.toLowerCase().includes(query) ||
      row.emailAddress.toLowerCase().includes(query) ||
      row.username.toLowerCase().includes(query) ||
      row.homeAddress.toLowerCase().includes(query)
    )
  })

  const counts = {
    all: queryMatchedRows.length,
    not_submitted: queryMatchedRows.filter((row) => row.status === "not_submitted").length,
    pending: queryMatchedRows.filter((row) => row.status === "pending").length,
    approved: queryMatchedRows.filter((row) => row.status === "approved").length,
    rejected: queryMatchedRows.filter((row) => row.status === "rejected").length,
  }

  const rows = queryMatchedRows.filter((row) => (status === "all" ? true : row.status === status))

  return NextResponse.json({ success: true, rows, counts })
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
      firstName?: string
      lastName?: string
      committees?: unknown
      committeeChairs?: unknown
      capabilityOverrides?: unknown
      emailAddress?: string
      inactiveDays?: number
      includeAdmins?: boolean
      includeNever?: boolean
      statusFilter?: string
      confirmText?: string
    }
    const userId = (payload.userId || "").trim()
    const action = payload.action
    const emailAddress = (payload.emailAddress || "").trim().toLowerCase()

    if (!action) {
      return NextResponse.json({ success: false, error: "action is required." }, { status: 400 })
    }

    if (
      action !== "reset_by_email" &&
      action !== "cleanup_inactive_preview" &&
      action !== "cleanup_inactive_execute" &&
      !userId
    ) {
      return NextResponse.json({ success: false, error: "userId is required." }, { status: 400 })
    }

    const validActions: DirectoryAction[] = [
      "approve",
      "reject",
      "set_admin",
      "unset_admin",
      "set_committees",
      "set_profile_name",
      "set_capability_overrides",
      "send_password_reset",
      "delete_user",
      "reset_by_email",
      "cleanup_inactive_preview",
      "cleanup_inactive_execute",
    ]
    if (!validActions.includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 })
    }

    const client = await clerkClient()

    if (action === "cleanup_inactive_preview" || action === "cleanup_inactive_execute") {
      const inactiveDays = Math.max(1, Math.min(3650, Number(payload.inactiveDays) || 180))
      const includeAdmins = payload.includeAdmins === true
      const includeNever = payload.includeNever !== false
      const statusFilter = parseStatusFilter(payload.statusFilter ?? null)
      const allRows = sortPortalRows((await fetchAllUsers()).map(toPortalUserRow))
      const candidates = buildInactiveRows(allRows, {
        inactiveDays,
        includeAdmins,
        includeNever,
        statusFilter,
        excludeUserId: admin.userId,
      })

      if (action === "cleanup_inactive_preview") {
        return NextResponse.json({
          success: true,
          mode: "preview",
          inactiveDays,
          includeAdmins,
          includeNever,
          total: candidates.length,
          rows: candidates,
          confirmationPhrase: `DELETE ${candidates.length}`,
        })
      }

      const expectedPhrase = `DELETE ${candidates.length}`
      if ((payload.confirmText || "").trim() !== expectedPhrase) {
        return NextResponse.json(
          {
            success: false,
            error: `Type exactly "${expectedPhrase}" to execute cleanup.`,
          },
          { status: 400 },
        )
      }

      const deletedUserIds: string[] = []
      const skippedSelfUserIds: string[] = []
      const failed: Array<{ userId: string; reason: string }> = []

      for (const candidate of candidates) {
        try {
          const result = await safelyDeleteClerkUser(candidate.userId, admin.userId)
          if (result.deleted) deletedUserIds.push(candidate.userId)
          if (result.skippedSelf) skippedSelfUserIds.push(candidate.userId)
        } catch (error) {
          const reason = error instanceof Error ? error.message : "Failed to delete user."
          failed.push({ userId: candidate.userId, reason })
        }
      }

      const audit = {
        actorUserId: admin.userId,
        actorEmail: admin.email || "",
        at: new Date().toISOString(),
        policy: {
          inactiveDays,
          includeAdmins,
          includeNever,
          statusFilter: Array.from(statusFilter.values()),
        },
        candidateCount: candidates.length,
        deletedCount: deletedUserIds.length,
        failedCount: failed.length,
        skippedSelfCount: skippedSelfUserIds.length,
      }

      console.info("Portal inactive cleanup executed", {
        ...audit,
        deletedUserIds,
        skippedSelfUserIds,
        failed,
      })

      return NextResponse.json({
        success: true,
        mode: "execute",
        audit,
        deletedUserIds,
        skippedSelfUserIds,
        failed,
      })
    }

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

    if (action === "set_profile_name") {
      const firstName = (payload.firstName || "").trim()
      const lastName = (payload.lastName || "").trim()
      if (!firstName || !lastName) {
        return NextResponse.json(
          { success: false, error: "First and last name are required." },
          { status: 400 },
        )
      }
      if (firstName.length > 100 || lastName.length > 100) {
        return NextResponse.json(
          { success: false, error: "Name is too long." },
          { status: 400 },
        )
      }

      await client.users.updateUser(userId, {
        firstName,
        lastName,
      })

      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...publicMetadata,
          profileNameUpdatedAt: nowIso,
          profileNameUpdatedBy: actor,
        },
        unsafeMetadata: {
          ...unsafeMetadata,
          portalRegistration: {
            ...registration,
            firstName,
            lastName,
          },
        },
      })

      return NextResponse.json({ success: true })
    }

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
      const requestedCommittees = normalizeCommitteeSlugs(payload.committees)
      const requestedCommitteeChairs = normalizeCommitteeChairSlugs(payload.committeeChairs)
      const committees = normalizeCommitteeSlugs([...requestedCommittees, ...requestedCommitteeChairs])
      const committeeChairs = requestedCommitteeChairs.filter((slug) => committees.includes(slug))

      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...publicMetadata,
          committees,
          committeeChairs,
          committeesUpdatedAt: nowIso,
          committeesUpdatedBy: actor,
        },
      })

      return NextResponse.json({ success: true })
    }

    if (action === "set_capability_overrides") {
      const requestedOverrides = normalizeCapabilityOverrides(payload.capabilityOverrides)
      const capabilityOverrides = Object.fromEntries(
        CAPABILITY_KEYS.map((key) => [key, requestedOverrides[key] ?? null]),
      )

      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...publicMetadata,
          capabilityOverrides,
          capabilityOverridesUpdatedAt: nowIso,
          capabilityOverridesUpdatedBy: actor,
        },
      })

      return NextResponse.json({ success: true })
    }

    if (action === "send_password_reset") {
      const primaryEmail =
        user.emailAddresses?.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress ||
        ""

      if (!primaryEmail) {
        return NextResponse.json(
          { success: false, error: "User has no primary email address." },
          { status: 400 },
        )
      }

      const appBaseUrl = (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, "")
      const resetUrl = `${appBaseUrl}/welcome-set-password?email=${encodeURIComponent(primaryEmail)}`
      const signInUrl = `${appBaseUrl}/sign-in`

      const template = await getPasswordResetEmailFromSanity({
        firstName: user.firstName || "Resident",
        resetUrl,
        signInUrl,
      })

      const fallbackSubject = "Reset your Pristine Place portal password"
      const fallbackHtml = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
          <p>Hello,</p>
          <p>An administrator sent you a password reset link for your Pristine Place portal account.</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#3A5A40;color:#ffffff;text-decoration:none;font-weight:600">
              Reset Password
            </a>
          </p>
          <p>If the button does not work, copy and paste this URL into your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `

      const emailResult = await sendEmail({
        to: primaryEmail,
        subject: template?.subject || fallbackSubject,
        html: template?.html || fallbackHtml,
      })

      if (!emailResult.success) {
        return NextResponse.json(
          { success: false, error: emailResult.error || "Failed to send password reset email." },
          { status: 500 },
        )
      }

      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...publicMetadata,
          passwordResetSentAt: nowIso,
          passwordResetSentBy: actor,
        },
      })

      return NextResponse.json({
        success: true,
        warning: emailResult.error,
      })
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

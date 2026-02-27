import { NextResponse } from "next/server"
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server"
import { sendEmail } from "@/lib/email/service"
import {
  buildPortalRegistrationSubmissionAdminEmail,
  buildPortalRegistrationSubmissionResidentEmail,
} from "@/lib/email/templates/portal-registration"
import {
  getPortalRegistrationSubmissionAdminEmailFromSanity,
  getPortalRegistrationSubmissionResidentEmailFromSanity,
} from "@/lib/email/templates/portal-registration-sanity"
import { siteConfig } from "@/lib/site-config"

interface RegistrationRequest {
  firstName: string
  lastName: string
  homeAddress: string
  username?: string
  emailAddress: string
}

function sanitizeText(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

function getApproverEmails() {
  return (process.env.PORTAL_APPROVER_EMAILS || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const payload = (await req.json()) as Partial<RegistrationRequest>

    const firstName = sanitizeText(payload.firstName || "")
    const lastName = sanitizeText(payload.lastName || "")
    const homeAddress = sanitizeText(payload.homeAddress || "")
    const username = sanitizeText(payload.username || "")
    const emailAddress = sanitizeText(payload.emailAddress || "").toLowerCase()

    if (!firstName || !lastName || !homeAddress || !emailAddress) {
      return NextResponse.json(
        { success: false, error: "First name, last name, home address, and email are required." },
        { status: 400 },
      )
    }

    const user = await currentUser()
    const client = await clerkClient()

    // If resident provided a username and their Clerk account doesn't have it yet,
    // set it on the Clerk user so they can actually sign in with that username.
    if (username && user?.username?.toLowerCase() !== username.toLowerCase()) {
      try {
        await client.users.updateUser(userId, { username })
      } catch {
        return NextResponse.json(
          {
            success: false,
            error:
              "That username is unavailable or invalid in Clerk. Please choose a different username and submit again.",
          },
          { status: 400 },
        )
      }
    }

    const nowIso = new Date().toISOString()
    const existingPublicMetadata = (user?.publicMetadata || {}) as Record<string, unknown>
    const existingUnsafeMetadata = (user?.unsafeMetadata || {}) as Record<string, unknown>

    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...existingPublicMetadata,
        portalApproved: false,
        portalRegistrationSubmitted: true,
        portalRegistrationSubmittedAt: nowIso,
      },
      unsafeMetadata: {
        ...existingUnsafeMetadata,
        portalRegistration: {
          firstName,
          lastName,
          homeAddress,
          username: username || null,
          emailAddress,
          submittedAt: nowIso,
          status: "pending",
        },
      },
    })

    const approverEmails = getApproverEmails()
    const baseUrl = siteConfig.url.replace(/\/$/, "")
    const portalUrl = `${baseUrl}/resident-portal`
    const reviewUrl = `${baseUrl}/resident-portal/management/resident-approvals`

    const residentTemplateFromSanity = await getPortalRegistrationSubmissionResidentEmailFromSanity({
      firstName,
      portalUrl,
    })
    const residentTemplate =
      residentTemplateFromSanity ||
      buildPortalRegistrationSubmissionResidentEmail({
        firstName,
        portalUrl,
      })

    const residentEmailResult = await sendEmail({
      to: emailAddress,
      subject: residentTemplate.subject,
      html: residentTemplate.html,
    })
    if (!residentEmailResult.success) {
      console.warn("Portal registration resident email failed for:", emailAddress)
    }

    if (!approverEmails.length) {
      console.warn("Portal registration submitted but PORTAL_APPROVER_EMAILS is not configured.")
      return NextResponse.json({ success: true })
    }

    const adminTemplateFromSanity = await getPortalRegistrationSubmissionAdminEmailFromSanity({
      firstName,
      lastName,
      homeAddress,
      username: username || "Not provided",
      emailAddress,
      submittedAt: nowIso,
      reviewUrl,
    })
    const adminTemplate =
      adminTemplateFromSanity ||
      buildPortalRegistrationSubmissionAdminEmail({
        firstName,
        lastName,
        homeAddress,
        username: username || "Not provided",
        emailAddress,
        submittedAt: nowIso,
        reviewUrl,
      })

    const adminEmailResult = await sendEmail({
      to: approverEmails,
      subject: adminTemplate.subject,
      html: adminTemplate.html,
    })
    if (!adminEmailResult.success) {
      console.warn("Portal registration admin email failed for approvers:", approverEmails.join(", "))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Portal registration error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to submit registration. Please try again." },
      { status: 500 },
    )
  }
}

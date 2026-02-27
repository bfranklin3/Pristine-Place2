import { sendEmail } from "@/lib/email/service"
import { buildPortalRegistrationDecisionEmail, type PortalRegistrationDecision } from "@/lib/email/templates/portal-registration"
import { getPortalRegistrationDecisionEmailFromSanity } from "@/lib/email/templates/portal-registration-sanity"
import type { PortalRegistrationMetadata } from "@/lib/portal/users"
import { siteConfig } from "@/lib/site-config"

interface ClerkEmailAddressLike {
  id?: string
  emailAddress?: string
}

interface ClerkUserLike {
  primaryEmailAddressId?: string
  emailAddresses?: ClerkEmailAddressLike[]
  firstName?: string
}

function getPrimaryEmail(user: ClerkUserLike) {
  return (
    user.emailAddresses?.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress || ""
  )
}

function getResidentEmail(user: ClerkUserLike, registration: PortalRegistrationMetadata) {
  const fromRegistration = (registration.emailAddress || "").trim().toLowerCase()
  if (fromRegistration) return fromRegistration
  return getPrimaryEmail(user).trim().toLowerCase()
}

export async function sendPortalRegistrationDecisionEmail(
  decision: PortalRegistrationDecision,
  user: ClerkUserLike,
  registration: PortalRegistrationMetadata,
): Promise<{ warning?: string }> {
  const recipientEmail = getResidentEmail(user, registration)
  if (!recipientEmail) {
    return {
      warning: "Resident update saved, but no resident email address was available for notification.",
    }
  }

  const firstName = registration.firstName || user.firstName || "Resident"
  const portalUrl = `${siteConfig.url.replace(/\/$/, "")}/resident-portal`
  const templateFromSanity = await getPortalRegistrationDecisionEmailFromSanity(decision, {
    firstName,
    portalUrl,
  })
  const template = templateFromSanity || buildPortalRegistrationDecisionEmail(decision, { firstName, portalUrl })

  if (!templateFromSanity) {
    console.warn(`Portal registration email template fallback used for decision: ${decision}`)
  }

  const emailResult = await sendEmail({
    to: recipientEmail,
    subject: template.subject,
    html: template.html,
  })

  if (!emailResult.success) {
    return {
      warning: "Resident update saved, but notification email could not be sent.",
    }
  }

  return {}
}

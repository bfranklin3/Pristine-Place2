import { client } from "@/lib/sanity/client"
import { siteConfig } from "@/lib/site-config"
import type { PortalRegistrationDecision } from "@/lib/email/templates/portal-registration"

interface PortalRegistrationTemplateInput {
  firstName: string
  portalUrl: string
}

interface PortalRegistrationSubmissionResidentInput {
  firstName: string
  portalUrl: string
}

interface PortalRegistrationSubmissionAdminInput {
  firstName: string
  lastName: string
  homeAddress: string
  username: string
  emailAddress: string
  submittedAt: string
  reviewUrl: string
}

interface SanityEmailTemplateDoc {
  subject?: string
  htmlBody?: string
  textBody?: string
}

const TEMPLATE_KEYS: Record<PortalRegistrationDecision, string> = {
  approve: "portal_registration_approved",
  reject: "portal_registration_rejected",
}

const SUBMISSION_TEMPLATE_KEYS = {
  resident: "portal_registration_submitted_resident",
  admin: "portal_registration_submitted_admin",
} as const

const APPROVAL_SUPPORT_EMAIL = "communication@pristineplace.us"

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function replaceTemplatePlaceholders(
  template: string,
  replacements: Record<string, string>,
  escapeValues: boolean,
) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = replacements[key] ?? ""
    return escapeValues ? escapeHtml(value) : value
  })
}

export async function getPortalRegistrationDecisionEmailFromSanity(
  decision: PortalRegistrationDecision,
  input: PortalRegistrationTemplateInput,
): Promise<{ subject: string; text: string; html: string } | null> {
  try {
    const key = TEMPLATE_KEYS[decision]
    const query = `*[_type == "emailTemplate" && key == $key && isActive == true][0]{
      subject,
      htmlBody,
      textBody
    }`

    const template = await client.fetch<SanityEmailTemplateDoc | null>(query, { key })
    if (!template?.subject || !template?.htmlBody || !template?.textBody) {
      return null
    }

    const replacements = {
      firstName: input.firstName || "Resident",
      portalUrl: input.portalUrl,
      contactEmail: siteConfig.contact.email,
      approvalSupportEmail: APPROVAL_SUPPORT_EMAIL,
    }

    return {
      subject: replaceTemplatePlaceholders(template.subject, replacements, false),
      text: replaceTemplatePlaceholders(template.textBody, replacements, false),
      html: replaceTemplatePlaceholders(template.htmlBody, replacements, true),
    }
  } catch (error) {
    console.error("Failed to load portal registration email template from Sanity:", error)
    return null
  }
}

export async function getPortalRegistrationSubmissionResidentEmailFromSanity(
  input: PortalRegistrationSubmissionResidentInput,
): Promise<{ subject: string; text: string; html: string } | null> {
  try {
    const key = SUBMISSION_TEMPLATE_KEYS.resident
    const query = `*[_type == "emailTemplate" && key == $key && isActive == true][0]{
      subject,
      htmlBody,
      textBody
    }`

    const template = await client.fetch<SanityEmailTemplateDoc | null>(query, { key })
    if (!template?.subject || !template?.htmlBody || !template?.textBody) {
      return null
    }

    const replacements = {
      firstName: input.firstName || "Resident",
      portalUrl: input.portalUrl,
      contactEmail: siteConfig.contact.email,
      approvalSupportEmail: APPROVAL_SUPPORT_EMAIL,
    }

    return {
      subject: replaceTemplatePlaceholders(template.subject, replacements, false),
      text: replaceTemplatePlaceholders(template.textBody, replacements, false),
      html: replaceTemplatePlaceholders(template.htmlBody, replacements, true),
    }
  } catch (error) {
    console.error("Failed to load resident submission email template from Sanity:", error)
    return null
  }
}

export async function getPortalRegistrationSubmissionAdminEmailFromSanity(
  input: PortalRegistrationSubmissionAdminInput,
): Promise<{ subject: string; text: string; html: string } | null> {
  try {
    const key = SUBMISSION_TEMPLATE_KEYS.admin
    const query = `*[_type == "emailTemplate" && key == $key && isActive == true][0]{
      subject,
      htmlBody,
      textBody
    }`

    const template = await client.fetch<SanityEmailTemplateDoc | null>(query, { key })
    if (!template?.subject || !template?.htmlBody || !template?.textBody) {
      return null
    }

    const replacements = {
      firstName: input.firstName || "",
      lastName: input.lastName || "",
      homeAddress: input.homeAddress || "",
      username: input.username || "",
      emailAddress: input.emailAddress || "",
      submittedAt: input.submittedAt || "",
      reviewUrl: input.reviewUrl || "",
      contactEmail: siteConfig.contact.email,
      approvalSupportEmail: APPROVAL_SUPPORT_EMAIL,
      portalUrl: `${siteConfig.url.replace(/\/$/, "")}/resident-portal`,
    }

    return {
      subject: replaceTemplatePlaceholders(template.subject, replacements, false),
      text: replaceTemplatePlaceholders(template.textBody, replacements, false),
      html: replaceTemplatePlaceholders(template.htmlBody, replacements, true),
    }
  } catch (error) {
    console.error("Failed to load admin submission email template from Sanity:", error)
    return null
  }
}

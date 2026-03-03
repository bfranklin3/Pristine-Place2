import { client } from "@/lib/sanity/client"
import { siteConfig } from "@/lib/site-config"

interface SanityEmailTemplateDoc {
  subject?: string
  htmlBody?: string
  textBody?: string
}

interface PasswordResetTemplateInput {
  firstName: string
  resetUrl: string
  signInUrl: string
}

const TEMPLATE_KEY = "portal_password_reset_admin_sent"

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

export async function getPasswordResetEmailFromSanity(
  input: PasswordResetTemplateInput,
): Promise<{ subject: string; text: string; html: string } | null> {
  try {
    const query = `*[_type == "emailTemplate" && key == $key && isActive == true][0]{
      subject,
      htmlBody,
      textBody
    }`

    const template = await client.fetch<SanityEmailTemplateDoc | null>(query, { key: TEMPLATE_KEY })
    if (!template?.subject || !template?.htmlBody || !template?.textBody) {
      return null
    }

    const replacements = {
      firstName: input.firstName || "Resident",
      resetUrl: input.resetUrl,
      signInUrl: input.signInUrl,
      contactEmail: siteConfig.contact.email,
    }

    return {
      subject: replaceTemplatePlaceholders(template.subject, replacements, false),
      text: replaceTemplatePlaceholders(template.textBody, replacements, false),
      html: replaceTemplatePlaceholders(template.htmlBody, replacements, true),
    }
  } catch (error) {
    console.error("Failed to load password reset email template from Sanity:", error)
    return null
  }
}

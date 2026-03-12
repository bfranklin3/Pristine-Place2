import { clerkClient } from "@clerk/nextjs/server"
import { createClient } from "next-sanity"
import { sendEmail } from "@/lib/email/service"
import { siteConfig } from "@/lib/site-config"

type NotificationTemplateKey =
  | "clubhouse_rental_submitted_resident"
  | "clubhouse_rental_submitted_admin"
  | "clubhouse_rental_more_info_resident"
  | "clubhouse_rental_resubmitted_admin"
  | "clubhouse_rental_approved_resident"
  | "clubhouse_rental_rejected_resident"

type SanityEmailTemplateDoc = {
  subject?: string
  htmlBody?: string
  textBody?: string
}

type ClubhouseRentalNotificationPayload = {
  requestId: string
  requestNumber?: string | null
  residentName?: string | null
  residentEmail?: string | null
  residentAddress?: string | null
  eventType?: string | null
  reservationDate?: string | null
  reservationStartLabel?: string | null
  reservationEndLabel?: string | null
  residentActionNote?: string | null
  decisionNote?: string | null
}

type ClubhouseRentalNotificationResult = {
  delivered: boolean
  mode: "live" | "reroute" | "suppress"
  recipients: string[]
  effectiveRecipients: string[]
  templateSource: "sanity" | "fallback"
  warning?: string
}

type RenderedTemplate = {
  subject: string
  html: string
  text?: string
}

const sanityEmailTemplateClient =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID && process.env.NEXT_PUBLIC_SANITY_DATASET
    ? createClient({
        projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
        dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
        apiVersion: "2024-01-01",
        token: process.env.SANITY_API_TOKEN,
        useCdn: false,
      })
    : null

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function replaceTemplatePlaceholders(template: string, replacements: Record<string, string>, escapeValues: boolean) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = replacements[key] ?? ""
    return escapeValues ? escapeHtml(value) : value
  })
}

function normalizeEmail(value: string | null | undefined) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/^mailto:/, "")
    .replace(/^=+/, "")
    .replace(/^["'<\s]+/, "")
    .replace(/["'>\s]+$/, "")
}

function dedupeEmails(values: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const emails: string[] = []

  for (const value of values) {
    const normalized = normalizeEmail(value)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    emails.push(normalized)
  }

  return emails
}

function parseCsvList(value?: string) {
  return (value || "")
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean)
}

function getPortalUrl(path: string) {
  return `${siteConfig.url.replace(/\/$/, "")}${path}`
}

async function getTemplateFromSanity(key: NotificationTemplateKey, replacements: Record<string, string>) {
  try {
    if (!sanityEmailTemplateClient) return null
    const query = `*[_type == "emailTemplate" && key == $key && isActive == true][0]{
      subject,
      htmlBody,
      textBody
    }`

    const template = await sanityEmailTemplateClient.fetch<SanityEmailTemplateDoc | null>(query, { key })
    if (!template?.subject || !template?.htmlBody || !template?.textBody) return null

    return {
      subject: replaceTemplatePlaceholders(template.subject, replacements, false),
      html: replaceTemplatePlaceholders(template.htmlBody, replacements, true),
      text: replaceTemplatePlaceholders(template.textBody, replacements, false),
    } satisfies RenderedTemplate
  } catch (error) {
    console.error(`Failed to load clubhouse rental email template from Sanity for key ${key}:`, error)
    return null
  }
}

function buildFallbackTemplate(key: NotificationTemplateKey, replacements: Record<string, string>): RenderedTemplate {
  const requestTitle = replacements.requestTitle || "Clubhouse Rental Request"
  const requestNumber = replacements.requestNumber || ""
  const requestNumberHtml = requestNumber ? `<p><strong>Request Number:</strong> ${escapeHtml(requestNumber)}</p>` : ""
  const reservationHtml = replacements.reservationDate
    ? `<p><strong>Reservation:</strong> ${escapeHtml(replacements.reservationDate)}${replacements.reservationTime ? ` · ${escapeHtml(replacements.reservationTime)}` : ""}</p>`
    : ""

  if (key === "clubhouse_rental_submitted_resident") {
    return {
      subject: `Clubhouse rental request received: ${requestTitle}`,
      html: `<p>Your clubhouse rental request has been received.</p>${requestNumberHtml}${reservationHtml}<p><a href="${replacements.detailUrl}">View your request</a></p>`,
    }
  }

  if (key === "clubhouse_rental_submitted_admin") {
    return {
      subject: `Clubhouse rental review needed: ${requestTitle}`,
      html: `<p>A new clubhouse rental request is ready for review.</p>${requestNumberHtml}<p><strong>Resident:</strong> ${escapeHtml(replacements.residentName || "Resident")}</p><p><strong>Address:</strong> ${escapeHtml(replacements.residentAddress || "")}</p>${reservationHtml}<p><a href="${replacements.managementUrl}">Open clubhouse rental queue</a></p>`,
    }
  }

  if (key === "clubhouse_rental_more_info_resident") {
    return {
      subject: `More information needed for your clubhouse rental request`,
      html: `<p>Your clubhouse rental request needs more information before review can continue.</p>${requestNumberHtml}${reservationHtml}<p><strong>Note:</strong> ${escapeHtml(replacements.residentActionNote || "")}</p><p><a href="${replacements.detailUrl}">Open your request</a></p>`,
    }
  }

  if (key === "clubhouse_rental_resubmitted_admin") {
    return {
      subject: `Clubhouse rental request resubmitted: ${requestTitle}`,
      html: `<p>A resident has updated and resubmitted a clubhouse rental request.</p>${requestNumberHtml}<p><strong>Resident:</strong> ${escapeHtml(replacements.residentName || "Resident")}</p>${reservationHtml}<p><a href="${replacements.managementUrl}">Open clubhouse rental queue</a></p>`,
    }
  }

  if (key === "clubhouse_rental_approved_resident") {
    return {
      subject: `Clubhouse rental request approved: ${requestTitle}`,
      html: `<p>Your clubhouse rental request has been approved.</p>${requestNumberHtml}${reservationHtml}${replacements.decisionNote ? `<p><strong>Note:</strong> ${escapeHtml(replacements.decisionNote)}</p>` : ""}<p><a href="${replacements.detailUrl}">View your request</a></p>`,
    }
  }

  return {
    subject: `Clubhouse rental request decision: ${requestTitle}`,
    html: `<p>Your clubhouse rental request has been rejected.</p>${requestNumberHtml}${reservationHtml}${replacements.decisionNote ? `<p><strong>Note:</strong> ${escapeHtml(replacements.decisionNote)}</p>` : ""}<p><a href="${replacements.detailUrl}">View your request</a></p>`,
  }
}

function cleanupRenderedTemplate(template: RenderedTemplate): RenderedTemplate {
  const html = template.html
    .replace(/<p>\s*<strong>[^<]+:<\/strong>\s*<\/p>/g, "")
    .replace(/<p>\s*<\/p>/g, "")
    .replace(/\n{3,}/g, "\n\n")

  const text = template.text
    ? template.text
        .replace(/^[A-Za-z][A-Za-z0-9 #/()&+-]*:\s*$/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    : template.text

  return { ...template, html, text }
}

function resolveNotificationMode() {
  const raw = (process.env.CLUBHOUSE_RENTAL_EMAIL_MODE || "live").trim().toLowerCase()
  if (raw === "suppress") return "suppress" as const
  if (raw === "reroute") return "reroute" as const
  return "live" as const
}

function resolveRerouteRecipients() {
  return dedupeEmails((process.env.CLUBHOUSE_RENTAL_TEST_INBOX || "").split(","))
}

function isResidentFacingTemplate(key: NotificationTemplateKey) {
  return (
    key === "clubhouse_rental_submitted_resident" ||
    key === "clubhouse_rental_more_info_resident" ||
    key === "clubhouse_rental_approved_resident" ||
    key === "clubhouse_rental_rejected_resident"
  )
}

function buildRerouteHtmlNotice(
  templateKey: NotificationTemplateKey,
  recipients: string[],
  replacements: Record<string, string>,
) {
  const residentGuidance = isResidentFacingTemplate(templateKey)
    ? `<div style="margin:6px 0 0 0;"><strong>Resident-only link:</strong> open as the resident account.</div>`
    : ""
  const managementFallback = replacements.managementDetailUrl
    ? `<div style="margin:6px 0 0 0;"><strong>Management fallback:</strong> <a href="${replacements.managementDetailUrl}" style="color:#92400e;text-decoration:underline;">Open this request in clubhouse rental queue</a></div>`
    : ""

  return `<div style="margin:0 0 16px 0;padding:12px 14px;border:1px solid #f59e0b;border-radius:8px;background:#fffbeb;color:#92400e;">
    <div style="font-weight:700;margin:0 0 6px 0;">Clubhouse rental test email reroute</div>
    <div style="margin:0 0 4px 0;"><strong>Delivery mode:</strong> reroute</div>
    <div><strong>Original recipients:</strong> ${escapeHtml(recipients.join(", "))}</div>
    ${residentGuidance}
    ${managementFallback}
  </div>`
}

function applyReroutePresentation(
  templateKey: NotificationTemplateKey,
  template: RenderedTemplate,
  recipients: string[],
  replacements: Record<string, string>,
): RenderedTemplate {
  return {
    subject: `[CLUBHOUSE TEST] ${template.subject}`,
    html: `${buildRerouteHtmlNotice(templateKey, recipients, replacements)}${template.html}`,
    text: template.text,
  }
}

function logClubhouseRentalDelivery(input: {
  templateKey: NotificationTemplateKey
  requestId: string
  mode: "live" | "reroute" | "suppress"
  recipients: string[]
  effectiveRecipients: string[]
  templateSource: "sanity" | "fallback"
  delivered: boolean
  warning?: string
}) {
  const details = {
    templateKey: input.templateKey,
    requestId: input.requestId,
    mode: input.mode,
    recipients: input.recipients,
    effectiveRecipients: input.effectiveRecipients,
    templateSource: input.templateSource,
    delivered: input.delivered,
  }

  if (input.warning) {
    console.warn("Clubhouse rental email delivery warning:", { ...details, warning: input.warning })
    return
  }

  console.info("Clubhouse rental email delivery:", details)
}

async function deliverClubhouseRentalEmail(input: {
  to: string[]
  templateKey: NotificationTemplateKey
  replacements: Record<string, string>
}): Promise<ClubhouseRentalNotificationResult> {
  const recipients = dedupeEmails(input.to)
  const mode = resolveNotificationMode()

  if (recipients.length === 0) {
    const result = {
      delivered: false,
      mode,
      recipients: [],
      effectiveRecipients: [],
      templateSource: "fallback" as const,
      warning: "No recipient email addresses were available.",
    }
    logClubhouseRentalDelivery({
      templateKey: input.templateKey,
      requestId: input.replacements.requestId || "",
      mode: result.mode,
      recipients: result.recipients,
      effectiveRecipients: result.effectiveRecipients,
      templateSource: "fallback",
      delivered: result.delivered,
      warning: result.warning,
    })
    return result
  }

  const effectiveRecipients =
    mode === "live"
      ? recipients
      : mode === "reroute"
        ? resolveRerouteRecipients()
        : []

  if (effectiveRecipients.length === 0) {
    const result = {
      delivered: false,
      mode,
      recipients,
      effectiveRecipients,
      templateSource: "fallback" as const,
      warning:
        mode === "reroute"
          ? "Clubhouse rental email reroute mode is enabled, but CLUBHOUSE_RENTAL_TEST_INBOX is empty."
          : "Clubhouse rental email delivery is suppressed.",
    }
    logClubhouseRentalDelivery({
      templateKey: input.templateKey,
      requestId: input.replacements.requestId || "",
      mode: result.mode,
      recipients: result.recipients,
      effectiveRecipients: result.effectiveRecipients,
      templateSource: "fallback",
      delivered: result.delivered,
      warning: result.warning,
    })
    return result
  }

  const sanityTemplate = await getTemplateFromSanity(input.templateKey, input.replacements)
  const templateSource = sanityTemplate ? "sanity" as const : "fallback" as const
  const baseTemplate = cleanupRenderedTemplate(
    sanityTemplate || buildFallbackTemplate(input.templateKey, input.replacements),
  )
  const template = mode === "reroute"
    ? applyReroutePresentation(input.templateKey, baseTemplate, recipients, input.replacements)
    : baseTemplate

  const result = await sendEmail({
    to: effectiveRecipients,
    subject: template.subject,
    html: template.html,
  })

  const notificationResult = {
    delivered: result.success,
    mode,
    recipients,
    effectiveRecipients,
    templateSource,
    warning: result.success ? undefined : result.error || "Email delivery failed.",
  }

  logClubhouseRentalDelivery({
    templateKey: input.templateKey,
    requestId: input.replacements.requestId || "",
    mode: notificationResult.mode,
    recipients: notificationResult.recipients,
    effectiveRecipients: notificationResult.effectiveRecipients,
    templateSource: notificationResult.templateSource,
    delivered: notificationResult.delivered,
    warning: notificationResult.warning,
  })

  return notificationResult
}

async function fetchClubhouseRentalAdminRecipients() {
  const envAdminEmails = dedupeEmails([
    ...parseCsvList(process.env.PORTAL_ADMIN_EMAILS),
    ...parseCsvList(process.env.PORTAL_APPROVER_EMAILS),
  ])
  const envAdminUsernames = new Set(parseCsvList(process.env.PORTAL_ADMIN_USERNAMES))

  const client = await clerkClient()
  const pageSize = 100
  let offset = 0
  const recipients = [...envAdminEmails]

  while (true) {
    const page = await client.users.getUserList({ limit: pageSize, offset })

    for (const user of page.data) {
      const publicMetadata = (user.publicMetadata || {}) as Record<string, unknown>
      const email = user.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId)?.emailAddress || ""
      const normalizedEmail = email.trim().toLowerCase()
      const normalizedUsername = (user.username || "").trim().toLowerCase()
      const include =
        publicMetadata.portalAdmin === true ||
        envAdminEmails.includes(normalizedEmail) ||
        envAdminUsernames.has(normalizedUsername)

      if (include && normalizedEmail) recipients.push(normalizedEmail)
    }

    if (page.data.length < pageSize) break
    offset += pageSize
  }

  return dedupeEmails(recipients)
}

function buildCommonReplacements(payload: ClubhouseRentalNotificationPayload) {
  const reservationTime =
    payload.reservationStartLabel && payload.reservationEndLabel
      ? `${payload.reservationStartLabel} - ${payload.reservationEndLabel}`
      : ""

  return {
    requestId: payload.requestId,
    requestNumber: payload.requestNumber || "",
    requestTitle: payload.eventType || "Clubhouse Rental Request",
    residentName: payload.residentName || "Resident",
    residentEmail: payload.residentEmail || "",
    residentAddress: payload.residentAddress || "",
    residentActionNote: payload.residentActionNote || "",
    decisionNote: payload.decisionNote || "",
    reservationDate: payload.reservationDate || "",
    reservationTime,
    detailUrl: getPortalUrl(`/resident-portal/clubhouse/rental/requests/${payload.requestId}`),
    managementDetailUrl: getPortalUrl(`/resident-portal/management/clubhouse-rental-queue?selected=${payload.requestId}`),
    managementUrl: getPortalUrl("/resident-portal/management/clubhouse-rental-queue"),
    contactEmail: "clubhouserentals@pristineplace.us",
  }
}

export async function sendClubhouseRentalSubmittedNotifications(payload: ClubhouseRentalNotificationPayload) {
  try {
    const replacements = buildCommonReplacements(payload)
    const [residentResult, adminRecipients] = await Promise.all([
      deliverClubhouseRentalEmail({
        to: dedupeEmails([payload.residentEmail]),
        templateKey: "clubhouse_rental_submitted_resident",
        replacements,
      }),
      fetchClubhouseRentalAdminRecipients(),
    ])

    const adminResult = await deliverClubhouseRentalEmail({
      to: adminRecipients,
      templateKey: "clubhouse_rental_submitted_admin",
      replacements,
    })

    return { residentResult, adminResult }
  } catch (error) {
    console.error("Clubhouse rental submitted notification failed:", error)
    return {
      residentResult: { delivered: false, mode: resolveNotificationMode(), recipients: [], effectiveRecipients: [], templateSource: "fallback", warning: "Submission notification failed." },
      adminResult: { delivered: false, mode: resolveNotificationMode(), recipients: [], effectiveRecipients: [], templateSource: "fallback", warning: "Admin notification failed." },
    }
  }
}

export async function sendClubhouseRentalMoreInfoNotification(payload: ClubhouseRentalNotificationPayload) {
  try {
    return await deliverClubhouseRentalEmail({
      to: dedupeEmails([payload.residentEmail]),
      templateKey: "clubhouse_rental_more_info_resident",
      replacements: buildCommonReplacements(payload),
    })
  } catch (error) {
    console.error("Clubhouse rental more-info notification failed:", error)
    return { delivered: false, mode: resolveNotificationMode(), recipients: [], effectiveRecipients: [], templateSource: "fallback", warning: "Resident notification failed." }
  }
}

export async function sendClubhouseRentalResubmittedNotification(payload: ClubhouseRentalNotificationPayload) {
  try {
    return await deliverClubhouseRentalEmail({
      to: await fetchClubhouseRentalAdminRecipients(),
      templateKey: "clubhouse_rental_resubmitted_admin",
      replacements: buildCommonReplacements(payload),
    })
  } catch (error) {
    console.error("Clubhouse rental resubmitted notification failed:", error)
    return { delivered: false, mode: resolveNotificationMode(), recipients: [], effectiveRecipients: [], templateSource: "fallback", warning: "Admin notification failed." }
  }
}

export async function sendClubhouseRentalFinalDecisionNotification(
  payload: ClubhouseRentalNotificationPayload & { decision: "approve" | "reject" },
) {
  try {
    return await deliverClubhouseRentalEmail({
      to: dedupeEmails([payload.residentEmail]),
      templateKey:
        payload.decision === "approve"
          ? "clubhouse_rental_approved_resident"
          : "clubhouse_rental_rejected_resident",
      replacements: buildCommonReplacements(payload),
    })
  } catch (error) {
    console.error("Clubhouse rental final decision notification failed:", error)
    return { delivered: false, mode: resolveNotificationMode(), recipients: [], effectiveRecipients: [], templateSource: "fallback", warning: "Resident decision notification failed." }
  }
}

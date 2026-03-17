import { clerkClient } from "@clerk/nextjs/server"
import { createClient } from "next-sanity"
import { sendEmail, type SendEmailOptions } from "@/lib/email/service"
import { siteConfig } from "@/lib/site-config"
import { normalizeCommitteeChairSlugs, normalizeCommitteeSlugs } from "@/lib/portal/committees"

type NotificationTemplateKey =
  | "acc_workflow_submitted_resident"
  | "acc_workflow_submitted_chair"
  | "acc_workflow_more_info_resident"
  | "acc_workflow_resubmitted_chair"
  | "acc_workflow_sent_to_vote_committee"
  | "acc_workflow_approved_resident"
  | "acc_workflow_rejected_resident"

type SanityEmailTemplateDoc = {
  subject?: string
  htmlBody?: string
  textBody?: string
}

type AccWorkflowNotificationPayload = {
  requestId: string
  requestNumber?: string | null
  permitNumber?: string | null
  title?: string | null
  residentName?: string | null
  residentEmail?: string | null
  residentAddress?: string | null
  status?: string | null
  decisionNote?: string | null
  residentActionNote?: string | null
  voteDeadlineAt?: string | null
}

type AccWorkflowNotificationResult = {
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

function getPortalUrl(path: string) {
  return `${siteConfig.url.replace(/\/$/, "")}${path}`
}

async function getTemplateFromSanity(
  key: NotificationTemplateKey,
  replacements: Record<string, string>,
): Promise<RenderedTemplate | null> {
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
    }
  } catch (error) {
    console.error(`Failed to load ACC workflow email template from Sanity for key ${key}:`, error)
    return null
  }
}

function buildFallbackTemplate(
  key: NotificationTemplateKey,
  replacements: Record<string, string>,
): RenderedTemplate {
  const title = replacements.requestTitle || "ACC Request"
  const requestNumber = replacements.requestNumber || ""
  const permitNumber = replacements.permitNumber || ""
  const detailUrl = replacements.detailUrl || replacements.managementUrl || siteConfig.url
  const note = replacements.decisionNote || replacements.residentActionNote || ""
  const requestNumberHtml = requestNumber ? `<p><strong>Request Number:</strong> ${escapeHtml(requestNumber)}</p>` : ""
  const permitNumberHtml = permitNumber ? `<p><strong>Permit Number:</strong> ${escapeHtml(permitNumber)}</p>` : ""

  if (key === "acc_workflow_submitted_resident") {
    return {
      subject: `ACC request received: ${title}`,
      html: `<p>Your ACC request has been received.</p><p><strong>Request:</strong> ${escapeHtml(title)}</p>${requestNumberHtml}<p><a href="${detailUrl}">View your request</a></p>`,
    }
  }

  if (key === "acc_workflow_submitted_chair") {
    return {
      subject: `ACC review needed: ${title}`,
      html: `<p>A new ACC request is ready for initial review.</p>${requestNumberHtml}<p><strong>Resident:</strong> ${escapeHtml(replacements.residentName || "Resident")}</p><p><strong>Address:</strong> ${escapeHtml(replacements.residentAddress || "")}</p><p><a href="${replacements.managementUrl}">Open ACC workflow queue</a></p>`,
    }
  }

  if (key === "acc_workflow_more_info_resident") {
    return {
      subject: `More information needed for your ACC request`,
      html: `<p>Your ACC request needs more information before review can continue.</p>${requestNumberHtml}<p><strong>Note:</strong> ${escapeHtml(note)}</p><p><a href="${detailUrl}">Open your request</a></p>`,
    }
  }

  if (key === "acc_workflow_resubmitted_chair") {
    return {
      subject: `ACC request resubmitted: ${title}`,
      html: `<p>A resident has updated and resubmitted an ACC request.</p>${requestNumberHtml}<p><strong>Resident:</strong> ${escapeHtml(replacements.residentName || "Resident")}</p><p><a href="${replacements.managementUrl}">Open ACC workflow queue</a></p>`,
    }
  }

  if (key === "acc_workflow_sent_to_vote_committee") {
    return {
      subject: `ACC vote requested: ${title}`,
      html: `<p>An ACC request is ready for committee vote.</p>${requestNumberHtml}<p><strong>Resident:</strong> ${escapeHtml(replacements.residentName || "Resident")}</p><p><strong>Deadline:</strong> ${escapeHtml(replacements.voteDeadlineAt || "")}</p><p><a href="${replacements.managementUrl}">Open ACC workflow queue</a></p>`,
    }
  }

  if (key === "acc_workflow_approved_resident") {
    return {
      subject: `ACC request approved: ${title}`,
      html: `<p>Your ACC request has been approved.</p>${requestNumberHtml}${permitNumberHtml}${note ? `<p><strong>Note:</strong> ${escapeHtml(note)}</p>` : ""}<p><a href="${detailUrl}">View your request</a></p>`,
    }
  }

  return {
    subject: `ACC request decision: ${title}`,
    html: `<p>Your ACC request has been rejected.</p>${requestNumberHtml}${note ? `<p><strong>Note:</strong> ${escapeHtml(note)}</p>` : ""}<p><a href="${detailUrl}">View your request</a></p>`,
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

  return {
    ...template,
    html,
    text,
  }
}

function resolveNotificationMode() {
  const raw = (process.env.ACC_WORKFLOW_EMAIL_MODE || "live").trim().toLowerCase()
  if (raw === "suppress") return "suppress" as const
  if (raw === "reroute") return "reroute" as const
  return "live" as const
}

function resolveRerouteRecipients() {
  return dedupeEmails((process.env.ACC_WORKFLOW_TEST_INBOX || "").split(","))
}

function isResidentFacingTemplate(key: NotificationTemplateKey) {
  return (
    key === "acc_workflow_submitted_resident" ||
    key === "acc_workflow_more_info_resident" ||
    key === "acc_workflow_approved_resident" ||
    key === "acc_workflow_rejected_resident"
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
    ? `<div style="margin:6px 0 0 0;"><strong>Management fallback:</strong> <a href="${replacements.managementDetailUrl}" style="color:#92400e;text-decoration:underline;">Open this request in ACC workflow queue</a></div>`
    : ""

  return `<div style="margin:0 0 16px 0;padding:12px 14px;border:1px solid #f59e0b;border-radius:8px;background:#fffbeb;color:#92400e;">
    <div style="font-weight:700;margin:0 0 6px 0;">ACC test email reroute</div>
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
    subject: `[ACC TEST] ${template.subject}`,
    html: `${buildRerouteHtmlNotice(templateKey, recipients, replacements)}${template.html}`,
    text: template.text,
  }
}

function logAccWorkflowDelivery(input: {
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
    console.warn("ACC workflow email delivery warning:", { ...details, warning: input.warning })
    return
  }

  console.info("ACC workflow email delivery:", details)
}

async function deliverAccWorkflowEmail(input: {
  to: string[]
  templateKey: NotificationTemplateKey
  replacements: Record<string, string>
  attachments?: SendEmailOptions["attachments"]
}) : Promise<AccWorkflowNotificationResult> {
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
    logAccWorkflowDelivery({
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
      warning: mode === "reroute"
        ? "ACC workflow email reroute mode is enabled, but ACC_WORKFLOW_TEST_INBOX is empty."
        : "ACC workflow email delivery is suppressed.",
    }
    logAccWorkflowDelivery({
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
    attachments: input.attachments,
  })

  const notificationResult = {
    delivered: result.success,
    mode,
    recipients,
    effectiveRecipients,
    templateSource,
    warning: result.success ? undefined : result.error || "Email delivery failed.",
  }
  logAccWorkflowDelivery({
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

async function fetchAccRecipients(kind: "chairs" | "committee") {
  const client = await clerkClient()
  const pageSize = 100
  let offset = 0
  const recipients: string[] = []

  while (true) {
    const page = await client.users.getUserList({ limit: pageSize, offset })

    for (const user of page.data) {
      const publicMetadata = (user.publicMetadata || {}) as Record<string, unknown>
      const committees = normalizeCommitteeSlugs(publicMetadata.committees)
      const committeeChairs = normalizeCommitteeChairSlugs(publicMetadata.committeeChairs)
      const include =
        kind === "chairs"
          ? committeeChairs.includes("acc")
          : committeeChairs.includes("acc") || committees.includes("acc")

      if (!include) continue

      const email = user.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId)?.emailAddress || ""
      if (email) recipients.push(email)
    }

    if (page.data.length < pageSize) break
    offset += pageSize
  }

  return dedupeEmails(recipients)
}

function buildCommonReplacements(payload: AccWorkflowNotificationPayload) {
  return {
    requestId: payload.requestId,
    requestNumber: payload.requestNumber || "",
    permitNumber: payload.permitNumber || "",
    requestTitle: payload.title || "ACC Request",
    residentName: payload.residentName || "Resident",
    residentEmail: payload.residentEmail || "",
    residentAddress: payload.residentAddress || "",
    residentActionNote: payload.residentActionNote || "",
    decisionNote: payload.decisionNote || "",
    voteDeadlineAt: payload.voteDeadlineAt || "",
    detailUrl: getPortalUrl(`/resident-portal/acc/requests/${payload.requestId}`),
    managementDetailUrl: getPortalUrl(`/resident-portal/management/acc-queue?selected=${payload.requestId}`),
    managementUrl: getPortalUrl("/resident-portal/management/acc-queue"),
    contactEmail: siteConfig.contact.email,
  }
}

export async function sendAccWorkflowSubmittedNotifications(
  payload: AccWorkflowNotificationPayload,
  options?: { chairAttachments?: SendEmailOptions["attachments"] },
) {
  try {
    const replacements = buildCommonReplacements(payload)
    const [residentResult, chairRecipients] = await Promise.all([
      deliverAccWorkflowEmail({
        to: dedupeEmails([payload.residentEmail]),
        templateKey: "acc_workflow_submitted_resident",
        replacements,
      }),
      fetchAccRecipients("chairs"),
    ])

    const chairResult = await deliverAccWorkflowEmail({
      to: chairRecipients,
      templateKey: "acc_workflow_submitted_chair",
      replacements,
      attachments: options?.chairAttachments,
    })

    return { residentResult, chairResult }
  } catch (error) {
    console.error("ACC workflow submitted notification failed:", error)
    return {
      residentResult: { delivered: false, mode: resolveNotificationMode(), recipients: [], effectiveRecipients: [], templateSource: "fallback", warning: "Submission notification failed." },
      chairResult: { delivered: false, mode: resolveNotificationMode(), recipients: [], effectiveRecipients: [], templateSource: "fallback", warning: "Chair notification failed." },
    }
  }
}

export async function sendAccWorkflowMoreInfoNotification(payload: AccWorkflowNotificationPayload) {
  try {
    return await deliverAccWorkflowEmail({
      to: dedupeEmails([payload.residentEmail]),
      templateKey: "acc_workflow_more_info_resident",
      replacements: buildCommonReplacements(payload),
    })
  } catch (error) {
    console.error("ACC workflow more-info notification failed:", error)
    return { delivered: false, mode: resolveNotificationMode(), recipients: [], effectiveRecipients: [], templateSource: "fallback", warning: "Resident notification failed." }
  }
}

export async function sendAccWorkflowResubmittedNotification(
  payload: AccWorkflowNotificationPayload,
  options?: { attachments?: SendEmailOptions["attachments"] },
) {
  try {
    return await deliverAccWorkflowEmail({
      to: await fetchAccRecipients("chairs"),
      templateKey: "acc_workflow_resubmitted_chair",
      replacements: buildCommonReplacements(payload),
      attachments: options?.attachments,
    })
  } catch (error) {
    console.error("ACC workflow resubmitted notification failed:", error)
    return { delivered: false, mode: resolveNotificationMode(), recipients: [], effectiveRecipients: [], templateSource: "fallback", warning: "Chair notification failed." }
  }
}

export async function sendAccWorkflowSentToVoteNotification(payload: AccWorkflowNotificationPayload) {
  try {
    return await deliverAccWorkflowEmail({
      to: await fetchAccRecipients("committee"),
      templateKey: "acc_workflow_sent_to_vote_committee",
      replacements: buildCommonReplacements(payload),
    })
  } catch (error) {
    console.error("ACC workflow send-to-vote notification failed:", error)
    return { delivered: false, mode: resolveNotificationMode(), recipients: [], effectiveRecipients: [], templateSource: "fallback", warning: "Committee notification failed." }
  }
}

export async function sendAccWorkflowFinalDecisionNotification(payload: AccWorkflowNotificationPayload & {
  decision: "approve" | "reject"
}) {
  try {
    return await deliverAccWorkflowEmail({
      to: dedupeEmails([payload.residentEmail]),
      templateKey: payload.decision === "approve" ? "acc_workflow_approved_resident" : "acc_workflow_rejected_resident",
      replacements: buildCommonReplacements(payload),
    })
  } catch (error) {
    console.error("ACC workflow final decision notification failed:", error)
    return { delivered: false, mode: resolveNotificationMode(), recipients: [], effectiveRecipients: [], templateSource: "fallback", warning: "Resident decision notification failed." }
  }
}

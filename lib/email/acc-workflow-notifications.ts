import { clerkClient } from "@clerk/nextjs/server"
import { client } from "@/lib/sanity/client"
import { sendEmail } from "@/lib/email/service"
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
  warning?: string
}

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

function dedupeEmails(values: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const emails: string[] = []

  for (const value of values) {
    const normalized = (value || "").trim().toLowerCase()
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
) {
  try {
    const query = `*[_type == "emailTemplate" && key == $key && isActive == true][0]{
      subject,
      htmlBody,
      textBody
    }`

    const template = await client.fetch<SanityEmailTemplateDoc | null>(query, { key })
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
) {
  const title = replacements.requestTitle || "ACC Request"
  const detailUrl = replacements.detailUrl || replacements.managementUrl || siteConfig.url
  const note = replacements.decisionNote || replacements.residentActionNote || ""

  if (key === "acc_workflow_submitted_resident") {
    return {
      subject: `ACC request received: ${title}`,
      html: `<p>Your ACC request has been received.</p><p><strong>Request:</strong> ${escapeHtml(title)}</p><p><a href="${detailUrl}">View your request</a></p>`,
    }
  }

  if (key === "acc_workflow_submitted_chair") {
    return {
      subject: `ACC review needed: ${title}`,
      html: `<p>A new ACC request is ready for initial review.</p><p><strong>Resident:</strong> ${escapeHtml(replacements.residentName || "Resident")}</p><p><strong>Address:</strong> ${escapeHtml(replacements.residentAddress || "")}</p><p><a href="${replacements.managementUrl}">Open ACC workflow queue</a></p>`,
    }
  }

  if (key === "acc_workflow_more_info_resident") {
    return {
      subject: `More information needed for your ACC request`,
      html: `<p>Your ACC request needs more information before review can continue.</p><p><strong>Note:</strong> ${escapeHtml(note)}</p><p><a href="${detailUrl}">Open your request</a></p>`,
    }
  }

  if (key === "acc_workflow_resubmitted_chair") {
    return {
      subject: `ACC request resubmitted: ${title}`,
      html: `<p>A resident has updated and resubmitted an ACC request.</p><p><strong>Resident:</strong> ${escapeHtml(replacements.residentName || "Resident")}</p><p><a href="${replacements.managementUrl}">Open ACC workflow queue</a></p>`,
    }
  }

  if (key === "acc_workflow_sent_to_vote_committee") {
    return {
      subject: `ACC vote requested: ${title}`,
      html: `<p>An ACC request is ready for committee vote.</p><p><strong>Resident:</strong> ${escapeHtml(replacements.residentName || "Resident")}</p><p><strong>Deadline:</strong> ${escapeHtml(replacements.voteDeadlineAt || "")}</p><p><a href="${replacements.managementUrl}">Open ACC workflow queue</a></p>`,
    }
  }

  if (key === "acc_workflow_approved_resident") {
    return {
      subject: `ACC request approved: ${title}`,
      html: `<p>Your ACC request has been approved.</p>${note ? `<p><strong>Note:</strong> ${escapeHtml(note)}</p>` : ""}<p><a href="${detailUrl}">View your request</a></p>`,
    }
  }

  return {
    subject: `ACC request decision: ${title}`,
    html: `<p>Your ACC request has been rejected.</p>${note ? `<p><strong>Note:</strong> ${escapeHtml(note)}</p>` : ""}<p><a href="${detailUrl}">View your request</a></p>`,
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

async function deliverAccWorkflowEmail(input: {
  to: string[]
  templateKey: NotificationTemplateKey
  replacements: Record<string, string>
}) : Promise<AccWorkflowNotificationResult> {
  const recipients = dedupeEmails(input.to)
  const mode = resolveNotificationMode()

  if (recipients.length === 0) {
    return {
      delivered: false,
      mode,
      recipients: [],
      effectiveRecipients: [],
      warning: "No recipient email addresses were available.",
    }
  }

  const effectiveRecipients =
    mode === "live"
      ? recipients
      : mode === "reroute"
        ? resolveRerouteRecipients()
        : []

  if (effectiveRecipients.length === 0) {
    return {
      delivered: false,
      mode,
      recipients,
      effectiveRecipients,
      warning: mode === "reroute"
        ? "ACC workflow email reroute mode is enabled, but ACC_WORKFLOW_TEST_INBOX is empty."
        : "ACC workflow email delivery is suppressed.",
    }
  }

  const template =
    await getTemplateFromSanity(input.templateKey, input.replacements) ||
    buildFallbackTemplate(input.templateKey, input.replacements)

  const result = await sendEmail({
    to: effectiveRecipients,
    subject: template.subject,
    html: template.html,
  })

  return {
    delivered: result.success,
    mode,
    recipients,
    effectiveRecipients,
    warning: result.success ? undefined : result.error || "Email delivery failed.",
  }
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
    requestTitle: payload.title || "ACC Request",
    residentName: payload.residentName || "Resident",
    residentEmail: payload.residentEmail || "",
    residentAddress: payload.residentAddress || "",
    residentActionNote: payload.residentActionNote || "",
    decisionNote: payload.decisionNote || "",
    voteDeadlineAt: payload.voteDeadlineAt || "",
    detailUrl: getPortalUrl(`/resident-portal/acc/requests/${payload.requestId}`),
    managementUrl: getPortalUrl("/resident-portal/management/acc-queue"),
    contactEmail: siteConfig.contact.email,
  }
}

export async function sendAccWorkflowSubmittedNotifications(payload: AccWorkflowNotificationPayload) {
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
    })

    return { residentResult, chairResult }
  } catch (error) {
    console.error("ACC workflow submitted notification failed:", error)
    return {
      residentResult: { delivered: false, mode: resolveNotificationMode(), recipients: [], effectiveRecipients: [], warning: "Submission notification failed." },
      chairResult: { delivered: false, mode: resolveNotificationMode(), recipients: [], effectiveRecipients: [], warning: "Chair notification failed." },
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
    return { delivered: false, mode: resolveNotificationMode(), recipients: [], effectiveRecipients: [], warning: "Resident notification failed." }
  }
}

export async function sendAccWorkflowResubmittedNotification(payload: AccWorkflowNotificationPayload) {
  try {
    return await deliverAccWorkflowEmail({
      to: await fetchAccRecipients("chairs"),
      templateKey: "acc_workflow_resubmitted_chair",
      replacements: buildCommonReplacements(payload),
    })
  } catch (error) {
    console.error("ACC workflow resubmitted notification failed:", error)
    return { delivered: false, mode: resolveNotificationMode(), recipients: [], effectiveRecipients: [], warning: "Chair notification failed." }
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
    return { delivered: false, mode: resolveNotificationMode(), recipients: [], effectiveRecipients: [], warning: "Committee notification failed." }
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
    return { delivered: false, mode: resolveNotificationMode(), recipients: [], effectiveRecipients: [], warning: "Resident decision notification failed." }
  }
}

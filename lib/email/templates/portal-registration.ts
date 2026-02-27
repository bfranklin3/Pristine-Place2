import { siteConfig } from "@/lib/site-config"

export type PortalRegistrationDecision = "approve" | "reject"

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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function buildPortalRegistrationDecisionEmail(
  decision: PortalRegistrationDecision,
  input: PortalRegistrationTemplateInput,
) {
  const firstName = input.firstName || "Resident"
  const safeFirstName = escapeHtml(firstName)
  const safePortalUrl = escapeHtml(input.portalUrl)
  const contactEmail = siteConfig.contact.email

  if (decision === "approve") {
    const approvalSupportEmail = "communication@pristineplace.us"
    const subject = "Your Pristine Place Resident Portal Access Has Been Approved"
    const text = [
      `Hi ${firstName},`,
      "",
      "Good news. Your Pristine Place HOA Resident Portal application has been approved.",
      "",
      "You can now sign in and access the portal here:",
      input.portalUrl,
      "",
      `If you have any trouble signing in, reply to this email or contact the Communication Committee at ${approvalSupportEmail}.`,
      "",
      "Thank you,",
      "Pristine Place HOA",
      "",
      approvalSupportEmail,
    ].join("\n")

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1f2937; }
    .container { max-width: 640px; margin: 0 auto; padding: 20px; }
    .header { background: #1f3a8a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { border: 1px solid #e5e7eb; border-top: none; padding: 24px; }
    .button { display: inline-block; margin: 12px 0; padding: 10px 16px; border-radius: 6px; background: #1f3a8a; color: #ffffff !important; text-decoration: none; font-weight: 600; }
    .footer { border: 1px solid #e5e7eb; border-top: none; background: #f9fafb; color: #6b7280; padding: 16px; border-radius: 0 0 8px 8px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 22px;">Portal Access Approved</h1>
    </div>
    <div class="content">
      <p>Hi ${safeFirstName},</p>
      <p>Good news. Your Pristine Place HOA Resident Portal application has been approved.</p>
      <p>You can now sign in and access the portal:</p>
      <p><a class="button" href="${safePortalUrl}">Open Resident Portal</a></p>
      <p>If the button does not work, use this link:<br /><a href="${safePortalUrl}">${safePortalUrl}</a></p>
      <p>If you have any trouble signing in, reply to this email or contact the Communication Committee at <a href="mailto:${approvalSupportEmail}">${approvalSupportEmail}</a>.</p>
      <p>Thank you,<br />Pristine Place HOA</p>
      <p><a href="mailto:${approvalSupportEmail}">${approvalSupportEmail}</a></p>
    </div>
    <div class="footer">This is an automated portal notification from Pristine Place HOA.</div>
  </div>
</body>
</html>`

    return { subject, text, html }
  }

  const subject = "Update on Your Pristine Place Resident Portal Application"
  const text = [
    `Hi ${firstName},`,
    "",
    "Thank you for your application to access the Pristine Place HOA Resident Portal.",
    "",
    "At this time, we are unable to approve your request because our records do not show you as a current resident.",
    "",
    `If you believe this is an error, please contact the HOA at ${contactEmail} so we can review your information.`,
    "",
    "Thank you,",
    "Pristine Place HOA",
  ].join("\n")

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1f2937; }
    .container { max-width: 640px; margin: 0 auto; padding: 20px; }
    .header { background: #1f3a8a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { border: 1px solid #e5e7eb; border-top: none; padding: 24px; }
    .footer { border: 1px solid #e5e7eb; border-top: none; background: #f9fafb; color: #6b7280; padding: 16px; border-radius: 0 0 8px 8px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 22px;">Portal Application Update</h1>
    </div>
    <div class="content">
      <p>Hi ${safeFirstName},</p>
      <p>Thank you for your application to access the Pristine Place HOA Resident Portal.</p>
      <p>At this time, we are unable to approve your request because our records do not show you as a current resident.</p>
      <p>If you believe this is an error, please contact the HOA at <a href="mailto:${contactEmail}">${contactEmail}</a> so we can review your information.</p>
      <p>Thank you,<br />Pristine Place HOA</p>
    </div>
    <div class="footer">This is an automated portal notification from Pristine Place HOA.</div>
  </div>
</body>
</html>`

  return { subject, text, html }
}

export function buildPortalRegistrationSubmissionResidentEmail(
  input: PortalRegistrationSubmissionResidentInput,
) {
  const firstName = input.firstName || "Resident"
  const safeFirstName = escapeHtml(firstName)
  const safePortalUrl = escapeHtml(input.portalUrl)
  const contactEmail = siteConfig.contact.email

  const subject = "Pristine Place Portal Registration Received"
  const text = [
    `Hi ${firstName},`,
    "",
    "Thank you for registering for the Pristine Place Resident Portal.",
    "",
    "Your request has been received and is now pending HOA review.",
    "To protect resident privacy, access is granted only after residency is verified.",
    "Please allow several days for review.",
    "",
    "Meanwhile, you can continue to use the public website:",
    input.portalUrl.replace(/\/resident-portal$/, ""),
    "",
    `If you have questions, contact ${contactEmail}.`,
    "",
    "Thank you,",
    "Pristine Place HOA",
  ].join("\n")

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1f2937; }
    .container { max-width: 640px; margin: 0 auto; padding: 20px; }
    .header { background: #1f3a8a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { border: 1px solid #e5e7eb; border-top: none; padding: 24px; }
    .button { display: inline-block; margin: 10px 0; padding: 10px 16px; border-radius: 6px; background: #1f3a8a; color: #ffffff !important; text-decoration: none; font-weight: 600; }
    .footer { border: 1px solid #e5e7eb; border-top: none; background: #f9fafb; color: #6b7280; padding: 16px; border-radius: 0 0 8px 8px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 22px;">Registration Received</h1>
    </div>
    <div class="content">
      <p>Hi ${safeFirstName},</p>
      <p>Thank you for registering for the Pristine Place Resident Portal.</p>
      <p>Your request has been received and is now pending HOA review. To protect resident privacy, access is granted only after residency is verified.</p>
      <p>Please allow several days for review.</p>
      <p><a class="button" href="${safePortalUrl.replace("/resident-portal", "")}">Visit Public Website</a></p>
      <p>If you have questions, contact <a href="mailto:${contactEmail}">${contactEmail}</a>.</p>
      <p>Thank you,<br />Pristine Place HOA</p>
    </div>
    <div class="footer">This is an automated portal notification from Pristine Place HOA.</div>
  </div>
</body>
</html>`

  return { subject, text, html }
}

export function buildPortalRegistrationSubmissionAdminEmail(
  input: PortalRegistrationSubmissionAdminInput,
) {
  const safeReviewUrl = escapeHtml(input.reviewUrl)
  const safeFirstName = escapeHtml(input.firstName)
  const safeLastName = escapeHtml(input.lastName)
  const safeAddress = escapeHtml(input.homeAddress)
  const safeEmail = escapeHtml(input.emailAddress)
  const safeUsername = escapeHtml(input.username || "Not provided")
  const safeSubmittedAt = escapeHtml(input.submittedAt)

  const subject = `Portal Registration Review Required: ${input.firstName} ${input.lastName}`
  const text = [
    "A new resident portal registration request was submitted.",
    "",
    `Name: ${input.firstName} ${input.lastName}`,
    `Address: ${input.homeAddress}`,
    `Email: ${input.emailAddress}`,
    `Username: ${input.username || "Not provided"}`,
    `Submitted At: ${input.submittedAt}`,
    "",
    "Review request:",
    input.reviewUrl,
  ].join("\n")

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1f2937; }
    .container { max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: #1f3a8a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { border: 1px solid #e5e7eb; border-top: none; padding: 24px; }
    .button { display: inline-block; margin: 10px 0; padding: 10px 16px; border-radius: 6px; background: #1f3a8a; color: #ffffff !important; text-decoration: none; font-weight: 600; }
    .field { margin-bottom: 12px; }
    .label { font-weight: 700; color: #111827; }
    .value { color: #374151; }
    .footer { border: 1px solid #e5e7eb; border-top: none; background: #f9fafb; color: #6b7280; padding: 16px; border-radius: 0 0 8px 8px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 22px;">Portal Registration Review Required</h1>
    </div>
    <div class="content">
      <p>A new resident requested portal access and needs residency verification.</p>
      <div class="field"><span class="label">Name:</span> <span class="value">${safeFirstName} ${safeLastName}</span></div>
      <div class="field"><span class="label">Address:</span> <span class="value">${safeAddress}</span></div>
      <div class="field"><span class="label">Email:</span> <span class="value">${safeEmail}</span></div>
      <div class="field"><span class="label">Username:</span> <span class="value">${safeUsername}</span></div>
      <div class="field"><span class="label">Submitted At:</span> <span class="value">${safeSubmittedAt}</span></div>
      <p><a class="button" href="${safeReviewUrl}">Open Approval Queue</a></p>
      <p>If the button does not work, use this link:<br /><a href="${safeReviewUrl}">${safeReviewUrl}</a></p>
    </div>
    <div class="footer">This is an automated portal notification from Pristine Place HOA.</div>
  </div>
</body>
</html>`

  return { subject, text, html }
}

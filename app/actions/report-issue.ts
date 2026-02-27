// app/actions/report-issue.ts
"use server"

import { sendEmail } from "@/lib/email/service"
import { getEmailRecipients, getCategoryConfig, type IssueCategory } from "@/lib/email/routing-config"

export interface ReportIssueFormData {
  category: IssueCategory
  name: string
  address: string
  email: string
  phone?: string
  location?: string
  description: string
  dateNoticed: string
  urgency: "normal" | "urgent"
  // Photo uploads will be handled separately if needed
}

export async function submitIssueReport(data: ReportIssueFormData) {
  try {
    // Validate required fields
    if (!data.category || !data.name || !data.address || !data.email || !data.description) {
      return { success: false, error: "Please fill in all required fields" }
    }

    // Get email recipients based on category
    const recipients = getEmailRecipients(data.category)
    const categoryConfig = getCategoryConfig(data.category)

    if (!categoryConfig) {
      return { success: false, error: "Invalid issue category" }
    }

    // Build email subject
    const urgencyPrefix = data.urgency === "urgent" ? "[URGENT] " : ""
    const subject = `${urgencyPrefix}Issue Report: ${categoryConfig.label} - ${data.name}`

    // Build email HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3A5A40; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .field { margin-bottom: 20px; }
    .label { font-weight: 600; color: #1f2937; margin-bottom: 5px; }
    .value { color: #4b5563; }
    .urgent { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px; }
    .footer { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Issue Report</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">${categoryConfig.label}</p>
    </div>
    <div class="content">
      ${
        data.urgency === "urgent"
          ? '<div class="urgent"><strong>⚠️ URGENT:</strong> This issue has been marked as urgent and requires prompt attention.</div>'
          : ""
      }

      <div class="field">
        <div class="label">Category:</div>
        <div class="value">${categoryConfig.label}</div>
      </div>

      <div class="field">
        <div class="label">Submitted By:</div>
        <div class="value">${data.name}</div>
      </div>

      <div class="field">
        <div class="label">Address/Lot:</div>
        <div class="value">${data.address}</div>
      </div>

      <div class="field">
        <div class="label">Contact Email:</div>
        <div class="value"><a href="mailto:${data.email}">${data.email}</a></div>
      </div>

      ${
        data.phone
          ? `
      <div class="field">
        <div class="label">Phone:</div>
        <div class="value">${data.phone}</div>
      </div>
      `
          : ""
      }

      ${
        data.location
          ? `
      <div class="field">
        <div class="label">Location of Issue:</div>
        <div class="value">${data.location}</div>
      </div>
      `
          : ""
      }

      <div class="field">
        <div class="label">Date First Noticed:</div>
        <div class="value">${new Date(data.dateNoticed).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
      </div>

      <div class="field">
        <div class="label">Issue Description:</div>
        <div class="value" style="white-space: pre-wrap;">${data.description}</div>
      </div>

      <div class="field">
        <div class="label">Priority:</div>
        <div class="value">${data.urgency === "urgent" ? "🔴 Urgent" : "🟢 Normal"}</div>
      </div>
    </div>
    <div class="footer">
      This issue report was submitted via the Pristine Place HOA Resident Portal<br>
      <small>Submitted on ${new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}</small>
    </div>
  </div>
</body>
</html>
    `

    // Send email
    const result = await sendEmail({
      to: recipients.to,
      cc: recipients.cc,
      subject,
      html,
    })

    if (!result.success) {
      return { success: false, error: result.error || "Failed to send email" }
    }

    return { success: true }
  } catch (error) {
    console.error("Issue report submission error:", error)
    return { success: false, error: "An unexpected error occurred. Please try again." }
  }
}

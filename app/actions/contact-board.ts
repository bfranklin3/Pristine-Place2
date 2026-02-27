// app/actions/contact-board.ts
"use server"

import { sendEmail } from "@/lib/email/service"

export interface ContactBoardFormData {
  name: string
  address: string
  email: string
  phone?: string
  preferredContact: "email" | "phone"
  subject: string
  message: string
  responseTimeline: "no-rush" | "within-week" | "asap"
}

export async function submitContactBoard(data: ContactBoardFormData) {
  try {
    // Validate required fields
    if (!data.name || !data.address || !data.email || !data.subject || !data.message) {
      return { success: false, error: "Please fill in all required fields" }
    }

    // Build email subject
    const subjectLine = `Board Contact: ${data.subject} - ${data.name}`

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
    .message-box { background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #3A5A40; margin: 20px 0; }
    .timeline-badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; }
    .timeline-asap { background: #fef3c7; color: #92400e; }
    .timeline-week { background: #dbeafe; color: #1e40af; }
    .timeline-no-rush { background: #f3f4f6; color: #374151; }
    .footer { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Contact Board Submission</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">From: ${data.name}</p>
    </div>
    <div class="content">

      <div class="field">
        <div class="label">Subject:</div>
        <div class="value" style="font-size: 18px; font-weight: 600; color: #1f2937;">${data.subject}</div>
      </div>

      <div class="field">
        <div class="label">Preferred Response Timeline:</div>
        <div>
          ${
            data.responseTimeline === "asap"
              ? '<span class="timeline-badge timeline-asap">⚡ As Soon As Possible</span>'
              : data.responseTimeline === "within-week"
                ? '<span class="timeline-badge timeline-week">📅 Within a Week</span>'
                : '<span class="timeline-badge timeline-no-rush">😌 No Rush</span>'
          }
        </div>
      </div>

      <div class="message-box">
        <div class="label">Message:</div>
        <div class="value" style="white-space: pre-wrap; line-height: 1.7; margin-top: 10px;">${data.message}</div>
      </div>

      <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
        <h3 style="margin: 0 0 15px 0; color: #1f2937;">Contact Information</h3>

        <div class="field">
          <div class="label">Name:</div>
          <div class="value">${data.name}</div>
        </div>

        <div class="field">
          <div class="label">Address / Lot:</div>
          <div class="value">${data.address}</div>
        </div>

        <div class="field">
          <div class="label">Email Address:</div>
          <div class="value"><a href="mailto:${data.email}">${data.email}</a></div>
        </div>

        ${
          data.phone
            ? `
        <div class="field">
          <div class="label">Phone Number:</div>
          <div class="value">${data.phone}</div>
        </div>
        `
            : ""
        }

        <div class="field">
          <div class="label">Preferred Contact Method:</div>
          <div class="value">${data.preferredContact === "email" ? "📧 Email" : "📞 Phone"}</div>
        </div>
      </div>

    </div>
    <div class="footer">
      This message was submitted via the Pristine Place HOA Resident Portal<br>
      <small>Submitted on ${new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}</small>
    </div>
  </div>
</body>
</html>
    `

    // Send email to board
    const result = await sendEmail({
      to: "bod@pristineplace.us",
      subject: subjectLine,
      html,
    })

    if (!result.success) {
      return { success: false, error: result.error || "Failed to send message" }
    }

    return { success: true }
  } catch (error) {
    console.error("Contact board submission error:", error)
    return { success: false, error: "An unexpected error occurred. Please try again." }
  }
}

// lib/email/service.ts
// Email service abstraction layer - easy to swap Nodemailer for Resend

import nodemailer from "nodemailer"

export interface SendEmailOptions {
  to: string | string[]
  cc?: string | string[]
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType: string
  }>
}

/**
 * Send an email using the configured email service
 * Currently uses Nodemailer - can easily swap for Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // ── Nodemailer Implementation ──────────────────────────────
    // To switch to Resend, replace this entire block with Resend API calls
    const host = process.env.EMAIL_HOST?.trim()
    const portRaw = process.env.EMAIL_PORT?.trim() || "587"
    const port = Number.parseInt(portRaw, 10)
    const user = process.env.EMAIL_USER?.trim()
    const pass = process.env.EMAIL_PASS
    const authMethodRaw = process.env.EMAIL_AUTH_METHOD?.trim().toUpperCase()
    const authMethod = authMethodRaw === "LOGIN" || authMethodRaw === "PLAIN" ? authMethodRaw : undefined

    if (!host || !user || !pass || Number.isNaN(port)) {
      console.warn("Email send skipped: SMTP environment variables are incomplete.")
      return {
        success: false,
        error: "Email notifications are temporarily unavailable.",
      }
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      authMethod,
      auth: {
        user,
        pass,
      },
    })

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(", ") : options.cc) : undefined,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    }

    await transporter.sendMail(mailOptions)

    return { success: true }
  } catch (error) {
    console.error("Email send error:", error)
    return {
      success: false,
      error: "Email notifications are temporarily unavailable.",
    }
  }
}

/* ── RESEND IMPLEMENTATION (commented out) ─────────────────────
 * To switch to Resend:
 * 1. Install: npm install resend
 * 2. Add RESEND_API_KEY to .env.local
 * 3. Uncomment this code and comment out the Nodemailer code above
 */

/*
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@pristineplace.us',
      to: Array.isArray(options.to) ? options.to : [options.to],
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    })

    return { success: true }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}
*/

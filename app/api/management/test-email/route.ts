import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { requireManagementApiAccess } from "@/lib/auth/portal-management-api"

interface TestEmailPayload {
  to?: string
  subject?: string
  body?: string
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function explainError(error: unknown) {
  const e = (error || {}) as {
    message?: string
    code?: string
    command?: string
    response?: string
    responseCode?: number
  }

  let likelyCause = "Unknown SMTP error."
  if (e.code === "EAUTH") likelyCause = "SMTP authentication failed. Check EMAIL_USER / EMAIL_PASS."
  else if (e.code === "ECONNECTION") likelyCause = "Could not connect to SMTP host/port."
  else if (e.code === "ETIMEDOUT") likelyCause = "SMTP timeout. Network or firewall issue."
  else if (e.code === "ESOCKET") likelyCause = "TLS/SSL socket error. Check EMAIL_PORT and secure mode."
  else if (typeof e.responseCode === "number" && e.responseCode >= 500) likelyCause = "SMTP server rejected command."

  return {
    message: e.message || "SMTP error",
    code: e.code || null,
    command: e.command || null,
    responseCode: e.responseCode ?? null,
    response: e.response || null,
    likelyCause,
  }
}

export async function POST(req: NextRequest) {
  const access = await requireManagementApiAccess(["admin"])
  if (!access.ok) return access.response

  const payload = (await req.json().catch(() => ({}))) as TestEmailPayload
  const to = (payload.to || "").trim()
  const subject = (payload.subject || "").trim()
  const body = (payload.body || "").trim()

  if (!to || !subject || !body) {
    return NextResponse.json(
      { error: "Missing required fields", detail: "Provide recipient email, subject, and body." },
      { status: 400 },
    )
  }
  if (!isValidEmail(to)) {
    return NextResponse.json({ error: "Invalid recipient email address." }, { status: 400 })
  }

  const host = process.env.EMAIL_HOST?.trim() || ""
  const portRaw = process.env.EMAIL_PORT?.trim() || "587"
  const port = Number.parseInt(portRaw, 10)
  const user = process.env.EMAIL_USER?.trim() || ""
  const pass = process.env.EMAIL_PASS || ""
  const from = (process.env.EMAIL_FROM || process.env.EMAIL_USER || "").trim()
  const secure = port === 465
  const authMethodRaw = process.env.EMAIL_AUTH_METHOD?.trim().toUpperCase()
  const authMethod = authMethodRaw === "LOGIN" || authMethodRaw === "PLAIN" ? authMethodRaw : undefined

  const diagnostics = {
    timestamp: new Date().toISOString(),
    requestedBy: access.identity.userId,
    smtpConfig: {
      hasHost: Boolean(host),
      hasPort: !Number.isNaN(port),
      hasUser: Boolean(user),
      hasPass: Boolean(pass),
      hasFrom: Boolean(from),
      host: host || null,
      port: Number.isNaN(port) ? null : port,
      secure,
      authMethod: authMethod || "auto",
      from: from || null,
    },
  }

  if (!host || !user || !pass || !from || Number.isNaN(port)) {
    return NextResponse.json(
      {
        success: false,
        error: "SMTP configuration incomplete",
        detail: "Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, and EMAIL_FROM.",
        diagnostics,
      },
      { status: 500 },
    )
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    authMethod,
    auth: { user, pass },
  })

  const verifyStart = Date.now()
  try {
    await transporter.verify()
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "SMTP verify failed",
        detail: "Transport could not be verified before send.",
        diagnostics: {
          ...diagnostics,
          verifyMs: Date.now() - verifyStart,
          verifyError: explainError(error),
        },
      },
      { status: 502 },
    )
  }

  const sendStart = Date.now()
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: body,
      html: `<pre style="font-family:inherit;white-space:pre-wrap;margin:0">${escapeHtml(body)}</pre>`,
    })

    return NextResponse.json({
      success: true,
      message: "Email sent.",
      diagnostics: {
        ...diagnostics,
        verifyMs: Date.now() - verifyStart,
        sendMs: Date.now() - sendStart,
        messageId: info.messageId || null,
        response: info.response || null,
        accepted: info.accepted || [],
        rejected: info.rejected || [],
        pending: info.pending || [],
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Send failed",
        detail: "SMTP accepted connection but failed during send.",
        diagnostics: {
          ...diagnostics,
          verifyMs: Date.now() - verifyStart,
          sendMs: Date.now() - sendStart,
          sendError: explainError(error),
        },
      },
      { status: 502 },
    )
  }
}

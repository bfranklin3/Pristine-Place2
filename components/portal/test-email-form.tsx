"use client"

import { useState } from "react"
import { AlertCircle, CheckCircle2, Copy, Loader2, Mail } from "lucide-react"

type TestEmailResponse = {
  success: boolean
  error?: string
  detail?: string
  message?: string
  diagnostics?: unknown
}

export function TestEmailForm({ currentUserEmail = "" }: { currentUserEmail?: string }) {
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("Pristine Place Portal Test Email")
  const [body, setBody] = useState("This is a test email from the Resident Portal management page.")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TestEmailResponse | null>(null)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch("/api/management/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body }),
      })
      const json = (await res.json().catch(() => ({}))) as TestEmailResponse
      if (!res.ok) {
        setResult({
          success: false,
          error: json.error || "Failed to send test email",
          detail: json.detail,
          diagnostics: json.diagnostics,
        })
      } else {
        setResult({
          success: true,
          message: json.message || "Email sent.",
          diagnostics: json.diagnostics,
        })
      }
    } catch (error) {
      setResult({
        success: false,
        error: "Request failed",
        detail: error instanceof Error ? error.message : "Unknown network error",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyDiagnostics() {
    if (!result?.diagnostics) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(result.diagnostics, null, 2))
      setCopyStatus("Diagnostics copied.")
    } catch {
      setCopyStatus("Copy failed. Browser blocked clipboard access.")
    }
    window.setTimeout(() => setCopyStatus(null), 2500)
  }

  return (
    <div className="stack" style={{ gap: "var(--space-l)" }}>
      <form onSubmit={onSubmit} className="stack" style={{ gap: "0.9rem" }}>
        <div className="card" style={{ padding: "1rem" }}>
          <div className="stack" style={{ gap: "0.8rem" }}>
            <div>
              <label className="text-fluid-sm font-semibold" htmlFor="test-email-to" style={{ display: "block", marginBottom: "0.35rem" }}>
                Addressee Email
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.55rem", alignItems: "center" }}>
                <input
                  id="test-email-to"
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="name@example.com"
                  required
                  style={{
                    width: "100%",
                    borderRadius: "var(--radius-sm)",
                    border: "1.5px solid var(--pp-slate-200)",
                    padding: "0.65rem 0.75rem",
                    fontSize: "0.95rem",
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={!currentUserEmail}
                  onClick={() => setTo(currentUserEmail)}
                  title={currentUserEmail ? `Use ${currentUserEmail}` : "No signed-in email found"}
                  style={{ whiteSpace: "nowrap" }}
                >
                  Send to myself
                </button>
              </div>
            </div>

            <div>
              <label className="text-fluid-sm font-semibold" htmlFor="test-email-subject" style={{ display: "block", marginBottom: "0.35rem" }}>
                Subject
              </label>
              <input
                id="test-email-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                style={{
                  width: "100%",
                  borderRadius: "var(--radius-sm)",
                  border: "1.5px solid var(--pp-slate-200)",
                  padding: "0.65rem 0.75rem",
                  fontSize: "0.95rem",
                }}
              />
            </div>

            <div>
              <label className="text-fluid-sm font-semibold" htmlFor="test-email-body" style={{ display: "block", marginBottom: "0.35rem" }}>
                Body
              </label>
              <textarea
                id="test-email-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={8}
                style={{
                  width: "100%",
                  borderRadius: "var(--radius-sm)",
                  border: "1.5px solid var(--pp-slate-200)",
                  padding: "0.65rem 0.75rem",
                  fontSize: "0.95rem",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: "9.5rem" }}>
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" style={{ width: "0.95rem", height: "0.95rem" }} />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail style={{ width: "0.95rem", height: "0.95rem" }} />
                    Send Test Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {result ? (
        <div
          className="card"
          style={{
            padding: "1rem",
            borderColor: result.success ? "#86efac" : "#fca5a5",
            background: result.success ? "#f0fdf4" : "#fef2f2",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.5rem" }}>
            {result.success ? (
              <CheckCircle2 style={{ width: "1rem", height: "1rem", color: "#166534" }} />
            ) : (
              <AlertCircle style={{ width: "1rem", height: "1rem", color: "#991b1b" }} />
            )}
            <strong style={{ color: result.success ? "#166534" : "#991b1b" }}>
              {result.success ? result.message || "Email sent." : result.error || "Send failed"}
            </strong>
          </div>
          {result.detail ? (
            <p style={{ margin: "0 0 0.65rem 0", color: result.success ? "#166534" : "#991b1b" }}>{result.detail}</p>
          ) : null}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
              <p style={{ margin: 0, fontWeight: 600, color: "var(--pp-navy-dark)" }}>Diagnostics</p>
              <button type="button" className="btn btn-secondary" onClick={handleCopyDiagnostics} style={{ fontSize: "0.78rem", padding: "0.3rem 0.5rem" }}>
                <Copy style={{ width: "0.85rem", height: "0.85rem" }} />
                Copy diagnostics
              </button>
            </div>
            <pre
              style={{
                margin: 0,
                fontSize: "0.78rem",
                lineHeight: 1.45,
                background: "var(--pp-white)",
                border: "1px solid var(--pp-slate-200)",
                borderRadius: "var(--radius-sm)",
                padding: "0.65rem",
                overflowX: "auto",
                color: "var(--pp-slate-700)",
              }}
            >
              {JSON.stringify(result.diagnostics || {}, null, 2)}
            </pre>
            {copyStatus ? (
              <p className="text-fluid-sm" style={{ margin: "0.35rem 0 0 0", color: "var(--pp-slate-700)" }}>
                {copyStatus}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

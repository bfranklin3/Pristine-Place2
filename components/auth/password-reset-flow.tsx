"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSignIn } from "@clerk/nextjs"

type PasswordResetFlowProps = {
  title: string
  description: string
  initialEmail?: string
  backHref?: string
  backLabel?: string
  showBackLink?: boolean
  requestButtonLabel?: string
  verifyButtonLabel?: string
  codeSentMessage?: string
}

type ClerkUiError = {
  errors?: Array<{ message?: string }>
}

function getErrorMessage(error: unknown, fallback: string) {
  const parsed = error as ClerkUiError
  return parsed?.errors?.[0]?.message || fallback
}

export default function PasswordResetFlow({
  title,
  description,
  initialEmail = "",
  backHref = "/sign-in",
  backLabel = "Back to Sign In",
  showBackLink = true,
  requestButtonLabel = "Send Reset Code",
  verifyButtonLabel = "Reset Password",
  codeSentMessage = "Verification code sent. Check your email.",
}: PasswordResetFlowProps) {
  const router = useRouter()
  const { isLoaded, signIn, setActive } = useSignIn()

  const [step, setStep] = useState<"request" | "verify">("request")
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function sendCode(event: FormEvent) {
    event.preventDefault()
    if (!isLoaded || !signIn) return

    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      })
      setStep("verify")
      setMessage(codeSentMessage)
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Unable to send reset code."))
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault()
    if (!isLoaded || !signIn) return
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
        password,
      })

      if (result.status === "complete" && result.createdSessionId) {
        await setActive?.({ session: result.createdSessionId })
        router.push("/resident-portal")
        return
      }

      setMessage("Password updated. Please sign in with your new password.")
      router.push("/sign-in")
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Unable to reset password."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section" style={{ background: "var(--pp-slate-50)", minHeight: "70vh" }}>
      <div className="container" style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            width: "min(540px, 100%)",
            background: "var(--pp-white)",
            border: "1px solid var(--pp-slate-200)",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <h1 style={{ color: "var(--pp-navy-dark)", margin: 0 }}>{title}</h1>
          <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", marginTop: "0.4rem" }}>
            {description}
          </p>

          {error ? <div style={{ marginTop: "0.8rem", color: "#b91c1c", fontSize: "0.9rem" }}>{error}</div> : null}
          {message ? (
            <div style={{ marginTop: "0.8rem", color: "#166534", fontSize: "0.9rem" }}>{message}</div>
          ) : null}

          {step === "request" ? (
            <form onSubmit={sendCode} style={{ marginTop: "1rem", display: "grid", gap: "0.8rem" }}>
              <label style={{ display: "grid", gap: "0.3rem", color: "var(--pp-slate-700)", fontSize: "0.9rem" }}>
                Email Address
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  style={{ border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)", padding: "0.55rem" }}
                />
              </label>
              <button type="submit" className="btn btn-primary" disabled={busy || !isLoaded}>
                {busy ? "Sending..." : requestButtonLabel}
              </button>
            </form>
          ) : (
            <form onSubmit={resetPassword} style={{ marginTop: "1rem", display: "grid", gap: "0.8rem" }}>
              <label style={{ display: "grid", gap: "0.3rem", color: "var(--pp-slate-700)", fontSize: "0.9rem" }}>
                Verification Code
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoComplete="one-time-code"
                  style={{ border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)", padding: "0.55rem" }}
                />
              </label>
              <label style={{ display: "grid", gap: "0.3rem", color: "var(--pp-slate-700)", fontSize: "0.9rem" }}>
                New Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  style={{ border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)", padding: "0.55rem" }}
                />
              </label>
              <label style={{ display: "grid", gap: "0.3rem", color: "var(--pp-slate-700)", fontSize: "0.9rem" }}>
                Confirm New Password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  style={{ border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)", padding: "0.55rem" }}
                />
              </label>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <button type="submit" className="btn btn-primary" disabled={busy || !isLoaded}>
                  {busy ? "Resetting..." : verifyButtonLabel}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setStep("request")} disabled={busy}>
                  Send New Code
                </button>
              </div>
            </form>
          )}

          {showBackLink ? (
            <div style={{ marginTop: "1rem" }}>
              <Link href={backHref} className="btn btn-outline btn-sm">
                {backLabel}
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

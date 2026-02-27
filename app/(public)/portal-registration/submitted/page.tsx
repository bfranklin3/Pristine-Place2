"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"

const REDIRECT_SECONDS = 8

export default function PortalRegistrationSubmittedPage() {
  const router = useRouter()
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS)

  useEffect(() => {
    const countdown = window.setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0))
    }, 1000)

    const redirectTimer = window.setTimeout(() => {
      router.replace("/")
    }, REDIRECT_SECONDS * 1000)

    return () => {
      window.clearInterval(countdown)
      window.clearTimeout(redirectTimer)
    }
  }, [router])

  return (
    <>
      <section className="hero-section" style={{ background: "var(--pp-navy-dark)" }}>
        <div
          className="hero-overlay"
          style={{ background: "linear-gradient(135deg, #1b2e1b 0%, #3A5A40 60%, #2c4a32 100%)" }}
        />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <h1 className="hero-title">Registration Submitted</h1>
          <p className="hero-subtitle" style={{ maxWidth: "60ch" }}>
            Your request was received successfully and will be reviewed by the HOA to verify residency.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="card stack" style={{ gap: "var(--space-m)", padding: "var(--space-l)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <CheckCircle2 style={{ width: "1.2rem", height: "1.2rem", color: "#166534" }} />
              <h2 style={{ margin: 0, color: "var(--pp-navy-dark)" }}>Thank you for registering</h2>
            </div>
            <p className="text-fluid-base" style={{ color: "var(--pp-slate-700)", margin: 0 }}>
              Access approval typically takes several days. In the meantime, feel free to use the public portion of the website.
            </p>
            <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", margin: 0 }}>
              Redirecting to the public home page in {secondsLeft} second{secondsLeft === 1 ? "" : "s"}...
            </p>
            <div className="cluster" style={{ gap: "0.6rem" }}>
              <Link href="/" className="btn btn-primary">
                Go to Public Home
              </Link>
              <Link href="/contact" className="btn btn-outline">
                Contact HOA
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

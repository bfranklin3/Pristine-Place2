import type { Metadata } from "next"
import { currentUser } from "@clerk/nextjs/server"
import { MailCheck, Shield } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { requirePortalRolePageAccess } from "@/lib/auth/portal-admin"
import { TestEmailForm } from "@/components/portal/test-email-form"

export const metadata: Metadata = {
  title: `Email Test | ${siteConfig.name} Resident Portal`,
  description: "Admin-only email test and SMTP diagnostics page.",
}

export default async function TestEmailPage() {
  await requirePortalRolePageAccess(["admin"], "/resident-portal/management/test-email")
  const user = await currentUser()
  const currentUserEmail =
    user?.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress || ""

  return (
    <>
      <section className="hero-section" style={{ background: "var(--pp-navy-dark)" }}>
        <div
          className="hero-overlay"
          style={{ background: "linear-gradient(135deg, #1b2e1b 0%, #3A5A40 60%, #2c4a32 100%)" }}
        />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <Shield style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
            <span
              className="text-fluid-sm font-semibold"
              style={{ color: "var(--pp-gold-light)", textTransform: "uppercase", letterSpacing: "0.1em" }}
            >
              Management
            </span>
          </div>
          <h1 className="hero-title">Email Test</h1>
          <p className="hero-subtitle" style={{ maxWidth: "56ch" }}>
            Send a real test email and inspect SMTP diagnostics to confirm delivery pipeline health.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <MailCheck style={{ width: "1.2rem", height: "1.2rem", color: "var(--pp-navy)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Send Test Message</h2>
            </div>
            <TestEmailForm currentUserEmail={currentUserEmail} />
          </div>
        </div>
      </section>
    </>
  )
}

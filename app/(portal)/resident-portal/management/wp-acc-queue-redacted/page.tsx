import type { Metadata } from "next"
import { Shield, FileText } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { AccQueueTable } from "@/components/portal/acc-queue-table"
import { requirePortalCapabilityPageAccess } from "@/lib/auth/portal-admin"

export const metadata: Metadata = {
  title: `ACC Workflow Queue (Redacted) | ${siteConfig.name} Resident Portal`,
  description: "View ACC permit requests with sensitive identity fields redacted.",
}

export default async function WpAccQueueRedactedPage() {
  await requirePortalCapabilityPageAccess(["acc.view"], "/resident-portal/management/wp-acc-queue-redacted")

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
          <h1 className="hero-title">ACC Workflow Queue (Redacted)</h1>
          <p className="hero-subtitle" style={{ maxWidth: "56ch" }}>
            Identity fields are redacted in this view while addresses and permit workflow details remain visible.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <FileText style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)" }}>ACC Permit Requests (Redacted)</h2>
            </div>

            <div
              style={{
                border: "1px solid #fcd34d",
                background: "#fffbeb",
                color: "#92400e",
                borderRadius: "var(--radius-md)",
                padding: "0.65rem 0.8rem",
              }}
            >
              <p className="text-fluid-sm" style={{ margin: 0 }}>
                Temporary mode: this page reads and writes directly to the legacy WordPress Gravity Forms source.
              </p>
            </div>

            <AccQueueTable viewMode="redacted" />
          </div>
        </div>
      </section>
    </>
  )
}

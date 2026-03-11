import type { Metadata } from "next"
import { FileText, Shield } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { requirePortalRolePageAccess } from "@/lib/auth/portal-admin"
import { AccCombinedDashboardTable } from "@/components/portal/acc-combined-dashboard-table"

export const metadata: Metadata = {
  title: `ACC All Submissions (Redacted) | ${siteConfig.name} Resident Portal`,
  description: "Combined redacted ACC dashboard across native workflow and WordPress legacy submissions.",
}

export default async function AccDashboardRedactedPage() {
  await requirePortalRolePageAccess(["admin"], "/resident-portal/management/acc-dashboard-redacted")

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
          <h1 className="hero-title">ACC All Submissions (Redacted)</h1>
          <p className="hero-subtitle" style={{ maxWidth: "58ch" }}>
            Combined ACC dashboard with resident identity fields redacted while addresses, request summaries, and statuses remain visible.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <FileText style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Combined ACC Dashboard (Redacted)</h2>
            </div>

            <AccCombinedDashboardTable viewMode="redacted" />
          </div>
        </div>
      </section>
    </>
  )
}

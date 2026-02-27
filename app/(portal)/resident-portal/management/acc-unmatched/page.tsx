import type { Metadata } from "next"
import { AlertTriangle, Shield } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { requirePortalRolePageAccess } from "@/lib/auth/portal-admin"
import { AccUnmatchedQueueTable } from "@/components/portal/acc-unmatched-queue-table"

export const metadata: Metadata = {
  title: `ACC Unmatched Queue | ${siteConfig.name} Resident Portal`,
  description: "Operational queue for ACC requests that do not yet have a confirmed resident match.",
}

export default async function AccUnmatchedPage() {
  await requirePortalRolePageAccess(["admin"], "/resident-portal/management/acc-unmatched")

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
          <h1 className="hero-title">ACC Unmatched Queue</h1>
          <p className="hero-subtitle" style={{ maxWidth: "58ch" }}>
            Requests without a confirmed resident match. Address-exact items are prioritized for fast manual resolution.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <AlertTriangle style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Unresolved Matching Worklist</h2>
            </div>
            <AccUnmatchedQueueTable />
          </div>
        </div>
      </section>
    </>
  )
}

import type { Metadata } from "next"
import { KeyRound, Shield } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { AccessManagementTable } from "@/components/portal/access-management-table"
import { requirePortalCapabilityPageAccess } from "@/lib/auth/portal-admin"

export const metadata: Metadata = {
  title: `Resident Access Management | ${siteConfig.name} Resident Portal`,
  description: "Manage resident gate access and related access-control operations.",
}

export default async function AccessManagementPage() {
  await requirePortalCapabilityPageAccess(["access.view"], "/resident-portal/management/access")

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
          <h1 className="hero-title">Resident Access Management</h1>
          <p className="hero-subtitle" style={{ maxWidth: "56ch" }}>
            Manage resident and visitor access workflows for the Pristine Place community.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <KeyRound style={{ width: "1.2rem", height: "1.2rem", color: "var(--pp-navy)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Access Control</h2>
            </div>
            <AccessManagementTable />
          </div>
        </div>
      </section>
    </>
  )
}

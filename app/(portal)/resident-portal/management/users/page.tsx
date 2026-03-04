import type { Metadata } from "next"
import { Shield, Users } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { requirePortalAdminPageAccess } from "@/lib/auth/portal-admin"
import { ResidentDirectoryTable } from "@/components/portal/resident-directory-table"

export const metadata: Metadata = {
  title: `Portal User Management | ${siteConfig.name} Resident Portal`,
  description: "View all registered Clerk users and their resident-portal registration status.",
}

export default async function PortalUserManagementPage() {
  await requirePortalAdminPageAccess("/resident-portal/management/users")

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
          <h1 className="hero-title">Portal User Management</h1>
          <p className="hero-subtitle" style={{ maxWidth: "60ch" }}>
            View all Clerk accounts, filter by portal registration status, manage approvals, and assign committee access.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Users style={{ width: "1.2rem", height: "1.2rem", color: "var(--pp-navy)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Portal Accounts & Registration Status</h2>
            </div>
            <ResidentDirectoryTable />
          </div>
        </div>
      </section>
    </>
  )
}

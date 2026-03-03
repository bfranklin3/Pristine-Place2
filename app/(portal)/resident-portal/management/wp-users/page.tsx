// app/(portal)/resident-portal/management/wp-users/page.tsx

import type { Metadata } from "next"
import { Shield, Users } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { UserManagementTable } from "@/components/portal/user-management-table"
import { requirePortalAdminPageAccess } from "@/lib/auth/portal-admin"

export const metadata: Metadata = {
  title: `User Management | ${siteConfig.name} Resident Portal`,
  description: "Create, edit, and manage WordPress user accounts for the Pristine Place portal.",
}

export default async function UserManagementPage() {
  await requirePortalAdminPageAccess("/resident-portal/management/wp-users")

  return (
    <>

      {/* ── Hero ── */}
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
          <h1 className="hero-title">User Management</h1>
          <p className="hero-subtitle" style={{ maxWidth: "50ch" }}>
            Create, edit, and manage WordPress user accounts for the {siteConfig.name} portal.
          </p>
        </div>
      </section>

      {/* ── User Table ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Users style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)" }}>WordPress Users</h2>
            </div>

            <UserManagementTable />

          </div>
        </div>
      </section>

    </>
  )
}

import type { Metadata } from "next"
import { ShieldCheck, Settings } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { requirePortalAdminPageAccess } from "@/lib/auth/portal-admin"
import { adminHubSections } from "@/lib/admin-hub-links"
import { AdminHubSections } from "@/components/portal/admin-hub-sections"

export const metadata: Metadata = {
  title: `Admin Hub | ${siteConfig.name} Resident Portal`,
  description: "Centralized administration links for website operations and platform dashboards.",
}

export default async function AdminHubPage() {
  await requirePortalAdminPageAccess("/resident-portal/management/admin-hub")

  return (
    <>
      <section className="hero-section" style={{ background: "var(--pp-navy-dark)" }}>
        <div
          className="hero-overlay"
          style={{ background: "linear-gradient(135deg, #1b2e1b 0%, #3A5A40 60%, #2c4a32 100%)" }}
        />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <ShieldCheck style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
            <span
              className="text-fluid-sm font-semibold"
              style={{ color: "var(--pp-gold-light)", textTransform: "uppercase", letterSpacing: "0.1em" }}
            >
              Management
            </span>
          </div>
          <h1 className="hero-title">Admin Hub</h1>
          <p className="hero-subtitle" style={{ maxWidth: "56ch" }}>
            One place for core website administration tools used by HOA admins.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "72rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Settings style={{ width: "1.2rem", height: "1.2rem", color: "var(--pp-navy)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Administration Tools</h2>
            </div>
            <AdminHubSections sections={adminHubSections} />
          </div>
        </div>
      </section>
    </>
  )
}

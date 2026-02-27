import type { Metadata } from "next"
import { KeyRound, Shield } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { WpAccessManagementTable } from "@/components/portal/wp-access-management-table"
import { requirePortalRolePageAccess } from "@/lib/auth/portal-admin"

export const metadata: Metadata = {
  title: `Resident Access Wordpress | ${siteConfig.name} Resident Portal`,
  description: "Temporary WordPress-based resident gate access management page.",
}

export default async function WordPressAccessManagementPage() {
  await requirePortalRolePageAccess(["admin", "access_control"], "/resident-portal/management/wp-access")

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
          <h1 className="hero-title">Resident Access Wordpress</h1>
          <p className="hero-subtitle" style={{ maxWidth: "56ch" }}>
            Temporary WordPress-connected gate access management while migration is in progress.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <KeyRound style={{ width: "1.2rem", height: "1.2rem", color: "var(--pp-navy)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Access Control (WordPress)</h2>
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
            <WpAccessManagementTable />
          </div>
        </div>
      </section>
    </>
  )
}

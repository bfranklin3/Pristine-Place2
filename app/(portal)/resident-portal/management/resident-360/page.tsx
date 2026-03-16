import type { Metadata } from "next"
import { Users, Shield } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { requirePortalRolePageAccess } from "@/lib/auth/portal-admin"
import { Resident360Table } from "@/components/portal/resident-360-table"

export const metadata: Metadata = {
  title: `Resident 360 Lookup | ${siteConfig.name} Resident Portal`,
  description: "Unified resident lookup across access control profiles and confirmed ACC permit requests.",
}

export default async function Resident360Page() {
  await requirePortalRolePageAccess(["admin"], "/resident-portal/management/resident-360")

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
          <h1 className="hero-title">Resident 360 Lookup</h1>
          <p className="hero-subtitle" style={{ maxWidth: "60ch" }}>
            Search a resident and review address, household contacts, gate credentials, and confirmed ACC request history in one place.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Users style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Unified Resident Report</h2>
            </div>
            <Resident360Table />
          </div>
        </div>
      </section>
    </>
  )
}

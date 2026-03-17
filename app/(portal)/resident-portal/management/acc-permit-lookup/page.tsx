import type { Metadata } from "next"
import { FileSearch, Shield } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { requirePortalRolePageAccess } from "@/lib/auth/portal-admin"
import { AccPermitLookupTable } from "@/components/portal/acc-permit-lookup-table"

export const metadata: Metadata = {
  title: `ACC Permit Lookup | ${siteConfig.name} Resident Portal`,
  description: "Redacted property permit history for Board and admin review.",
}

export default async function AccPermitLookupPage() {
  await requirePortalRolePageAccess(
    ["admin", "board_of_directors"],
    "/resident-portal/management/acc-permit-lookup",
  )

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
          <h1 className="hero-title">ACC Permit Lookup</h1>
          <p className="hero-subtitle" style={{ maxWidth: "60ch" }}>
            Redacted property permit history for Board and admin review.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <FileSearch style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Redacted ACC Permit History</h2>
            </div>
            <AccPermitLookupTable />
          </div>
        </div>
      </section>
    </>
  )
}

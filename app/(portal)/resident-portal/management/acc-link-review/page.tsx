import type { Metadata } from "next"
import { Shield, Link2 } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { requirePortalRolePageAccess } from "@/lib/auth/portal-admin"
import { AccLinkReviewTable } from "@/components/portal/acc-link-review-table"

export const metadata: Metadata = {
  title: `ACC Link Review | ${siteConfig.name} Resident Portal`,
  description: "Resolve unresolved and low-confidence ACC resident links using guided candidate selection.",
}

export default async function AccLinkReviewPage() {
  await requirePortalRolePageAccess(
    ["admin", "acc"],
    "/resident-portal/management/acc-link-review",
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
          <h1 className="hero-title">ACC Link Review</h1>
          <p className="hero-subtitle" style={{ maxWidth: "58ch" }}>
            Review unresolved or low-confidence ACC links and assign the correct current resident record.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Link2 style={{ width: "1.2rem", height: "1.2rem", color: "var(--pp-navy)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Manual Link Resolution</h2>
            </div>
            <AccLinkReviewTable />
          </div>
        </div>
      </section>
    </>
  )
}

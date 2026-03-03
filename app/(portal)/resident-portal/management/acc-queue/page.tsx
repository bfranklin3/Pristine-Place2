import type { Metadata } from "next"
import { Database, Shield } from "lucide-react"
import Link from "next/link"
import { siteConfig } from "@/lib/site-config"
import { requirePortalCapabilityPageAccess } from "@/lib/auth/portal-admin"

export const metadata: Metadata = {
  title: `ACC Workflow Queue | ${siteConfig.name} Resident Portal`,
  description: "Neon-backed ACC workflow queue (target state).",
}

export default async function AccQueuePage() {
  await requirePortalCapabilityPageAccess(["acc.view"], "/resident-portal/management/acc-queue")

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
          <h1 className="hero-title">ACC Workflow Queue</h1>
          <p className="hero-subtitle" style={{ maxWidth: "56ch" }}>
            Target-state ACC queue powered by Neon. Data wiring will be connected after migration and validation.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Database style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Neon ACC Queue (Setup Pending)</h2>
            </div>
            <div
              style={{
                border: "1px solid var(--pp-slate-200)",
                background: "var(--pp-slate-50)",
                color: "var(--pp-slate-700)",
                borderRadius: "var(--radius-md)",
                padding: "0.75rem 0.9rem",
              }}
            >
              <p className="text-fluid-sm" style={{ margin: 0 }}>
                This page is intentionally not wired yet. Next steps are schema migration, ACC import into Neon,
                and then enabling the Neon-backed queue.
              </p>
            </div>
            <div>
              <Link href="/resident-portal/management/acc-match-review" className="btn btn-secondary">
                Open ACC Match Review
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

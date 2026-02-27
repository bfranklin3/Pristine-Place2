import type { Metadata } from "next"
import { ShieldCheck, UserCheck } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { ResidentApprovalsTable } from "@/components/portal/resident-approvals-table"
import { requirePortalAdminPageAccess } from "@/lib/auth/portal-admin"

export const metadata: Metadata = {
  title: `Resident Approval Queue | ${siteConfig.name} Resident Portal`,
  description: "Approve resident portal access requests submitted through Clerk registration workflow.",
}

export default async function ResidentApprovalsPage() {
  await requirePortalAdminPageAccess()

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
          <h1 className="hero-title">Resident Approval Queue</h1>
          <p className="hero-subtitle" style={{ maxWidth: "54ch" }}>
            Review resident sign-up submissions and grant portal access after HOA verification.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <UserCheck style={{ width: "1.2rem", height: "1.2rem", color: "var(--pp-navy)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Pending Registration Reviews</h2>
            </div>
            <ResidentApprovalsTable />
          </div>
        </div>
      </section>
    </>
  )
}

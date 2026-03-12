import type { Metadata } from "next"
import { FileText, Shield } from "lucide-react"
import { requirePortalRolePageAccess } from "@/lib/auth/portal-admin"
import { siteConfig } from "@/lib/site-config"
import { ClubhouseRentalQueueTable } from "@/components/portal/clubhouse-rental-queue-table"

export const metadata: Metadata = {
  title: `Clubhouse Rental Queue | ${siteConfig.name} Resident Portal`,
  description: "Restricted clubhouse rental review queue for admins, Board members, and Clubhouse committee reviewers.",
}

export default async function ClubhouseRentalQueuePage() {
  await requirePortalRolePageAccess(
    ["admin", "board_of_directors", "clubhouse_maintenance"],
    "/resident-portal/management/clubhouse-rental-queue",
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
          <h1 className="hero-title">Clubhouse Rental Queue</h1>
          <p className="hero-subtitle" style={{ maxWidth: "58ch" }}>
            Restricted-access review queue for online clubhouse rental submissions. This first pass supports request
            review, request-more-info, approve, and reject actions for admins, Board members, and Clubhouse committee
            reviewers.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <FileText style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Clubhouse Rental Requests</h2>
            </div>

            <ClubhouseRentalQueueTable />
          </div>
        </div>
      </section>
    </>
  )
}

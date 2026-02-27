import type { Metadata } from "next"
import { Shield, Link2, History } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { requirePortalRolePageAccess } from "@/lib/auth/portal-admin"
import { AccMatchReviewTable } from "@/components/portal/acc-match-review-table"
import { AccRunHistoryPanel } from "@/components/portal/acc-run-history-panel"

export const metadata: Metadata = {
  title: `ACC Match Review | ${siteConfig.name} Resident Portal`,
  description: "Review ACC-to-resident match candidates and confirm or reject matches.",
}

type PageSearchParams = Record<string, string | string[] | undefined>

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || ""
  return value || ""
}

export default async function AccMatchReviewPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>
}) {
  await requirePortalRolePageAccess(["admin"], "/resident-portal/management/acc-match-review")
  const resolved = await searchParams
  const initialQ = firstParam(resolved.q).trim()
  const rawStatus = firstParam(resolved.status).trim()
  const initialStatus =
    rawStatus === "all" || rawStatus === "auto" || rawStatus === "confirmed" || rawStatus === "rejected"
      ? rawStatus
      : "needs_review"

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
          <h1 className="hero-title">ACC Match Review</h1>
          <p className="hero-subtitle" style={{ maxWidth: "56ch" }}>
            Validate fuzzy matches between ACC permit requests and resident profiles before downstream reporting.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Link2 style={{ width: "1.2rem", height: "1.2rem", color: "var(--pp-navy)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Review Candidate Matches</h2>
            </div>
            <AccMatchReviewTable initialQ={initialQ} initialStatus={initialStatus} />
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.4rem" }}>
              <History style={{ width: "1.2rem", height: "1.2rem", color: "var(--pp-navy)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Run History</h2>
            </div>
            <AccRunHistoryPanel />
          </div>
        </div>
      </section>
    </>
  )
}

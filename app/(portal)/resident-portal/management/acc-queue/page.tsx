import type { Metadata } from "next"
import { FileText, Shield } from "lucide-react"
import { currentUser } from "@clerk/nextjs/server"
import { siteConfig } from "@/lib/site-config"
import { getAccWorkflowActorContext } from "@/lib/acc-workflow/actors"
import { requirePortalCapabilityPageAccess } from "@/lib/auth/portal-admin"
import { AccQueueNeonTable } from "@/components/portal/acc-queue-neon-table"

export const metadata: Metadata = {
  title: `ACC Workflow Queue | ${siteConfig.name} Resident Portal`,
  description: "Neon-backed ACC workflow queue.",
}

export default async function AccQueuePage() {
  await requirePortalCapabilityPageAccess(["acc.view"], "/resident-portal/management/acc-queue")
  const actor = getAccWorkflowActorContext(await currentUser())

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
            Neon-backed queue for ACC requests with workflow filtering and status updates.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <FileText style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)" }}>ACC Permit Requests (Neon)</h2>
            </div>

            <AccQueueNeonTable
              canControlWorkflow={actor.canControlWorkflow}
              canVote={actor.canVote}
              canOverrideVote={actor.canOverrideVote}
              canVerify={actor.canVerify}
              canPurge={actor.canPurge}
            />
          </div>
        </div>
      </section>
    </>
  )
}

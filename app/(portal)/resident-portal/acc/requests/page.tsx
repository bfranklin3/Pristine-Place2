import type { Metadata } from "next"
import Link from "next/link"
import { FileText, Shield } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { requireApprovedPortalAccess } from "@/lib/auth/portal-access"
import { getPortalSession } from "@/lib/auth/portal-session"
import { listWorkflowRequestsForResident } from "@/lib/acc-workflow/repository"

export const metadata: Metadata = {
  title: `My ACC Requests | ${siteConfig.name} Resident Portal`,
  description: "Review your submitted ACC requests and current statuses.",
}

function statusLabel(status: string) {
  if (status === "initial_review") return "Pending"
  if (status === "needs_more_info") return "Needs More Information"
  if (status === "committee_vote") return "Committee Vote"
  if (status === "approved") return "Approved"
  if (status === "rejected") return "Rejected"
  return status
}

function statusBadgeStyles(status: string) {
  if (status === "approved") return { background: "#dcfce7", color: "#166534" }
  if (status === "rejected") return { background: "#fee2e2", color: "#991b1b" }
  if (status === "committee_vote") return { background: "#dbeafe", color: "#1d4ed8" }
  if (status === "needs_more_info") return { background: "#ffedd5", color: "#9a3412" }
  return { background: "#f3f4f6", color: "#334155" }
}

function formatDateOnly(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString()
}

export default async function MyAccRequestsPage() {
  await requireApprovedPortalAccess()
  const { userId } = await getPortalSession()
  const requests = userId ? await listWorkflowRequestsForResident(userId) : []

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
              Resident Portal
            </span>
          </div>
          <h1 className="hero-title">My ACC Requests</h1>
          <p className="hero-subtitle" style={{ maxWidth: "54ch" }}>
            Review your submitted architectural requests and see whether any additional action is required.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "70rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <FileText style={{ width: "1.2rem", height: "1.2rem", color: "var(--pp-navy-dark)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)", margin: 0 }}>Submitted Requests</h2>
            </div>

            {requests.length === 0 ? (
              <div className="card" style={{ padding: "var(--space-l)", background: "#fffef9" }}>
                <p style={{ margin: 0, color: "var(--pp-slate-700)" }}>
                  You have not submitted any ACC requests yet.{" "}
                  <Link href="/resident-portal/acc/submit">Start a new request</Link>.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "1rem" }}>
                {requests.map((request) => (
                  <article key={request.id} className="card" style={{ padding: "var(--space-l)", background: "#fffef9", border: "1px solid #e5efe8" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                      <div style={{ display: "grid", gap: "0.35rem" }}>
                        <h3 style={{ margin: 0, color: "var(--pp-navy-dark)" }}>{request.title || "ACC Request"}</h3>
                        <p style={{ margin: 0, color: "var(--pp-slate-600)", fontFamily: "monospace", fontSize: "0.95rem" }}>
                          {request.requestNumber}
                        </p>
                        {request.permitNumber ? (
                          <p style={{ margin: 0, color: "var(--pp-slate-600)", fontFamily: "monospace", fontSize: "0.95rem" }}>
                            Permit {request.permitNumber}
                          </p>
                        ) : null}
                        <p style={{ margin: 0, color: "var(--pp-slate-700)" }}>{request.residentAddress || "Address unavailable"}</p>
                        <p style={{ margin: 0, color: "var(--pp-slate-500)", fontSize: "0.95rem" }}>
                          Submitted {formatDateOnly(request.submittedAt)}
                        </p>
                      </div>
                      <div style={{ display: "grid", gap: "0.5rem", justifyItems: "end" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: "2rem",
                            padding: "0.35rem 0.75rem",
                            borderRadius: "999px",
                            ...statusBadgeStyles(request.status),
                            fontWeight: 700,
                            fontSize: "0.85rem",
                          }}
                        >
                          {statusLabel(request.status)}
                        </span>
                        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {request.canEdit ? (
                            <Link href={`/resident-portal/acc/requests/${request.id}/edit`} className="btn btn-primary">
                              Update Now
                            </Link>
                          ) : null}
                          <Link href={`/resident-portal/acc/requests/${request.id}`} className="btn btn-secondary">
                            View Request
                          </Link>
                        </div>
                      </div>
                    </div>

                    {request.decisionNote ? (
                      <p style={{ margin: "0.9rem 0 0 0", color: "var(--pp-slate-700)" }}>
                        <strong>Decision note:</strong> {request.decisionNote}
                      </p>
                    ) : null}

                    {request.residentActionNote ? (
                      <div style={{ marginTop: "0.9rem", padding: "0.85rem 0.95rem", borderRadius: "var(--radius-md)", background: "#fff7ed", color: "#9a3412" }}>
                        <strong>Action required:</strong> {request.residentActionNote}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

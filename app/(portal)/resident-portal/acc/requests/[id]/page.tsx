import type { Metadata } from "next"
import Link from "next/link"
import { FileText, Shield } from "lucide-react"
import { notFound } from "next/navigation"
import { siteConfig } from "@/lib/site-config"
import { requireApprovedPortalAccess } from "@/lib/auth/portal-access"
import { getPortalSession } from "@/lib/auth/portal-session"
import { EMPTY_FORM_DATA, getWorkflowRequestForResident } from "@/lib/acc-workflow/repository"

export const metadata: Metadata = {
  title: `ACC Request Detail | ${siteConfig.name} Resident Portal`,
  description: "Review the status and submitted details for your ACC request.",
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

export default async function AccRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ email?: string; kind?: string }>
}) {
  await requireApprovedPortalAccess()
  const { userId } = await getPortalSession()
  const { id } = await params
  const resolvedSearchParams = await searchParams

  if (!userId) notFound()

  const request = await getWorkflowRequestForResident(userId, id)
  if (!request) notFound()

  const formData = request.formData ?? EMPTY_FORM_DATA
  const showEmailWarning = resolvedSearchParams.email === "issue"
  const showEmailSuccess = resolvedSearchParams.email === "resent"
  const emailWarningKind = resolvedSearchParams.kind === "resubmitted" ? "resubmitted" : "submitted"

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
          <h1 className="hero-title">{request.title || "ACC Request Detail"}</h1>
          <p className="hero-subtitle" style={{ maxWidth: "54ch" }}>
            Review the current status of your request and the information submitted for ACC review.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "70rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <FileText style={{ width: "1.2rem", height: "1.2rem", color: "var(--pp-navy-dark)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)", margin: 0 }}>Request Detail</h2>
            </div>

            <div className="card" style={{ padding: "var(--space-l)", background: "#fffef9", display: "grid", gap: "0.9rem" }}>
              {showEmailSuccess ? (
                <div
                  style={{
                    padding: "0.9rem 1rem",
                    borderRadius: "var(--radius-md)",
                    background: "#ecfdf5",
                    color: "#166534",
                    border: "1px solid #86efac",
                  }}
                >
                  <strong>Confirmation emails sent:</strong> Your request confirmation emails were sent successfully.
                </div>
              ) : null}
              {showEmailWarning ? (
                <div
                  style={{
                    padding: "0.9rem 1rem",
                    borderRadius: "var(--radius-md)",
                    background: "#fff7ed",
                    color: "#9a3412",
                    border: "1px solid #fdba74",
                    display: "grid",
                    gap: "0.75rem",
                  }}
                >
                  <div>
                    <strong>Email delivery issue:</strong> Your request was saved successfully, but one or more confirmation emails could not be sent.
                  </div>
                  <form
                    action={`/resident-portal/acc/requests/${request.id}/retry-email`}
                    method="post"
                    style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}
                  >
                    <input type="hidden" name="kind" value={emailWarningKind} />
                    <button type="submit" className="btn btn-secondary">
                      Retry Confirmation Email
                    </button>
                    <span style={{ fontSize: "0.92rem" }}>
                      If needed, contact the ACC at {siteConfig.contact.email}.
                    </span>
                  </form>
                </div>
              ) : null}
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: "0.25rem" }}>
                  <strong style={{ color: "var(--pp-navy-dark)" }}>Request Number</strong>
                  <span style={{ fontFamily: "monospace" }}>{request.requestNumber}</span>
                </div>
                {request.permitNumber ? (
                  <div style={{ display: "grid", gap: "0.25rem" }}>
                    <strong style={{ color: "var(--pp-navy-dark)" }}>Permit Number</strong>
                    <span style={{ fontFamily: "monospace" }}>{request.permitNumber}</span>
                  </div>
                ) : null}
                <div style={{ display: "grid", gap: "0.25rem" }}>
                  <strong style={{ color: "var(--pp-navy-dark)" }}>Status</strong>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "fit-content",
                      minHeight: "2rem",
                      padding: "0.35rem 0.75rem",
                      borderRadius: "999px",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      ...statusBadgeStyles(request.status),
                    }}
                  >
                    {statusLabel(request.status)}
                  </span>
                </div>
                <div style={{ display: "grid", gap: "0.25rem" }}>
                  <strong style={{ color: "var(--pp-navy-dark)" }}>Submitted</strong>
                  <span>{formatDateOnly(request.submittedAt)}</span>
                </div>
                <div style={{ display: "grid", gap: "0.25rem" }}>
                  <strong style={{ color: "var(--pp-navy-dark)" }}>Review Cycle</strong>
                  <span>{request.reviewCycle}</span>
                </div>
              </div>

              {request.residentActionNote ? (
                <div style={{ padding: "0.9rem 1rem", borderRadius: "var(--radius-md)", background: "#fff7ed", color: "#9a3412" }}>
                  <strong>Additional information requested:</strong> {request.residentActionNote}
                  {request.canEdit ? (
                    <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                      <Link href={`/resident-portal/acc/requests/${request.id}/edit`} className="btn btn-primary">
                        Update and Resubmit
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {request.decisionNote ? (
                <div style={{ padding: "0.9rem 1rem", borderRadius: "var(--radius-md)", background: "#f6f7fb", color: "var(--pp-slate-700)" }}>
                  <strong>Decision note:</strong> {request.decisionNote}
                </div>
              ) : null}

              <div style={{ display: "grid", gap: "0.8rem", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))" }}>
                <div><strong>Owner</strong><div>{formData.ownerName}</div></div>
                <div><strong>Email</strong><div>{formData.ownerEmail}</div></div>
                <div><strong>Phone</strong><div>{formData.ownerPhone}</div></div>
                <div><strong>Address</strong><div>{formData.streetAddress}</div></div>
                <div><strong>Phase</strong><div>{formData.phase || "—"}</div></div>
                <div><strong>Lot</strong><div>{formData.lot || "—"}</div></div>
                <div><strong>Role</strong><div>{formData.role || "—"}</div></div>
                <div><strong>Work Type</strong><div>{formData.workType || "—"}</div></div>
                <div><strong>Estimated Start</strong><div>{formData.startDate || "—"}</div></div>
                <div><strong>Estimated Completion</strong><div>{formData.completionDate || "—"}</div></div>
              </div>

              <div>
                <strong style={{ color: "var(--pp-navy-dark)" }}>Project Description</strong>
                <p style={{ margin: "0.35rem 0 0 0", color: "var(--pp-slate-700)" }}>{formData.projectDescription}</p>
              </div>

              {request.locationDetails ? (
                <div>
                  <strong style={{ color: "var(--pp-navy-dark)" }}>Project Details</strong>
                  <p style={{ margin: "0.35rem 0 0 0", color: "var(--pp-slate-700)" }}>{request.locationDetails}</p>
                </div>
              ) : null}

              <div>
                <strong style={{ color: "var(--pp-navy-dark)" }}>Attachments</strong>
                {request.attachments.length === 0 ? (
                  <p style={{ margin: "0.35rem 0 0 0", color: "var(--pp-slate-700)" }}>No attachments uploaded.</p>
                ) : (
                  <ul style={{ margin: "0.45rem 0 0 1rem", color: "var(--pp-slate-700)" }}>
                    {request.attachments.map((attachment) => (
                      <li key={attachment.id}>
                        <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                          {attachment.originalFilename}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                {request.canEdit ? (
                  <Link href={`/resident-portal/acc/requests/${request.id}/edit`} className="btn btn-primary">
                    Update and Resubmit
                  </Link>
                ) : null}
                <Link href="/resident-portal/acc/requests" className="btn btn-secondary">
                  Back to My ACC Requests
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, Clock3, RefreshCw, UserX } from "lucide-react"

type ApprovalStatus = "pending" | "approved" | "rejected"

interface PortalApprovalRow {
  userId: string
  firstName: string
  lastName: string
  homeAddress: string
  username: string
  emailAddress: string
  submittedAt: string
  status: ApprovalStatus
}

export function ResidentApprovalsTable() {
  const [rows, setRows] = useState<PortalApprovalRow[]>([])
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending")
  const [loading, setLoading] = useState(true)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const loadRows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/portal-approvals?status=${statusFilter}`)
      const data = (await response.json()) as { success: boolean; rows?: PortalApprovalRow[]; error?: string }
      if (!response.ok || !data.success) {
        setError(data.error || "Failed to load registration requests.")
        setRows([])
        return
      }
      setRows(data.rows || [])
    } catch {
      setError("Failed to load registration requests.")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const counts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc[row.status] += 1
        return acc
      },
      { pending: 0, approved: 0, rejected: 0 },
    )
  }, [rows])

  async function review(userId: string, action: "approve" | "reject") {
    setSavingUserId(userId)
    setError(null)
    setWarning(null)

    try {
      const response = await fetch("/api/portal-approvals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      })
      const data = (await response.json()) as { success: boolean; error?: string; warning?: string }

      if (!response.ok || !data.success) {
        setError(data.error || `Failed to ${action} resident.`)
        return
      }

      if (data.warning) {
        setWarning(data.warning)
      }

      await loadRows()
    } catch {
      setError(`Failed to ${action} resident.`)
    } finally {
      setSavingUserId(null)
    }
  }

  return (
    <div className="stack" style={{ gap: "var(--space-m)" }}>
      <div style={{ display: "flex", gap: "var(--space-s)", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setStatusFilter("pending")}
          >
            Pending ({statusFilter === "pending" ? rows.length : counts.pending})
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setStatusFilter("approved")}
          >
            Approved ({statusFilter === "approved" ? rows.length : counts.approved})
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setStatusFilter("rejected")}
          >
            Rejected ({statusFilter === "rejected" ? rows.length : counts.rejected})
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setStatusFilter("all")}
          >
            All ({statusFilter === "all" ? rows.length : counts.pending + counts.approved + counts.rejected})
          </button>
        </div>

        <button type="button" className="btn btn-secondary btn-sm" onClick={loadRows} disabled={loading}>
          <RefreshCw style={{ width: "0.95rem", height: "0.95rem", marginRight: "0.3rem" }} />
          Refresh
        </button>
      </div>

      {error && (
        <p className="text-fluid-sm" style={{ color: "#b91c1c", fontWeight: 600 }}>
          {error}
        </p>
      )}
      {warning && (
        <p className="text-fluid-sm" style={{ color: "#92400e", fontWeight: 600 }}>
          {warning}
        </p>
      )}

      {loading ? (
        <div className="card" style={{ padding: "var(--space-l)" }}>
          <p className="text-fluid-base">Loading resident registrations...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="card" style={{ padding: "var(--space-l)" }}>
          <p className="text-fluid-base">No records found for this filter.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: "var(--radius-md)", border: "1px solid var(--pp-slate-200)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "860px" }}>
            <thead style={{ background: "var(--pp-slate-50)" }}>
              <tr>
                <th style={{ textAlign: "left", padding: "0.75rem", fontSize: "0.78rem" }}>Resident</th>
                <th style={{ textAlign: "left", padding: "0.75rem", fontSize: "0.78rem" }}>Address</th>
                <th style={{ textAlign: "left", padding: "0.75rem", fontSize: "0.78rem" }}>Username</th>
                <th style={{ textAlign: "left", padding: "0.75rem", fontSize: "0.78rem" }}>Email</th>
                <th style={{ textAlign: "left", padding: "0.75rem", fontSize: "0.78rem" }}>Submitted</th>
                <th style={{ textAlign: "left", padding: "0.75rem", fontSize: "0.78rem" }}>Status</th>
                <th style={{ textAlign: "left", padding: "0.75rem", fontSize: "0.78rem" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const pending = row.status === "pending"
                const busy = savingUserId === row.userId

                return (
                  <tr key={row.userId} style={{ borderTop: "1px solid var(--pp-slate-100)" }}>
                    <td style={{ padding: "0.75rem", verticalAlign: "top" }}>
                      <div style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>
                        {[row.firstName, row.lastName].filter(Boolean).join(" ") || "Unknown"}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--pp-slate-500)" }}>{row.userId}</div>
                    </td>
                    <td style={{ padding: "0.75rem", verticalAlign: "top" }}>{row.homeAddress || "N/A"}</td>
                    <td style={{ padding: "0.75rem", verticalAlign: "top" }}>{row.username || "N/A"}</td>
                    <td style={{ padding: "0.75rem", verticalAlign: "top" }}>{row.emailAddress || "N/A"}</td>
                    <td style={{ padding: "0.75rem", verticalAlign: "top" }}>
                      {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "N/A"}
                    </td>
                    <td style={{ padding: "0.75rem", verticalAlign: "top", textTransform: "capitalize", fontWeight: 700 }}>
                      {row.status}
                    </td>
                    <td style={{ padding: "0.75rem", verticalAlign: "top" }}>
                      {pending ? (
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => review(row.userId, "approve")}
                            disabled={busy}
                          >
                            <CheckCircle2 style={{ width: "0.9rem", height: "0.9rem", marginRight: "0.2rem" }} />
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => review(row.userId, "reject")}
                            disabled={busy}
                          >
                            <UserX style={{ width: "0.9rem", height: "0.9rem", marginRight: "0.2rem" }} />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "var(--pp-slate-600)", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                          <Clock3 style={{ width: "0.9rem", height: "0.9rem" }} />
                          Reviewed
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

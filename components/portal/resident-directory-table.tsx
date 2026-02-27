"use client"

import { Fragment, useCallback, useEffect, useState } from "react"
import { CheckCircle2, ChevronRight, RefreshCw, Search, Shield, UserX } from "lucide-react"
import { COMMITTEE_OPTIONS, isCommitteeSlug, type CommitteeSlug } from "@/lib/portal/committees"

type DirectoryStatus = "all" | "not_submitted" | "pending" | "approved" | "rejected"
type DirectoryAction = "approve" | "reject" | "set_admin" | "unset_admin" | "set_committees" | "delete_user"

interface PortalUserRow {
  userId: string
  firstName: string
  lastName: string
  fullName: string
  homeAddress: string
  username: string
  emailAddress: string
  status: Exclude<DirectoryStatus, "all">
  submittedAt: string
  reviewedAt: string
  reviewedBy: string
  portalAdmin: boolean
  committees: string[]
  committeesUpdatedAt: string
  committeesUpdatedBy: string
}

const statusOptions: Array<{ key: DirectoryStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "not_submitted", label: "No Registration" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
]

function statusLabel(status: PortalUserRow["status"]) {
  if (status === "not_submitted") return "No registration submitted"
  if (status === "pending") return "Pending"
  if (status === "approved") return "Approved"
  return "Rejected"
}

export function ResidentDirectoryTable() {
  const [rows, setRows] = useState<PortalUserRow[]>([])
  const [status, setStatus] = useState<DirectoryStatus>("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [resetEmailInput, setResetEmailInput] = useState("")
  const [resettingEmail, setResettingEmail] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [committeeDrafts, setCommitteeDrafts] = useState<Record<string, CommitteeSlug[]>>({})
  const [committeeMessages, setCommitteeMessages] = useState<Record<string, string>>({})
  const [isCompactLayout, setIsCompactLayout] = useState(false)

  const loadRows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams()
      query.set("status", status)
      if (search.trim()) query.set("q", search.trim())

      const response = await fetch(`/api/portal-users?${query.toString()}`)
      const data = (await response.json()) as { success: boolean; rows?: PortalUserRow[]; error?: string }

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to load directory users.")
        setRows([])
        return
      }

      setRows(data.rows || [])
      setCommitteeDrafts({})
      setCommitteeMessages({})
    } catch {
      setError("Failed to load directory users.")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [search, status])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1024px)")
    const update = () => setIsCompactLayout(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  async function runAction(userId: string, action: DirectoryAction) {
    if (action === "delete_user") {
      const confirmed = window.confirm(
        "Delete this user account from Clerk? This cannot be undone.",
      )
      if (!confirmed) return
    }

    setSavingUserId(userId)
    setError(null)
    setWarning(null)
    try {
      const response = await fetch("/api/portal-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      })
      const data = (await response.json()) as { success: boolean; error?: string; warning?: string }
      if (!response.ok || !data.success) {
        setError(data.error || "Failed to save changes.")
        return
      }
      if (data.warning) {
        setWarning(data.warning)
      }
      await loadRows()
    } catch {
      setError("Failed to save changes.")
    } finally {
      setSavingUserId(null)
    }
  }

  function getDraftCommittees(row: PortalUserRow): CommitteeSlug[] {
    const draft = committeeDrafts[row.userId]
    return draft ?? row.committees.filter(isCommitteeSlug)
  }

  function hasCommitteeChanges(row: PortalUserRow): boolean {
    const current = row.committees.filter(isCommitteeSlug)
    const draft = getDraftCommittees(row)
    return current.join("|") !== draft.join("|")
  }

  function toggleCommittee(userId: string, slug: CommitteeSlug, checked: boolean) {
    setCommitteeMessages((current) => {
      const next = { ...current }
      delete next[userId]
      return next
    })

    setCommitteeDrafts((current) => {
      const existing = current[userId] ?? []
      const nextValues = checked ? [...existing, slug] : existing.filter((value) => value !== slug)
      const deduped = Array.from(new Set(nextValues))
      const ordered = COMMITTEE_OPTIONS.map((option) => option.slug).filter((value) => deduped.includes(value))
      return { ...current, [userId]: ordered }
    })
  }

  function clearCommittees(row: PortalUserRow) {
    setCommitteeMessages((current) => {
      const next = { ...current }
      delete next[row.userId]
      return next
    })
    setCommitteeDrafts((current) => ({ ...current, [row.userId]: [] }))
  }

  async function saveCommittees(row: PortalUserRow) {
    const committees = getDraftCommittees(row)
    setSavingUserId(row.userId)
    setError(null)
    setCommitteeMessages((current) => ({ ...current, [row.userId]: "" }))

    try {
      const response = await fetch("/api/portal-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: row.userId, action: "set_committees", committees }),
      })
      const data = (await response.json()) as { success: boolean; error?: string }
      if (!response.ok || !data.success) {
        setError(data.error || "Failed to save committees.")
        return
      }

      setCommitteeMessages((current) => ({ ...current, [row.userId]: "Committees saved." }))
      await loadRows()
    } catch {
      setError("Failed to save committees.")
    } finally {
      setSavingUserId(null)
    }
  }

  function toggleExpanded(userId: string) {
    setExpandedRows((current) => ({
      ...current,
      [userId]: !current[userId],
    }))
  }

  async function runResetByEmail() {
    const emailAddress = resetEmailInput.trim().toLowerCase()
    if (!emailAddress) {
      setError("Enter an email address to reset.")
      return
    }
    const confirmed = window.confirm(
      `Reset test account for ${emailAddress}? This will delete matching Clerk user account(s).`,
    )
    if (!confirmed) return

    setResettingEmail(true)
    setError(null)
    setWarning(null)
    try {
      const response = await fetch("/api/portal-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_by_email", emailAddress }),
      })
      const data = (await response.json()) as {
        success: boolean
        error?: string
        warning?: string
        result?: { emailAddress: string; found: number; deleted: number; skippedSelf: number }
      }
      if (!response.ok || !data.success) {
        setError(data.error || "Failed to reset by email.")
        return
      }

      const result = data.result
      if (result) {
        const message = `Reset complete for ${result.emailAddress}: found ${result.found}, deleted ${result.deleted}, skipped self ${result.skippedSelf}.`
        setWarning(data.warning ? `${message} ${data.warning}` : message)
      } else if (data.warning) {
        setWarning(data.warning)
      }

      await loadRows()
    } catch {
      setError("Failed to reset by email.")
    } finally {
      setResettingEmail(false)
    }
  }

  function renderExpandedDetails(
    row: PortalUserRow,
    busy: boolean,
    draftCommittees: CommitteeSlug[],
    committeesDirty: boolean,
    committeeMessage: string | undefined,
    singleColumn = false,
  ) {
    const badgeLabel = row.committeesUpdatedAt
      ? `Last saved ${new Date(row.committeesUpdatedAt).toLocaleDateString()} by ${row.committeesUpdatedBy || "Unknown"}`
      : "No committee saves yet"

    const infoCards = [
      { label: "Address", value: row.homeAddress || "N/A" },
      { label: "Email", value: row.emailAddress || "N/A" },
      { label: "Submitted", value: row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "N/A" },
      { label: "Reviewed", value: row.reviewedAt ? new Date(row.reviewedAt).toLocaleString() : "N/A" },
      { label: "Reviewed By", value: row.reviewedBy || "N/A" },
      { label: "Committees Updated", value: row.committeesUpdatedAt ? new Date(row.committeesUpdatedAt).toLocaleString() : "N/A" },
      { label: "Committees Updated By", value: row.committeesUpdatedBy || "N/A" },
      { label: "User ID", value: row.userId },
    ]

    const committeesCard = (
      <div style={{ background: "var(--pp-white)", border: "1px solid var(--pp-slate-200)", borderRadius: "0.65rem", padding: "0.7rem 0.8rem", minWidth: 0 }}>
        <div style={{ fontSize: "0.74rem", color: "var(--pp-slate-600)", fontWeight: 700, marginBottom: "0.2rem" }}>
          Committees
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.45rem" }}>
          {COMMITTEE_OPTIONS.map((committee) => {
            const checked = draftCommittees.includes(committee.slug)
            return (
              <label
                key={committee.slug}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.35rem 0.5rem",
                  borderRadius: "0.45rem",
                  border: "1px solid var(--pp-slate-200)",
                  background: checked ? "var(--pp-slate-50)" : "var(--pp-white)",
                  minWidth: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => toggleCommittee(row.userId, committee.slug, event.target.checked)}
                  disabled={busy}
                />
                <span style={{ color: "var(--pp-slate-800)", fontSize: "0.84rem", lineHeight: 1.25, overflowWrap: "anywhere" }}>
                  {committee.label}
                </span>
              </label>
            )
          })}
        </div>
        <div style={{ color: committeesDirty ? "#92400e" : "var(--pp-slate-500)", fontSize: "0.76rem", fontWeight: 600, marginTop: "0.6rem" }}>
          {committeesDirty ? "Unsaved changes" : "No pending changes"}
        </div>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.45rem" }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => clearCommittees(row)}
            disabled={busy}
          >
            Select none
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => saveCommittees(row)}
            disabled={busy || !committeesDirty}
          >
            Save Committees
          </button>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.3rem 0.5rem",
              borderRadius: "999px",
              border: "1px solid var(--pp-slate-200)",
              background: "var(--pp-slate-50)",
              color: "var(--pp-slate-700)",
              fontSize: "0.7rem",
              fontWeight: 600,
              lineHeight: 1.2,
              overflowWrap: "anywhere",
            }}
            title={
              row.committeesUpdatedAt
                ? `Last saved by ${row.committeesUpdatedBy || "Unknown"} on ${new Date(row.committeesUpdatedAt).toLocaleString()}`
                : "No committee saves yet"
            }
          >
            {badgeLabel}
          </span>
        </div>
        {committeeMessage && (
          <div style={{ color: "#166534", fontSize: "0.76rem", fontWeight: 600, marginTop: "0.5rem" }}>
            {committeeMessage}
          </div>
        )}
      </div>
    )

    if (singleColumn) {
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.7rem" }}>
          {infoCards.map((card) => (
            <div key={card.label} style={{ background: "var(--pp-white)", border: "1px solid var(--pp-slate-200)", borderRadius: "0.65rem", padding: "0.7rem 0.8rem", minWidth: 0 }}>
              <div style={{ fontSize: "0.74rem", color: "var(--pp-slate-600)", fontWeight: 700, marginBottom: "0.2rem" }}>{card.label}</div>
              <div style={{ color: "var(--pp-slate-800)", lineHeight: 1.35, overflowWrap: "anywhere" }}>{card.value}</div>
            </div>
          ))}
          {committeesCard}
        </div>
      )
    }

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px, 320px) minmax(0, 1fr)",
          gap: "0.7rem",
          alignItems: "stretch",
        }}
      >
        {committeesCard}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gridTemplateRows: "repeat(4, minmax(0, 1fr))",
            gap: "0.7rem",
          }}
        >
          {infoCards.map((card) => (
            <div key={card.label} style={{ background: "var(--pp-white)", border: "1px solid var(--pp-slate-200)", borderRadius: "0.65rem", padding: "0.7rem 0.8rem", minWidth: 0 }}>
              <div style={{ fontSize: "0.74rem", color: "var(--pp-slate-600)", fontWeight: 700, marginBottom: "0.2rem" }}>{card.label}</div>
              <div style={{ color: "var(--pp-slate-800)", lineHeight: 1.35, overflowWrap: "anywhere" }}>{card.value}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="stack" style={{ gap: "var(--space-m)" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {statusOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            className="btn btn-outline btn-sm"
            style={status === option.key ? { background: "var(--pp-slate-100)" } : undefined}
            onClick={() => setStatus(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", minWidth: "0", flex: "1 1 20rem" }}>
          <Search
            style={{
              width: "0.95rem",
              height: "0.95rem",
              position: "absolute",
              left: "0.7rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--pp-slate-500)",
            }}
          />
          <input
            type="text"
            placeholder="Search by name, email, or address..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem 0.6rem 2.1rem",
              borderRadius: "var(--radius-sm)",
              border: "1.5px solid var(--pp-slate-200)",
            }}
          />
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={loadRows} disabled={loading}>
          <RefreshCw style={{ width: "0.9rem", height: "0.9rem", marginRight: "0.25rem" }} />
          Refresh
        </button>
      </div>

      <div style={{ display: "flex", gap: "0.55rem", alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="email"
          placeholder="Reset test account by email..."
          value={resetEmailInput}
          onChange={(event) => setResetEmailInput(event.target.value)}
          style={{
            minWidth: "18rem",
            flex: "1 1 18rem",
            padding: "0.52rem 0.7rem",
            borderRadius: "var(--radius-sm)",
            border: "1.5px solid var(--pp-slate-200)",
          }}
        />
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={runResetByEmail}
          disabled={resettingEmail}
          style={{ borderColor: "#fca5a5", color: "#b91c1c" }}
        >
          {resettingEmail ? "Resetting..." : "Reset by Email"}
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
          <p>Loading resident directory...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="card" style={{ padding: "var(--space-l)" }}>
          <p>No records found for this filter.</p>
        </div>
      ) : isCompactLayout ? (
        <div className="stack" style={{ gap: "0.8rem" }}>
          {rows.map((row) => {
            const busy = savingUserId === row.userId
            const expanded = expandedRows[row.userId] === true
            const draftCommittees = getDraftCommittees(row)
            const committeesDirty = hasCommitteeChanges(row)
            const committeeMessage = committeeMessages[row.userId]

            return (
              <div key={row.userId} style={{ borderRadius: "0.8rem", border: "1px solid var(--pp-slate-200)", overflow: "hidden" }}>
                <div style={{ padding: "0.85rem", background: "var(--pp-white)", borderBottom: "1px solid var(--pp-slate-100)" }}>
                  <div style={{ fontWeight: 800, color: "var(--pp-navy-dark)", fontSize: "1.05rem" }}>{row.fullName || "Unknown"}</div>
                  <div style={{ marginTop: "0.2rem", color: "var(--pp-slate-700)", fontSize: "0.9rem" }}>
                    Username: {row.username || "N/A"}
                  </div>
                  <div style={{ marginTop: "0.35rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--pp-slate-700)" }}>Status: {statusLabel(row.status)}</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--pp-slate-700)" }}>Admin: {row.portalAdmin ? "Yes" : "No"}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.6rem" }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => runAction(row.userId, "approve")}
                      disabled={busy}
                    >
                      <CheckCircle2 style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => runAction(row.userId, "reject")}
                      disabled={busy}
                    >
                      <UserX style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                      Reject
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => runAction(row.userId, row.portalAdmin ? "unset_admin" : "set_admin")}
                      disabled={busy}
                    >
                      <Shield style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                      {row.portalAdmin ? "Demote Admin" : "Promote Admin"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ borderColor: "#fca5a5", color: "#b91c1c" }}
                      onClick={() => runAction(row.userId, "delete_user")}
                      disabled={busy}
                      title="Delete user from Clerk"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => toggleExpanded(row.userId)}
                      aria-expanded={expanded}
                      aria-label={expanded ? "Collapse row details" : "Expand row details"}
                    >
                      {expanded ? "Hide Details" : "Show Details"}
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div style={{ padding: "0.85rem", background: "var(--pp-slate-50)" }}>
                    {renderExpandedDetails(row, busy, draftCommittees, committeesDirty, committeeMessage, true)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: "var(--radius-md)", border: "1px solid var(--pp-slate-200)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "780px" }}>
            <thead style={{ background: "var(--pp-slate-50)" }}>
              <tr>
                <th style={{ textAlign: "left", padding: "0.75rem", fontSize: "0.78rem" }}>Resident</th>
                <th style={{ textAlign: "left", padding: "0.75rem", fontSize: "0.78rem", width: "9.5rem" }}>Portal Status</th>
                <th style={{ textAlign: "left", padding: "0.75rem", fontSize: "0.78rem", width: "4.5rem" }}>Admin</th>
                <th style={{ textAlign: "left", padding: "0.75rem", fontSize: "0.78rem", width: "23rem" }}>Actions</th>
                <th style={{ textAlign: "center", padding: "0.75rem", fontSize: "0.78rem", width: "3rem" }} aria-label="Expand" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const busy = savingUserId === row.userId
                const expanded = expandedRows[row.userId] === true
                const draftCommittees = getDraftCommittees(row)
                const committeesDirty = hasCommitteeChanges(row)
                const committeeMessage = committeeMessages[row.userId]

                return (
                  <Fragment key={row.userId}>
                    <tr key={`${row.userId}-primary`} style={{ borderTop: "1px solid var(--pp-slate-100)" }}>
                      <td style={{ padding: "0.75rem", verticalAlign: "top" }}>
                        <div style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>{row.fullName || "Unknown"}</div>
                      </td>
                      <td style={{ padding: "0.75rem", verticalAlign: "top", fontWeight: 600 }}>
                        {statusLabel(row.status)}
                      </td>
                      <td style={{ padding: "0.75rem", verticalAlign: "top" }}>
                        {row.portalAdmin ? "Yes" : "No"}
                      </td>
                      <td style={{ padding: "0.75rem", verticalAlign: "top", width: "23rem", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "nowrap", alignItems: "center" }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => runAction(row.userId, "approve")}
                            disabled={busy}
                          >
                            <CheckCircle2 style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => runAction(row.userId, "reject")}
                            disabled={busy}
                          >
                            <UserX style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                            Reject
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => runAction(row.userId, row.portalAdmin ? "unset_admin" : "set_admin")}
                            disabled={busy}
                          >
                            <Shield style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                            {row.portalAdmin ? "Demote Admin" : "Promote Admin"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ borderColor: "#fca5a5", color: "#b91c1c" }}
                            onClick={() => runAction(row.userId, "delete_user")}
                            disabled={busy}
                            title="Delete user from Clerk"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem", verticalAlign: "top", textAlign: "center" }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ width: "2rem", minWidth: "2rem", paddingInline: "0", justifyContent: "center" }}
                          onClick={() => toggleExpanded(row.userId)}
                          aria-expanded={expanded}
                          aria-label={expanded ? "Collapse row details" : "Expand row details"}
                          aria-controls={`resident-row-details-${row.userId}`}
                        >
                          <ChevronRight
                            style={{
                              width: "0.95rem",
                              height: "0.95rem",
                              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
                              transition: "transform 0.18s ease",
                            }}
                          />
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr
                        key={`${row.userId}-details`}
                        id={`resident-row-details-${row.userId}`}
                        style={{ borderTop: "1px solid var(--pp-slate-100)" }}
                      >
                        <td colSpan={5} style={{ padding: "1rem", background: "var(--pp-slate-50)" }}>
                          {renderExpandedDetails(row, busy, draftCommittees, committeesDirty, committeeMessage)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

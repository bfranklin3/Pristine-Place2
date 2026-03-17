"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Clock3, Loader2, ShieldAlert, Trash2 } from "lucide-react"

type WorkflowStatus = "initial_review" | "needs_more_info" | "committee_vote" | "approved" | "rejected"
type WorkflowStatusFilter = "all" | WorkflowStatus
type WorkflowSort = "submitted_desc" | "submitted_asc" | "request_number_asc" | "request_number_desc"
type VoteValue = "approve" | "reject"
type DecisionValue = "approve" | "reject"
type QueueAction =
  | "request_more_info"
  | "approve"
  | "reject"
  | "send_to_vote"
  | "cast_vote"
  | "override"
  | "verify"
  | "purge"

type QueueEntry = {
  id: string
  requestNumber: string
  permitNumber: string | null
  residentName: string
  residentEmail: string
  residentPhone: string | null
  residentAddress: string | null
  phase: string | null
  lot: string | null
  workType: string | null
  title: string | null
  description: string | null
  status: WorkflowStatus
  reviewCycle: number
  voteDeadlineAt: string | null
  finalDecision: DecisionValue | null
  finalDecisionAt: string | null
  decisionNote: string | null
  isVerified: boolean
  verifiedAt: string | null
  lockedAt: string | null
  submittedAt: string
  createdAt: string
  updatedAt: string
}

type WorkflowDetail = {
  id: string
  requestNumber: string
  permitNumber: string | null
  residentName: string
  residentEmail: string
  residentPhone: string | null
  residentAddress: string | null
  phase: string | null
  lot: string | null
  workType: string | null
  title: string | null
  description: string | null
  locationDetails: string | null
  authorizedRepName: string | null
  status: WorkflowStatus
  reviewCycle: number
  residentActionNote: string | null
  voteDeadlineAt: string | null
  finalDecision: DecisionValue | null
  finalDecisionAt: string | null
  finalDecisionByUserId: string | null
  finalDecisionByRole: string | null
  decisionNote: string | null
  isVerified: boolean
  verifiedAt: string | null
  verifiedByUserId: string | null
  verificationNote: string | null
  lockedAt: string | null
  submittedAt: string
  updatedAt: string
  formData: Record<string, string>
  attachments: Array<{
    id: string
    originalFilename: string
    url: string
    scope: string
    mimeType: string
    fileSizeBytes: number
    note: string | null
    createdAt: string
  }>
  votesCurrentCycle: Array<{
    id: string
    voterUserId: string
    vote: VoteValue
    createdAt: string
  }>
  voteSummary: {
    total: number
    approve: number
    reject: number
    currentUserVote: VoteValue | null
    hasCurrentUserVoted: boolean
  }
  events: Array<{
    id: string
    reviewCycle: number
    eventType: string
    actorUserId: string | null
    actorRole: string
    note: string | null
    metadata: unknown
    createdAt: string
  }>
}

type QueueResponse = {
  entries: QueueEntry[]
  total: number
  totalPages: number
  page: number
  perPage: number
  sort: WorkflowSort
  counts: Record<string, number>
}

const STATUS_FILTERS: Array<{ key: WorkflowStatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "initial_review", label: "Initial Review" },
  { key: "needs_more_info", label: "Needs More Info" },
  { key: "committee_vote", label: "Committee Vote" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
]

const SORT_OPTIONS: Array<{ key: WorkflowSort; label: string }> = [
  { key: "submitted_desc", label: "Newest Submitted" },
  { key: "submitted_asc", label: "Oldest Submitted" },
  { key: "request_number_asc", label: "Submit ID A-Z" },
  { key: "request_number_desc", label: "Submit ID Z-A" },
]

function statusLabel(status: WorkflowStatus) {
  if (status === "initial_review") return "Initial Review"
  if (status === "needs_more_info") return "Needs More Info"
  if (status === "committee_vote") return "Committee Vote"
  if (status === "approved") return "Approved"
  return "Rejected"
}

function formatDateTime(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

function hasDisplayValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim().length > 0
  return true
}

function formatDateOnly(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString()
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function statusBadgeStyles(status: WorkflowStatus) {
  if (status === "approved") return { background: "#dcfce7", color: "#166534" }
  if (status === "rejected") return { background: "#fee2e2", color: "#991b1b" }
  if (status === "committee_vote") return { background: "#dbeafe", color: "#1d4ed8" }
  if (status === "needs_more_info") return { background: "#ffedd5", color: "#9a3412" }
  return { background: "#f3f4f6", color: "#334155" }
}

function StatusBadge({ status }: { status: WorkflowStatus }) {
  const styles = statusBadgeStyles(status)
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "999px",
        padding: "0.25rem 0.7rem",
        fontSize: "0.75rem",
        fontWeight: 700,
        background: styles.background,
        color: styles.color,
      }}
    >
      {statusLabel(status)}
    </span>
  )
}

function EventLabel({ eventType }: { eventType: string }) {
  const label = eventType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
  return <span>{label}</span>
}

function detailActionHint(detail: WorkflowDetail) {
  if (detail.status === "initial_review") {
    return "Use the note when requesting more information or rejecting. Approve, reject, or send the request to committee vote from this panel."
  }

  if (detail.status === "needs_more_info") {
    return "Resident follow-up is still pending. Keep the request open in Needs More Info, or reject it with a note if it should be closed."
  }

  if (detail.status === "committee_vote" && detail.lockedAt) {
    return "Committee voting is complete for this review cycle."
  }

  if (detail.status === "committee_vote" && detail.voteSummary.hasCurrentUserVoted) {
    return "Your vote is recorded. Wait for the remaining committee votes, or use chair override if needed."
  }

  if (detail.status === "committee_vote") {
    return "Cast one vote for this review cycle. Chair users may also use override to finalize the request early."
  }

  if (detail.status === "approved" && !detail.isVerified) {
    return "The request is approved. Mark it verified after completion only when that follow-up is needed."
  }

  return "This request is finalized. Review the audit trail and attachments below."
}

type Props = {
  canControlWorkflow: boolean
  canVote: boolean
  canOverrideVote: boolean
  canVerify: boolean
  canPurge: boolean
}

export function AccQueueNeonTable(props: Props) {
  const searchParams = useSearchParams()
  const requestedSelectedId = searchParams.get("selected")
  const [entries, setEntries] = useState<QueueEntry[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(25)
  const [status, setStatus] = useState<WorkflowStatusFilter>("all")
  const [sort, setSort] = useState<WorkflowSort>("submitted_desc")
  const [queryInput, setQueryInput] = useState("")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<WorkflowDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const [actionNote, setActionNote] = useState("")
  const [voteDeadlineAt, setVoteDeadlineAt] = useState("")
  const [purgeConfirm, setPurgeConfirm] = useState("")
  const [saving, setSaving] = useState(false)
  const [uploadingAttachments, setUploadingAttachments] = useState(false)
  const [internalAttachmentFiles, setInternalAttachmentFiles] = useState<File[]>([])
  const [attachmentInputKey, setAttachmentInputKey] = useState(0)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const autoSelectedIdRef = useRef<string | null>(null)

  function resetFilters() {
    setQueryInput("")
    setQuery("")
    setStatus("all")
    setSort("submitted_desc")
    setPage(1)
  }

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("status", status)
      params.set("sort", sort)
      params.set("page", String(page))
      params.set("per_page", String(perPage))
      if (query.trim()) params.set("q", query.trim())

      const res = await fetch(`/api/acc/queue?${params.toString()}`, { cache: "no-store" })
      const body = (await res.json().catch(() => ({}))) as QueueResponse & { error?: string; detail?: string }
      if (!res.ok) throw new Error(body.error || body.detail || "Failed to load ACC queue.")

      setEntries(body.entries || [])
      setCounts(body.counts || {})
      setTotal(body.total || 0)
      setSort(body.sort || "submitted_desc")

      if (!selectedId && body.entries?.[0]?.id) {
        setSelectedId(body.entries[0].id)
      } else if (
        selectedId &&
        !body.entries?.some((entry) => entry.id === selectedId) &&
        autoSelectedIdRef.current !== selectedId
      ) {
        setSelectedId(body.entries?.[0]?.id || null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ACC queue.")
    } finally {
      setLoading(false)
    }
  }, [page, perPage, query, selectedId, sort, status])

  const fetchDetail = useCallback(async (requestId: string) => {
    setDetailLoading(true)
    setDetailError(null)

    try {
      const res = await fetch(`/api/acc/queue/${requestId}`, { cache: "no-store" })
      const body = (await res.json().catch(() => ({}))) as { request?: WorkflowDetail; error?: string; detail?: string }
      if (!res.ok || !body.request) throw new Error(body.error || body.detail || "Failed to load request detail.")

      setDetail(body.request)
      setActionNote(body.request.residentActionNote || body.request.decisionNote || body.request.verificationNote || "")
      setVoteDeadlineAt(
        body.request.voteDeadlineAt
          ? toDateTimeLocalValue(body.request.voteDeadlineAt)
          : toDateTimeLocalValue(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()),
      )
      setPurgeConfirm("")
    } catch (err) {
      setDetail(null)
      setDetailError(err instanceof Error ? err.message : "Failed to load request detail.")
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  useEffect(() => {
    if (!requestedSelectedId) {
      autoSelectedIdRef.current = null
      return
    }
    if (autoSelectedIdRef.current === requestedSelectedId) return
    setSelectedId(requestedSelectedId)
    autoSelectedIdRef.current = requestedSelectedId
  }, [requestedSelectedId])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    fetchDetail(selectedId)
  }, [fetchDetail, selectedId])

  async function runAction(action: QueueAction, extras: Record<string, unknown> = {}) {
    if (!detail) return

    setSaving(true)
    setStatusMessage(null)

    try {
      const res = await fetch(`/api/acc/queue/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: actionNote, voteDeadlineAt, confirmText: purgeConfirm, ...extras }),
      })

      const body = (await res.json().catch(() => ({}))) as {
        request?: WorkflowDetail
        deletedRequestId?: string
        error?: string
        detail?: string
        validationErrors?: string[]
      }

      if (!res.ok) {
        throw new Error(body.validationErrors?.[0] || body.error || body.detail || "Workflow action failed.")
      }

      if (body.deletedRequestId) {
        setStatusMessage({ type: "success", text: "ACC request permanently deleted." })
        setSelectedId(null)
        setDetail(null)
        await fetchEntries()
        return
      }

      if (body.request) {
        setDetail(body.request)
        setStatusMessage({ type: "success", text: "Workflow updated successfully." })
      }

      await fetchEntries()
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Workflow action failed.",
      })
    } finally {
      setSaving(false)
    }
  }

  async function uploadManagementAttachments() {
    if (!detail || internalAttachmentFiles.length === 0) return

    setUploadingAttachments(true)
    setStatusMessage(null)

    try {
      const formData = new FormData()
      for (const file of internalAttachmentFiles) {
        formData.append("files", file, file.name)
      }

      const res = await fetch(`/api/acc/queue/${detail.id}/attachments`, {
        method: "POST",
        body: formData,
      })
      const body = (await res.json().catch(() => ({}))) as {
        request?: WorkflowDetail
        error?: string
        detail?: string
        validationErrors?: string[]
      }

      if (!res.ok || !body.request) {
        throw new Error(body.validationErrors?.[0] || body.error || body.detail || "Failed to upload attachments.")
      }

      setDetail(body.request)
      setInternalAttachmentFiles([])
      setAttachmentInputKey((current) => current + 1)
      setStatusMessage({ type: "success", text: "Attachments uploaded." })
      await fetchEntries()
    } catch (err) {
      setStatusMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to upload attachments." })
    } finally {
      setUploadingAttachments(false)
    }
  }

  async function deleteManagementAttachment(attachmentId: string) {
    if (!detail) return

    setUploadingAttachments(true)
    setStatusMessage(null)
    try {
      const res = await fetch(`/api/acc/queue/${detail.id}/attachments/${attachmentId}`, {
        method: "DELETE",
      })
      const body = (await res.json().catch(() => ({}))) as {
        request?: WorkflowDetail
        error?: string
        detail?: string
      }

      if (!res.ok || !body.request) {
        throw new Error(body.error || body.detail || "Failed to delete attachment.")
      }

      setDetail(body.request)
      setStatusMessage({ type: "success", text: "Attachment deleted." })
      await fetchEntries()
    } catch (err) {
      setStatusMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to delete attachment." })
    } finally {
      setUploadingAttachments(false)
    }
  }

  const pageStart = total === 0 ? 0 : (page - 1) * perPage + 1
  const pageEnd = Math.min(total, page * perPage)

  return (
    <div className="stack" style={{ gap: "var(--space-l)" }}>
      <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))" }}>
        {STATUS_FILTERS.filter((filter) => filter.key !== "all").map((filter) => (
          <div key={filter.key} className="card" style={{ padding: "0.9rem 1rem" }}>
            <div className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>{filter.label}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--pp-navy-dark)" }}>{counts[filter.key] || 0}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: "1rem" }}>
        <div style={{ display: "grid", gap: "0.8rem", gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))" }}>
          <input
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                setQuery(queryInput.trim())
                setPage(1)
              }
            }}
            placeholder="Search request number, name, address, title, or description"
            style={{ width: "100%", border: "1.5px solid var(--pp-slate-200)", borderRadius: "var(--radius-sm)", padding: "0.7rem 0.8rem" }}
          />
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as WorkflowStatusFilter)
              setPage(1)
            }}
            style={{ width: "100%", border: "1.5px solid var(--pp-slate-200)", borderRadius: "var(--radius-sm)", padding: "0.7rem 0.8rem" }}
          >
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.key} value={filter.key}>{filter.label}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as WorkflowSort)
              setPage(1)
            }}
            style={{ width: "100%", border: "1.5px solid var(--pp-slate-200)", borderRadius: "var(--radius-sm)", padding: "0.7rem 0.8rem" }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
          <button type="button" className="btn btn-primary" onClick={() => { setQuery(queryInput); setPage(1) }}>
            Filter
          </button>
          <button type="button" className="btn btn-secondary" onClick={resetFilters}>
            Clear
          </button>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ padding: "1rem", borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}>
          {error}
        </div>
      ) : null}

      {!loading && (counts.all || 0) === 0 ? (
        <div className="card" style={{ padding: "1rem", background: "#fffef8" }}>
          <div style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>No native ACC workflow requests yet</div>
          <p style={{ margin: "0.45rem 0 0 0", color: "var(--pp-slate-700)" }}>
            This queue now shows only new native ACC workflow submissions. Existing imported WordPress ACC records remain in the legacy queue until native requests are created.
          </p>
          <p style={{ margin: "0.45rem 0 0 0" }}>
            <Link href="/resident-portal/management/wp-acc-queue">Open legacy ACC queue</Link>
          </p>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(22rem, 1fr))" }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "0.9rem 1rem", borderBottom: "1px solid var(--pp-slate-100)", display: "flex", justifyContent: "space-between", gap: "1rem" }}>
            <div style={{ color: "var(--pp-slate-700)" }}>
              {loading ? "Loading..." : `${pageStart}-${pageEnd} of ${total}`}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" className="btn btn-secondary" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>Prev</button>
              <button type="button" className="btn btn-secondary" disabled={pageEnd >= total || loading} onClick={() => setPage((current) => current + 1)}>Next</button>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                  {["Submit ID", "Resident", "Request", "Status", "Submitted"].map((heading) => (
                    <th key={heading} style={{ padding: "0.8rem 1rem", fontSize: "0.8rem", color: "var(--pp-slate-600)" }}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => setSelectedId(entry.id)}
                    style={{
                      cursor: "pointer",
                      borderTop: "1px solid var(--pp-slate-100)",
                      background: selectedId === entry.id ? "#f8fafc" : "transparent",
                    }}
                  >
                    <td style={{ padding: "0.85rem 1rem", verticalAlign: "top", whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: 700, color: "var(--pp-navy-dark)", fontFamily: "monospace" }}>{entry.requestNumber}</div>
                      {entry.permitNumber ? (
                        <div className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", marginTop: "0.2rem" }}>
                          Permit {entry.permitNumber}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", verticalAlign: "top" }}>
                      <div style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>{entry.residentName}</div>
                      <div className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>{entry.residentAddress || "No address"}</div>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", verticalAlign: "top" }}>
                      <div style={{ fontWeight: 700 }}>{entry.title || "ACC Request"}</div>
                      <div className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>{entry.description || "No description provided."}</div>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", verticalAlign: "top" }}>
                      <StatusBadge status={entry.status} />
                      {entry.isVerified ? (
                        <div className="text-fluid-sm" style={{ marginTop: "0.35rem", color: "#166534" }}>Verified complete</div>
                      ) : null}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", verticalAlign: "top", color: "var(--pp-slate-600)" }}>
                      {formatDateOnly(entry.submittedAt)}
                    </td>
                  </tr>
                ))}
                {!loading && entries.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "1rem", textAlign: "center", color: "var(--pp-slate-600)" }}>
                      No workflow requests match the current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ padding: "1rem" }}>
          {!selectedId ? (
            <div style={{ color: "var(--pp-slate-600)" }}>Select a request to view details.</div>
          ) : detailLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--pp-slate-700)" }}>
              <Loader2 className="animate-spin" style={{ width: "1rem", height: "1rem" }} />
              Loading request detail...
            </div>
          ) : detailError ? (
            <div style={{ color: "#991b1b" }}>{detailError}</div>
          ) : detail ? (
            <div className="stack" style={{ gap: "1rem" }}>
              {(() => {
                const summaryItems = [
                  { label: "Permit Number", value: detail.permitNumber },
                  { label: "Submitted", value: formatDateTime(detail.submittedAt) },
                  { label: "Review Cycle", value: detail.reviewCycle },
                  { label: "Work Type", value: detail.workType },
                  { label: "Vote Deadline", value: detail.voteDeadlineAt ? formatDateTime(detail.voteDeadlineAt) : null },
                ].filter((item) => hasDisplayValue(item.value))

                const formSnapshotEntries = Object.entries(detail.formData).filter(([, value]) => hasDisplayValue(value))

                return (
                  <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0, color: "var(--pp-navy-dark)" }}>{detail.title || "ACC Request"}</h3>
                  <div className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", marginTop: "0.25rem" }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{detail.requestNumber}</span>
                    {detail.permitNumber ? (
                      <>
                        {" • Permit "}
                        <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{detail.permitNumber}</span>
                      </>
                    ) : null}
                    {" • "}
                    {detail.residentName} • {detail.residentAddress || "No address"}
                  </div>
                </div>
                <StatusBadge status={detail.status} />
              </div>

              {statusMessage ? (
                <div
                  style={{
                    padding: "0.8rem 0.9rem",
                    borderRadius: "var(--radius-sm)",
                    background: statusMessage.type === "success" ? "#f0fdf4" : "#fef2f2",
                    color: statusMessage.type === "success" ? "#166534" : "#991b1b",
                  }}
                >
                  {statusMessage.text}
                </div>
              ) : null}

              {detail.residentActionNote ? (
                <div style={{ padding: "0.85rem 0.9rem", borderRadius: "var(--radius-sm)", background: "#fff7ed", color: "#9a3412" }}>
                  <strong>Resident action note:</strong> {detail.residentActionNote}
                </div>
              ) : null}

              {detail.decisionNote ? (
                <div style={{ padding: "0.85rem 0.9rem", borderRadius: "var(--radius-sm)", background: "#f8fafc", color: "var(--pp-slate-700)" }}>
                  <strong>Decision note:</strong> {detail.decisionNote}
                </div>
              ) : null}

              {detail.isVerified ? (
                <div style={{ padding: "0.85rem 0.9rem", borderRadius: "var(--radius-sm)", background: "#f0fdf4", color: "#166534" }}>
                  <strong>Verified complete:</strong> {formatDateTime(detail.verifiedAt)}
                  {detail.verificationNote ? ` • ${detail.verificationNote}` : ""}
                </div>
              ) : null}

              <div style={{ display: "grid", gap: "0.8rem", gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))" }}>
                {summaryItems.map((item) => (
                  <div key={item.label}>
                    <strong>{item.label}</strong>
                    <div>{String(item.value)}</div>
                  </div>
                ))}
              </div>

              {detail.description ? (
                <div>
                  <strong>Project Description</strong>
                  <p style={{ margin: "0.35rem 0 0 0", color: "var(--pp-slate-700)" }}>{detail.description}</p>
                </div>
              ) : null}

              {detail.locationDetails ? (
                <div>
                  <strong>Project Details</strong>
                  <p style={{ margin: "0.35rem 0 0 0", color: "var(--pp-slate-700)" }}>{detail.locationDetails}</p>
                </div>
              ) : null}

              <div className="card" style={{ padding: "0.9rem", background: "#fbfdff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.6rem" }}>
                  <Clock3 style={{ width: "1rem", height: "1rem", color: "var(--pp-navy)" }} />
                  <strong>Committee Vote</strong>
                </div>
                <div style={{ display: "grid", gap: "0.45rem", gridTemplateColumns: "repeat(auto-fit, minmax(8rem, 1fr))" }}>
                  <div><strong>Total</strong><div>{detail.voteSummary.total} / 3</div></div>
                  <div><strong>Approve</strong><div>{detail.voteSummary.approve}</div></div>
                  <div><strong>Reject</strong><div>{detail.voteSummary.reject}</div></div>
                  <div><strong>Your Vote</strong><div>{detail.voteSummary.currentUserVote || "—"}</div></div>
                </div>
              </div>

              {formSnapshotEntries.length ? (
                <div>
                  <strong>Form Snapshot</strong>
                  <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))", marginTop: "0.6rem" }}>
                    {formSnapshotEntries.map(([key, value]) => (
                      <div key={key} style={{ padding: "0.65rem 0.75rem", borderRadius: "var(--radius-sm)", background: "#f8fafc" }}>
                        <div className="text-fluid-xs" style={{ color: "var(--pp-slate-600)", textTransform: "capitalize" }}>{key.replace(/([A-Z])/g, " $1")}</div>
                        <div style={{ marginTop: "0.25rem" }}>{String(value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <strong>Event Timeline</strong>
                <div className="stack" style={{ gap: "0.55rem", marginTop: "0.6rem" }}>
                  {detail.events.map((event) => (
                    <div key={event.id} style={{ padding: "0.75rem", borderRadius: "var(--radius-sm)", background: "#f8fafc" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem", flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 700 }}>
                          <EventLabel eventType={event.eventType} />
                        </div>
                        <div className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>{formatDateTime(event.createdAt)}</div>
                      </div>
                      <div className="text-fluid-sm" style={{ marginTop: "0.25rem", color: "var(--pp-slate-600)" }}>
                        {event.actorRole}{event.actorUserId ? ` • ${event.actorUserId}` : ""}
                      </div>
                      {event.note ? <div style={{ marginTop: "0.35rem" }}>{event.note}</div> : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: "0.9rem", background: "#fffef8" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.6rem" }}>
                  <ShieldAlert style={{ width: "1rem", height: "1rem", color: "var(--pp-navy)" }} />
                  <strong>Workflow Actions</strong>
                </div>

                {props.canControlWorkflow && detail.status === "initial_review" ? (
                  <div style={{ margin: "0 0 0.75rem 0", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                    <Link href={`/resident-portal/management/acc-queue/${detail.id}/edit`} className="btn btn-secondary">
                      Open Full Edit Form
                    </Link>
                    <a
                      href={`/api/acc/submitted-form?source=native&id=${encodeURIComponent(detail.id)}`}
                      className="btn btn-secondary"
                    >
                      Download Submitted Form
                    </a>
                  </div>
                ) : null}

                {(!props.canControlWorkflow || detail.status !== "initial_review") ? (
                  <div style={{ margin: "0 0 0.75rem 0" }}>
                    <a
                      href={`/api/acc/submitted-form?source=native&id=${encodeURIComponent(detail.id)}`}
                      className="btn btn-secondary"
                    >
                      Download Submitted Form
                    </a>
                  </div>
                ) : null}

                <div style={{ marginBottom: "0.75rem", padding: "0.75rem 0.85rem", borderRadius: "var(--radius-sm)", background: "#f8fafc", color: "var(--pp-slate-700)" }}>
                  {detailActionHint(detail)}
                </div>

                <textarea
                  value={actionNote}
                  onChange={(event) => setActionNote(event.target.value)}
                  rows={4}
                  placeholder="Decision note, resident note, override note, or verification note"
                  style={{ width: "100%", border: "1.5px solid var(--pp-slate-200)", borderRadius: "var(--radius-sm)", padding: "0.75rem", resize: "vertical" }}
                />

                <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.6rem" }}>
                  {props.canControlWorkflow && detail.status === "initial_review" ? (
                    <>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button type="button" className="btn btn-primary" disabled={saving} onClick={() => runAction("approve")}>Approve</button>
                        <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => runAction("request_more_info")}>Request More Info</button>
                        <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => runAction("reject")}>Reject</button>
                      </div>
                      <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "1fr auto" }}>
                        <input
                          type="datetime-local"
                          value={voteDeadlineAt}
                          onChange={(event) => setVoteDeadlineAt(event.target.value)}
                          style={{ width: "100%", border: "1.5px solid var(--pp-slate-200)", borderRadius: "var(--radius-sm)", padding: "0.7rem 0.8rem" }}
                        />
                        <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => runAction("send_to_vote")}>Send to Vote</button>
                      </div>
                    </>
                  ) : null}

                  {props.canControlWorkflow && detail.status === "needs_more_info" ? (
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => runAction("reject")}>
                        Reject
                      </button>
                    </div>
                  ) : null}

                  {props.canVote && detail.status === "committee_vote" && !detail.lockedAt ? (
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button type="button" className="btn btn-primary" disabled={saving || detail.voteSummary.hasCurrentUserVoted} onClick={() => runAction("cast_vote", { vote: "approve" })}>
                        Cast Approve Vote
                      </button>
                      <button type="button" className="btn btn-secondary" disabled={saving || detail.voteSummary.hasCurrentUserVoted} onClick={() => runAction("cast_vote", { vote: "reject" })}>
                        Cast Reject Vote
                      </button>
                    </div>
                  ) : null}

                  {props.canOverrideVote && detail.status === "committee_vote" && !detail.lockedAt ? (
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button type="button" className="btn btn-primary" disabled={saving} onClick={() => runAction("override", { decision: "approve" })}>
                        Chair Override Approve
                      </button>
                      <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => runAction("override", { decision: "reject" })}>
                        Chair Override Reject
                      </button>
                    </div>
                  ) : null}

                  {props.canVerify && detail.status === "approved" && !detail.isVerified ? (
                    <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => runAction("verify")}>
                      Mark Verified
                    </button>
                  ) : null}

                  {props.canPurge ? (
                    <div
                      style={{
                        display: "grid",
                        marginTop: "0.75rem",
                        padding: "1rem 1rem 1.1rem",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid #fecaca",
                        background: "#fff7f7",
                        gap: "0.95rem",
                      }}
                    >
                      <h4 style={{ margin: 0, color: "#7f1d1d", lineHeight: 1.15 }}>Admin Purge</h4>
                      <p style={{ margin: 0, color: "var(--pp-slate-700)", fontSize: "0.9rem", lineHeight: 1.65 }}>
                        Permanently delete this native workflow request and all related records. Type <strong>PURGE</strong> to confirm.
                      </p>
                      <div style={{ paddingTop: "0.1rem" }}>
                        <input
                          value={purgeConfirm}
                          onChange={(event) => setPurgeConfirm(event.target.value)}
                          placeholder="Type PURGE to confirm"
                          className="form-input"
                          style={{ width: "100%" }}
                        />
                      </div>
                      <div style={{ paddingTop: "0.15rem" }}>
                        <button type="button" className="btn btn-secondary" disabled={saving || purgeConfirm.trim().toUpperCase() !== "PURGE"} onClick={() => runAction("purge")} style={{ background: "#7f1d1d", borderColor: "#7f1d1d", color: "#fff" }}>
                          <Trash2 style={{ width: "0.9rem", height: "0.9rem" }} />
                          Purge
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {saving ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginTop: "0.75rem", color: "var(--pp-slate-600)" }}>
                    <Loader2 className="animate-spin" style={{ width: "0.95rem", height: "0.95rem" }} />
                    Applying workflow action...
                  </div>
                ) : null}
              </div>

              <div>
                <strong>Attachments</strong>
                {detail.attachments.length === 0 ? (
                  <div className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", marginTop: "0.45rem" }}>
                    No native attachments have been added yet.
                  </div>
                ) : (
                  <div className="stack" style={{ gap: "0.45rem", marginTop: "0.5rem" }}>
                    {detail.attachments.map((attachment) => (
                      <div key={attachment.id} style={{ padding: "0.7rem", borderRadius: "var(--radius-sm)", background: "#f8fafc" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                          <a href={attachment.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700 }}>
                            {attachment.originalFilename}
                          </a>
                          {props.canControlWorkflow ? (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled={uploadingAttachments}
                              onClick={() => deleteManagementAttachment(attachment.id)}
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                        <div className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>
                          {attachment.mimeType} • {attachment.fileSizeBytes} bytes • {attachment.scope}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {props.canControlWorkflow && detail.status === "initial_review" ? (
                  <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.5rem" }}>
                    <input
                      key={attachmentInputKey}
                      type="file"
                      multiple
                      onChange={(event) => setInternalAttachmentFiles(Array.from(event.target.files ?? []))}
                    />
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={uploadingAttachments || internalAttachmentFiles.length === 0}
                        onClick={uploadManagementAttachments}
                      >
                        {uploadingAttachments ? "Uploading..." : "Upload attachments"}
                      </button>
                      <span className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>
                        {internalAttachmentFiles.length
                          ? `${internalAttachmentFiles.length} file${internalAttachmentFiles.length === 1 ? "" : "s"} selected`
                          : "No files selected"}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
                  </>
                )
              })()}
            </div>
          ) : null}
        </div>
      </div>

      {detail?.status === "committee_vote" && detail.voteSummary.hasCurrentUserVoted ? (
        <div className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>
          Your vote has been recorded for this review cycle.
        </div>
      ) : null}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--pp-slate-600)" }}>
          <Loader2 className="animate-spin" style={{ width: "1rem", height: "1rem" }} />
          Loading workflow requests...
        </div>
      ) : null}
    </div>
  )
}

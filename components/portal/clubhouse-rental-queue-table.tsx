"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AlertCircle, FileText, Loader2 } from "lucide-react"

type RentalStatus = "submitted" | "needs_more_info" | "approved" | "rejected"
type RentalStatusFilter = "all" | RentalStatus
type RentalSort = "submitted_desc" | "submitted_asc" | "request_number_asc" | "request_number_desc"
type QueueAction = "request_more_info" | "approve" | "reject" | "purge"

type QueueEntry = {
  id: string
  requestNumber: string
  residentName: string
  residentEmail: string
  residentPhone: string | null
  residentAddress: string | null
  eventType: string
  reservationDate: string
  reservationStartLabel: string
  reservationEndLabel: string
  guestCount: number
  requestedSpace: string
  status: RentalStatus
  reviewCycle: number
  residentActionNote: string | null
  finalDecision: "approve" | "reject" | null
  finalDecisionAt: string | null
  decisionNote: string | null
  submittedAt: string
  createdAt: string
  updatedAt: string
}

type QueueDetail = QueueEntry & {
  residentClerkUserId: string
  eventDescription: string
  specialRequests: string | null
  vendorsInvolved: boolean
  vendorDetails: string | null
  insuranceCompany: string
  policyNumber: string
  typedConfirmationName: string
  clubhouseAgreementInitials: string
  insuranceInitials: string
  decorationInitials: string
  acknowledgeRentalRules: boolean
  acknowledgeDepositResponsibility: boolean
  acknowledgeAttendanceResponsibility: boolean
  acknowledgeCapacitySafety: boolean
  finalDecisionByUserId: string | null
  finalDecisionByRole: string | null
  lockedAt: string | null
  formData: Record<string, unknown>
  attachments: Array<{
    id: string
    originalFilename: string
    url: string
    mimeType: string
    fileSizeBytes: number
    scope: string
    note: string | null
    createdAt: string
  }>
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
  sort: RentalSort
  counts: Record<string, number>
}

type AvailabilityConflict = {
  id: string
  source: "rental" | "hoa_event"
  title: string
  subtitle: string
  statusLabel: string
  isBlocking: boolean
  scope: "clubhouse" | "ballroom"
  date: string
  startLabel: string
  endLabel: string
  locationLabel: string
  href: string | null
}

const STATUS_FILTERS: Array<{ key: RentalStatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "submitted", label: "Submitted" },
  { key: "needs_more_info", label: "Needs More Info" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
]

const SORT_OPTIONS: Array<{ key: RentalSort; label: string }> = [
  { key: "submitted_desc", label: "Newest Submitted" },
  { key: "submitted_asc", label: "Oldest Submitted" },
  { key: "request_number_asc", label: "Submit ID A-Z" },
  { key: "request_number_desc", label: "Submit ID Z-A" },
]

function formatDateOnly(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString()
}

function formatDateTime(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

function formatEventType(value: string) {
  return value || "—"
}

function formatSpace(value: string) {
  if (value === "grand_ballroom") return "Grand Ballroom"
  return value
}

function statusLabel(status: RentalStatus) {
  if (status === "submitted") return "Submitted"
  if (status === "needs_more_info") return "Needs More Info"
  if (status === "approved") return "Approved"
  return "Rejected"
}

function statusBadgeStyles(status: RentalStatus) {
  if (status === "approved") return { background: "#dcfce7", color: "#166534" }
  if (status === "rejected") return { background: "#fee2e2", color: "#991b1b" }
  if (status === "needs_more_info") return { background: "#ffedd5", color: "#9a3412" }
  return { background: "#e0f2fe", color: "#0f4c81" }
}

function StatusBadge({ status }: { status: RentalStatus }) {
  const styles = statusBadgeStyles(status)
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "2rem",
        padding: "0.25rem 0.8rem",
        borderRadius: "999px",
        background: styles.background,
        color: styles.color,
        fontSize: "0.78rem",
        fontWeight: 700,
        lineHeight: 1.2,
        textAlign: "center",
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

export function ClubhouseRentalQueueTable({ canPurge = false }: { canPurge?: boolean }) {
  const searchParams = useSearchParams()
  const requestedSelectedId = searchParams.get("selected")
  const [entries, setEntries] = useState<QueueEntry[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(25)
  const [status, setStatus] = useState<RentalStatusFilter>("all")
  const [sort, setSort] = useState<RentalSort>("submitted_desc")
  const [queryInput, setQueryInput] = useState("")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(requestedSelectedId)
  const [detail, setDetail] = useState<QueueDetail | null>(null)
  const [conflicts, setConflicts] = useState<{ blockingConflicts: AvailabilityConflict[]; tentativeConflicts: AvailabilityConflict[] }>({
    blockingConflicts: [],
    tentativeConflicts: [],
  })
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [actionNote, setActionNote] = useState("")
  const [purgeConfirm, setPurgeConfirm] = useState("")
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

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

      const res = await fetch(`/api/clubhouse-rental/queue?${params.toString()}`, { cache: "no-store" })
      const body = (await res.json().catch(() => ({}))) as QueueResponse & { error?: string; detail?: string }
      if (!res.ok) throw new Error(body.error || body.detail || "Failed to load clubhouse rental queue.")

      setEntries(body.entries || [])
      setCounts(body.counts || {})
      setTotal(body.total || 0)
      setSort(body.sort || "submitted_desc")

      if (requestedSelectedId && body.entries.some((entry) => entry.id === requestedSelectedId)) {
        setSelectedId(requestedSelectedId)
      } else if (!selectedId && body.entries[0]?.id) {
        setSelectedId(body.entries[0].id)
      } else if (selectedId && !body.entries.some((entry) => entry.id === selectedId)) {
        setSelectedId(body.entries[0]?.id || null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clubhouse rental queue.")
    } finally {
      setLoading(false)
    }
  }, [page, perPage, query, requestedSelectedId, selectedId, sort, status])

  const fetchDetail = useCallback(async (requestId: string) => {
    setDetailLoading(true)
    setDetailError(null)
    setStatusMessage(null)
    try {
      const res = await fetch(`/api/clubhouse-rental/queue/${requestId}`, { cache: "no-store" })
      const body = (await res.json().catch(() => ({}))) as {
        request?: QueueDetail
        conflicts?: { blockingConflicts: AvailabilityConflict[]; tentativeConflicts: AvailabilityConflict[] }
        error?: string
        detail?: string
      }
      if (!res.ok || !body.request) {
        throw new Error(body.error || body.detail || "Failed to load request detail.")
      }

      setDetail(body.request)
      setConflicts(
        body.conflicts || {
          blockingConflicts: [],
          tentativeConflicts: [],
        },
      )
      setActionNote(body.request.residentActionNote || body.request.decisionNote || "")
    } catch (err) {
      setDetail(null)
      setConflicts({ blockingConflicts: [], tentativeConflicts: [] })
      setDetailError(err instanceof Error ? err.message : "Failed to load request detail.")
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    fetchDetail(selectedId)
  }, [fetchDetail, selectedId])

  async function runAction(action: QueueAction) {
    if (!selectedId) return
    setSaving(true)
    setStatusMessage(null)
    try {
      const res = await fetch(`/api/clubhouse-rental/queue/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: actionNote, confirmText: purgeConfirm }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        request?: QueueDetail
        deletedRequestId?: string
        error?: string
        detail?: string
        validationErrors?: string[]
      }
      if (!res.ok || (!body.request && !body.deletedRequestId)) {
        throw new Error(body.validationErrors?.[0] || body.error || body.detail || "Failed to update request.")
      }

      if (body.deletedRequestId) {
        setDetail(null)
        setActionNote("")
        setPurgeConfirm("")
        setEntries((current) => current.filter((entry) => entry.id !== body.deletedRequestId))
        setStatusMessage({
          type: "success",
          text: "Request permanently deleted.",
        })
      } else if (body.request) {
        setDetail(body.request)
        setEntries((current) => current.map((entry) => (entry.id === body.request?.id ? body.request : entry)))
        setStatusMessage({
          type: "success",
          text:
            action === "request_more_info"
              ? "Request moved to Needs More Info."
              : action === "approve"
                ? "Request approved."
                : "Request rejected.",
        })
      }
      await fetchEntries()
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update request.",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="stack" style={{ gap: "var(--space-l)" }}>
      <div
        className="card"
        style={{
          padding: "var(--space-m)",
          display: "grid",
          gap: "0.9rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "center",
          }}
        >
          <input
            className="form-input"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder="Search by submit ID, resident, address, email, or event"
            style={{ flex: "1 1 18rem" }}
          />
          <select className="form-input" value={status} onChange={(event) => setStatus(event.target.value as RentalStatusFilter)} style={{ width: "14rem" }}>
            {STATUS_FILTERS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <select className="form-input" value={sort} onChange={(event) => setSort(event.target.value as RentalSort)} style={{ width: "13rem" }}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setPage(1)
              setQuery(queryInput.trim())
            }}
          >
            Filter
          </button>
          <button type="button" className="btn btn-secondary" onClick={resetFilters}>
            Clear
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => {
                setStatus(filter.key)
                setPage(1)
              }}
              className={filter.key === status ? "btn btn-primary" : "btn btn-secondary"}
              style={{ padding: "0.45rem 0.75rem", fontSize: "0.78rem" }}
            >
              {filter.label} ({counts[filter.key] ?? 0})
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(20rem, 0.95fr)",
          gap: "var(--space-l)",
          alignItems: "start",
        }}
      >
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1.3fr 0.9fr 0.9fr 0.8fr",
              gap: "0.75rem",
              padding: "0.85rem 1rem",
              borderBottom: "1px solid var(--border)",
              background: "var(--pp-slate-50)",
              fontSize: "0.77rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--pp-slate-500)",
            }}
          >
            <span>Submit ID</span>
            <span>Resident / Event</span>
            <span>Reservation</span>
            <span>Submitted</span>
            <span>Status</span>
          </div>

          {loading ? (
            <div style={{ padding: "2rem 1rem", display: "flex", justifyContent: "center" }}>
              <Loader2 className="animate-spin" style={{ width: "1.2rem", height: "1.2rem" }} />
            </div>
          ) : error ? (
            <div style={{ padding: "1rem", color: "#991b1b" }}>{error}</div>
          ) : entries.length === 0 ? (
            <div style={{ padding: "1rem", color: "var(--pp-slate-600)" }}>
              No clubhouse rental requests match the current filters.
            </div>
          ) : (
            entries.map((entry) => {
              const isSelected = entry.id === selectedId
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedId(entry.id)}
                  style={{
                    width: "100%",
                    display: "grid",
                    gridTemplateColumns: "1.2fr 1.3fr 0.9fr 0.9fr 0.8fr",
                    gap: "0.75rem",
                    padding: "1rem",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    background: isSelected ? "#f8fafc" : "#fff",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>{entry.requestNumber}</div>
                    <div style={{ marginTop: "0.25rem", fontSize: "0.82rem", color: "var(--pp-slate-500)" }}>
                      Cycle {entry.reviewCycle}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>{entry.residentName}</div>
                    <div style={{ marginTop: "0.2rem", fontSize: "0.84rem", color: "var(--pp-slate-600)" }}>
                      {formatEventType(entry.eventType)}
                    </div>
                    <div style={{ marginTop: "0.2rem", fontSize: "0.82rem", color: "var(--pp-slate-500)" }}>
                      {entry.residentAddress || "—"}
                    </div>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--pp-slate-700)" }}>
                    <div>{formatDateOnly(entry.reservationDate)}</div>
                    <div style={{ marginTop: "0.2rem", color: "var(--pp-slate-500)" }}>
                      {entry.reservationStartLabel} - {entry.reservationEndLabel}
                    </div>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--pp-slate-700)" }}>{formatDateOnly(entry.submittedAt)}</div>
                  <div>
                    <StatusBadge status={entry.status} />
                  </div>
                </button>
              )
            })
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.9rem 1rem",
              color: "var(--pp-slate-600)",
            }}
          >
            <span className="text-fluid-sm">
              Showing {entries.length} of {total}
            </span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
                Previous
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPage((current) => current + 1)}
                disabled={page * perPage >= total}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: "var(--space-l)" }}>
          {detailLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "2rem 0" }}>
              <Loader2 className="animate-spin" style={{ width: "1.2rem", height: "1.2rem" }} />
            </div>
          ) : detailError ? (
            <p style={{ color: "#991b1b", margin: 0 }}>{detailError}</p>
          ) : !detail ? (
            <p style={{ margin: 0, color: "var(--pp-slate-600)" }}>Select a clubhouse rental request to review it.</p>
          ) : (
            <div className="stack" style={{ gap: "var(--space-m)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
                <div>
                  <p className="text-fluid-xs font-bold" style={{ color: "var(--pp-slate-500)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    {detail.requestNumber}
                  </p>
                  <h3 style={{ margin: "0.25rem 0 0 0", color: "var(--pp-navy-dark)" }}>{detail.residentName}</h3>
                  <p style={{ margin: "0.35rem 0 0 0", color: "var(--pp-slate-600)" }}>
                    {detail.residentAddress || "No address"} · {formatEventType(detail.eventType)}
                  </p>
                </div>
                <StatusBadge status={detail.status} />
              </div>

              {statusMessage ? (
                <div
                  style={{
                    padding: "0.8rem 0.95rem",
                    borderRadius: "var(--radius-md)",
                    background: statusMessage.type === "success" ? "#ecfdf5" : "#fef2f2",
                    color: statusMessage.type === "success" ? "#166534" : "#991b1b",
                    fontWeight: 600,
                  }}
                >
                  {statusMessage.text}
                </div>
              ) : null}

              {detail.status === "needs_more_info" && detail.residentActionNote ? (
                <div
                  style={{
                    padding: "0.85rem 0.95rem",
                    borderRadius: "var(--radius-md)",
                    background: "#fff7ed",
                    color: "#9a3412",
                  }}
                >
                  <strong>Resident action note:</strong> {detail.residentActionNote}
                </div>
              ) : null}

              {conflicts.blockingConflicts.length > 0 || conflicts.tentativeConflicts.length > 0 ? (
                <div
                  style={{
                    padding: "0.95rem 1rem",
                    borderRadius: "var(--radius-md)",
                    background: "#fff7ed",
                    border: "1px solid #fed7aa",
                    color: "#9a3412",
                    display: "grid",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                    <AlertCircle style={{ width: "1rem", height: "1rem", marginTop: "0.15rem", flexShrink: 0 }} />
                    <div>
                      <strong>Availability warnings</strong>
                      <div style={{ marginTop: "0.2rem" }}>
                        Review these overlaps before approving this rental request.
                      </div>
                    </div>
                  </div>

                  {conflicts.blockingConflicts.length > 0 ? (
                    <div className="stack-xs">
                      <strong>Booked conflicts</strong>
                      {conflicts.blockingConflicts.map((conflict) => (
                        <div key={conflict.id} style={{ color: "#7c2d12" }}>
                          {formatDateOnly(conflict.date)} · {conflict.startLabel} - {conflict.endLabel} · {conflict.title}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {conflicts.tentativeConflicts.length > 0 ? (
                    <div className="stack-xs">
                      <strong>Tentative overlaps</strong>
                      {conflicts.tentativeConflicts.map((conflict) => (
                        <div key={conflict.id} style={{ color: "#7c2d12" }}>
                          {formatDateOnly(conflict.date)} · {conflict.startLabel} - {conflict.endLabel} · {conflict.title}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "0.9rem 1rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Submitted</div>
                  <div style={{ color: "var(--pp-slate-600)" }}>{formatDateOnly(detail.submittedAt)}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Reservation</div>
                  <div style={{ color: "var(--pp-slate-600)" }}>
                    {formatDateOnly(detail.reservationDate)} · {detail.reservationStartLabel} - {detail.reservationEndLabel}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Guest Count</div>
                  <div style={{ color: "var(--pp-slate-600)" }}>{detail.guestCount}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Requested Space</div>
                  <div style={{ color: "var(--pp-slate-600)" }}>{formatSpace(detail.requestedSpace)}</div>
                </div>
              </div>

              <div className="stack-xs">
                <h4 style={{ margin: 0, color: "var(--pp-navy-dark)" }}>Resident Contact</h4>
                <p style={{ margin: 0, color: "var(--pp-slate-700)" }}>{detail.residentEmail}</p>
                <p style={{ margin: 0, color: "var(--pp-slate-700)" }}>{detail.residentPhone || "No phone provided"}</p>
              </div>

              <div className="stack-xs">
                <h4 style={{ margin: 0, color: "var(--pp-navy-dark)" }}>Event Description</h4>
                <p style={{ margin: 0, color: "var(--pp-slate-700)", lineHeight: 1.65 }}>{detail.eventDescription}</p>
                {detail.specialRequests ? (
                  <p style={{ margin: 0, color: "var(--pp-slate-600)" }}>
                    <strong>Special requests:</strong> {detail.specialRequests}
                  </p>
                ) : null}
              </div>

              <div className="stack-xs">
                <h4 style={{ margin: 0, color: "var(--pp-navy-dark)" }}>Insurance / Vendors</h4>
                <p style={{ margin: 0, color: "var(--pp-slate-700)" }}>
                  <strong>Insurance:</strong> {detail.insuranceCompany} · {detail.policyNumber}
                </p>
                <p style={{ margin: 0, color: "var(--pp-slate-700)" }}>
                  <strong>Vendors involved:</strong> {detail.vendorsInvolved ? "Yes" : "No"}
                </p>
                {detail.vendorDetails ? (
                  <p style={{ margin: 0, color: "var(--pp-slate-600)" }}>{detail.vendorDetails}</p>
                ) : null}
              </div>

              <div className="stack-xs">
                <h4 style={{ margin: 0, color: "var(--pp-navy-dark)" }}>Attachments</h4>
                {detail.attachments.length === 0 ? (
                  <p style={{ margin: 0, color: "var(--pp-slate-600)" }}>No attachments uploaded.</p>
                ) : (
                  <div className="stack-xs">
                    {detail.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          textDecoration: "none",
                          color: "var(--pp-navy-dark)",
                          fontWeight: 600,
                        }}
                      >
                        <FileText style={{ width: "0.95rem", height: "0.95rem" }} />
                        <span>{attachment.originalFilename}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="stack-xs">
                <h4 style={{ margin: 0, color: "var(--pp-navy-dark)" }}>Workflow Actions</h4>
                <p style={{ margin: 0, color: "var(--pp-slate-600)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                  Notes are required for <strong>Request More Info</strong> and <strong>Reject</strong>. Approval can
                  include an optional internal note.
                </p>
                {conflicts.blockingConflicts.length > 0 ? (
                  <p style={{ margin: 0, color: "#9a3412", fontSize: "0.9rem", lineHeight: 1.6 }}>
                    This request currently overlaps one or more booked clubhouse dates.
                  </p>
                ) : null}
                <textarea
                  className="form-input"
                  rows={4}
                  value={actionNote}
                  onChange={(event) => setActionNote(event.target.value)}
                  placeholder="Use this note for more-information requests, rejections, or optional approval comments."
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={saving || detail.status !== "submitted"}
                    onClick={() => runAction("request_more_info")}
                  >
                    {saving ? "Saving..." : "Request More Info"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving || (detail.status !== "submitted" && detail.status !== "needs_more_info")}
                    onClick={() => runAction("approve")}
                  >
                    {saving ? "Saving..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={saving || (detail.status !== "submitted" && detail.status !== "needs_more_info")}
                    onClick={() => runAction("reject")}
                    style={{ background: "#7f1d1d", borderColor: "#7f1d1d", color: "#fff" }}
                  >
                    {saving ? "Saving..." : "Reject"}
                  </button>
                </div>
              </div>

              {canPurge ? (
                <div
                  style={{
                    display: "grid",
                    padding: "1rem 1rem 1.1rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid #fecaca",
                    background: "#fff7f7",
                    gap: "0.95rem",
                  }}
                >
                  <h4 style={{ margin: 0, color: "#7f1d1d", lineHeight: 1.15 }}>Admin Purge</h4>
                  <p style={{ margin: 0, color: "var(--pp-slate-700)", fontSize: "0.9rem", lineHeight: 1.65 }}>
                    Permanently delete this clubhouse rental request and all related records. Type <strong>PURGE</strong> to confirm.
                  </p>
                  <div style={{ paddingTop: "0.1rem" }}>
                    <input
                      className="form-input"
                      value={purgeConfirm}
                      onChange={(event) => setPurgeConfirm(event.target.value)}
                      placeholder="Type PURGE to confirm"
                    />
                  </div>
                  <div style={{ paddingTop: "0.15rem" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={saving || purgeConfirm.trim().toUpperCase() !== "PURGE"}
                      onClick={() => runAction("purge")}
                      style={{ background: "#7f1d1d", borderColor: "#7f1d1d", color: "#fff" }}
                    >
                      {saving ? "Purging..." : "Purge"}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="stack-xs">
                <h4 style={{ margin: 0, color: "var(--pp-navy-dark)" }}>Activity</h4>
                {detail.events.length === 0 ? (
                  <p style={{ margin: 0, color: "var(--pp-slate-600)" }}>No activity recorded yet.</p>
                ) : (
                  <div className="stack-xs">
                    {detail.events.map((event) => (
                      <div
                        key={event.id}
                        style={{
                          padding: "0.8rem 0.95rem",
                          borderRadius: "var(--radius-md)",
                          background: "#f8fafc",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                          <strong style={{ color: "var(--pp-navy-dark)" }}>
                            <EventLabel eventType={event.eventType} />
                          </strong>
                          <span style={{ color: "var(--pp-slate-500)", fontSize: "0.84rem" }}>
                            {formatDateTime(event.createdAt)}
                          </span>
                        </div>
                        <div style={{ marginTop: "0.3rem", color: "var(--pp-slate-600)", fontSize: "0.9rem" }}>
                          Role: {event.actorRole} · Cycle {event.reviewCycle}
                        </div>
                        {event.note ? <div style={{ marginTop: "0.35rem", color: "var(--pp-slate-700)" }}>{event.note}</div> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
